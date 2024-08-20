package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"os"
	"sync"
	"time"

	"math/rand"

	"database/sql"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	_ "github.com/mattn/go-sqlite3"
)

const (
	// MAIN_SERVER_PORT      = 6888
	WEBSOCKET_SERVER_PORT = 8895
)

var (
	connections = make(map[string]map[string]*websocket.Conn) // shareId -> userId -> connection
	senders     = make(map[string][]string)                   // shareId -> [userIds]
	receivers   = make(map[string][]string)                   // shareId -> [userIds]
	connMutex   sync.Mutex
	upgrader    = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	stats      Statistics
	statsMutex sync.Mutex
	statsFile  = "stats.json"
)

type Statistics struct {
	TotalFiles int64 `json:"totalFiles"`
	TotalSize  int64 `json:"totalSize"`
}

type UploadRecord struct {
	SenderID    string
	SenderIP    string
	Filename    string
	Filesize    int64
	SendTime    time.Time
	ReceiverID  string
	ReceiverIP  string
	ReceiveTime time.Time
}

var db *sql.DB

func main() {
	loadStats()

	initDB()
	defer db.Close()

	http.HandleFunc("/ws", handleWebSocket)

	go broadcastStats()

	log.Printf("WebSocket server listening on %d", WEBSOCKET_SERVER_PORT)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", WEBSOCKET_SERVER_PORT), nil); err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

func loadStats() {
	data, err := ioutil.ReadFile(statsFile)
	if err != nil {
		log.Println("无法读取统计文件，使用默认值")
		return
	}
	err = json.Unmarshal(data, &stats)
	if err != nil {
		log.Println("解析统计文件失败，使用默认值")
	}
}

func saveStats() {
	data, err := json.Marshal(stats)
	if err != nil {
		log.Println("序列化统计数据失败:", err)
		return
	}
	err = os.WriteFile(statsFile, data, 0644)
	if err != nil {
		log.Println("保存统计数据失败:", err)
	}
}

func updateStats(fileSize int64) {
	statsMutex.Lock()
	defer statsMutex.Unlock()

	stats.TotalFiles++
	stats.TotalSize += fileSize
	saveStats()
}

func broadcastStats() {
	ticker := time.NewTicker(5 * time.Second)
	for range ticker.C {
		statsMutex.Lock()
		statsMsg := map[string]interface{}{
			"type":       "stats",
			"totalFiles": stats.TotalFiles,
			"totalSize":  stats.TotalSize,
		}
		statsJSON, _ := json.Marshal(statsMsg)
		statsMutex.Unlock()

		connMutex.Lock()
		for _, userConns := range connections {
			for _, conn := range userConns {
				conn.WriteMessage(websocket.TextMessage, statsJSON)
			}
		}
		connMutex.Unlock()
	}
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	shareId := r.URL.Query().Get("s")
	if shareId == "" {
		// http.Error(w, "Missing share ID", http.StatusBadRequest)
		// return
		shareId = uuid.New().String()
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("Upgrade:", err)
		return
	}
	defer conn.Close()

	userId := assignUserId()
	connMutex.Lock()
	if connections[shareId] == nil {
		connections[shareId] = make(map[string]*websocket.Conn)
	}
	connections[shareId][userId] = conn
	connMutex.Unlock()

	log.Printf("User: %s connected to share: %s", userId, shareId)

	conn.WriteJSON(map[string]interface{}{
		"type":    "user-id",
		"userId":  userId,
		"shareId": shareId,
	})

	// 发送初始统计数据
	statsMutex.Lock()
	conn.WriteJSON(map[string]interface{}{
		"type":       "stats",
		"totalFiles": stats.TotalFiles,
		"totalSize":  stats.TotalSize,
	})
	statsMutex.Unlock()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("User: %s disconnected from share: %s", userId, shareId)
			connMutex.Lock()
			delete(connections[shareId], userId)
			if len(connections[shareId]) == 0 {
				delete(connections, shareId)
			}
			senders[shareId] = removeElement(senders[shareId], userId)
			receivers[shareId] = removeElement(receivers[shareId], userId)
			connMutex.Unlock()
			sendReceiversList(shareId)
			break
		}
		handleMessage(shareId, userId, msg)
	}
}

func handleMessage(shareId, userId string, msg []byte) {
	var data map[string]interface{}
	err := json.Unmarshal(msg, &data)
	if err != nil {
		log.Println("Error unmarshaling message:", err)
		return
	}

	switch data["type"] {
	case "sender":
		connMutex.Lock()
		senders[shareId] = append(senders[shareId], userId)
		connMutex.Unlock()
		sendReceiversList(shareId)

	case "receiver":
		connMutex.Lock()
		receivers[shareId] = append(receivers[shareId], userId)
		connMutex.Unlock()
		sendReceiversList(shareId)

	case "initiate":
		target := data["target"].(string)
		connMutex.Lock()
		if conn, ok := connections[shareId][userId]; ok {
			conn.WriteJSON(map[string]interface{}{
				"type":   "join",
				"userId": userId,
				"target": target,
			})
		}
		connMutex.Unlock()

	case "offer", "answer", "new-ice-candidate", "accept-request", "request-status":
		target := data["target"].(string)
		connMutex.Lock()
		if conn, ok := connections[shareId][target]; ok {
			conn.WriteJSON(data)
		}

		if data["type"] == "request-status" {
			if data["status"] == "accepted" {
				if size, ok := data["size"].(float64); ok {
					updateStats(int64(size))

					// 记录上传信息
					filename, _ := data["filename"].(string)
					senderIP := getIP(connections[shareId][userId].RemoteAddr())
					receiverIP := getIP(connections[shareId][target].RemoteAddr())
					sendTime := time.Now()

					go recordUpload(UploadRecord{
						SenderID:    userId,
						SenderIP:    senderIP,
						Filename:    filename,
						Filesize:    int64(size),
						SendTime:    sendTime,
						ReceiverID:  target,
						ReceiverIP:  receiverIP,
						ReceiveTime: sendTime, // 暂时设置为相同时间，后续可以更新
					})
				}
			}
		}
		connMutex.Unlock()

	}
}

func sendReceiversList(shareId string) {
	connMutex.Lock()
	defer connMutex.Unlock()
	for _, id := range senders[shareId] {
		if conn, ok := connections[shareId][id]; ok {
			conn.WriteJSON(map[string]interface{}{
				"type":    "all-receivers",
				"userIds": receivers[shareId],
			})
		}
	}
}

func assignUserId() string {
	return fmt.Sprintf("%04x", rand.Intn(65536))
}

func removeElement(slice []string, element string) []string {
	for i, v := range slice {
		if v == element {
			return append(slice[:i], slice[i+1:]...)
		}
	}
	return slice
}

func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "uploads.db")
	if err != nil {
		log.Fatal("打开数据库失败:", err)
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS uploads (
		sender_id TEXT,
		sender_ip TEXT,
		filename TEXT,
		filesize INTEGER,
		send_time DATETIME,
		receiver_id TEXT,
		receiver_ip TEXT,
		receive_time DATETIME
	)`)
	if err != nil {
		log.Fatal("创建表失败:", err)
	}
}

func recordUpload(record UploadRecord) {
	_, err := db.Exec(`INSERT INTO uploads 
		(sender_id, sender_ip, filename, filesize, send_time, receiver_id, receiver_ip, receive_time) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		record.SenderID, record.SenderIP, record.Filename, record.Filesize,
		record.SendTime, record.ReceiverID, record.ReceiverIP, record.ReceiveTime)

	if err != nil {
		log.Println("记录上传信息失败:", err)
	}
}

func getIP(addr net.Addr) string {
	if tcpAddr, ok := addr.(*net.TCPAddr); ok {
		return tcpAddr.IP.String()
	}
	return ""
}
