package main

import (
	"app/api"
	"app/internal/models"
	"app/internal/repositories"
	"app/internal/services"
	"app/pkg/database"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"math/rand"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	_ "github.com/joho/godotenv/autoload"
	_ "github.com/mattn/go-sqlite3" // 替换 modernc.org/sqlite
)

const (
	// MAIN_SERVER_PORT      = 6888
	WEBSOCKET_SERVER_PORT = 8895
)

type CustomConn struct {
	*websocket.Conn
	ClientIP string
	Role     string
}

var (
	connections = make(map[string]map[string]CustomConn) // shareId -> userId -> connection
	senders     = make(map[string][]string)              // shareId -> [userIds]
	receivers   = make(map[string][]string)              // shareId -> [userIds]
	connMutex   sync.Mutex
	upgrader    = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
		Subprotocols: []string{"token"},
	}
)

func main() {
	fmt.Println("name: ", os.Getenv("JWT_SECRET"))
	// 修改数据库连接字符串
	db, err := database.New("/var/lib/websf/uploads.db")
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}
	defer db.Close()

	// loadStats()

	// initDB()

	uploadsRepo := repositories.NewUploadRepository(db)
	uploadsService := services.NewUploadService(uploadsRepo)

	go broadcastStats(uploadsService)
	gin.SetMode(gin.DebugMode)
	r := gin.Default()

	api.SetupRoutes(r, db)

	// 创建一个新的http.ServeMux来处理WebSocket连接
	wsMux := http.NewServeMux()
	wsMux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(w, r, uploadsService)
	})

	// 启动WebSocket服务器
	go func() {
		log.Printf("WebSocket服务器正在监听端口 %d", WEBSOCKET_SERVER_PORT)
		if err := http.ListenAndServe(fmt.Sprintf(":%d", WEBSOCKET_SERVER_PORT), wsMux); err != nil {
			log.Fatal("ListenAndServe: ", err)
		}
	}()

	// 启动Gin服务器
	log.Println("Gin服务器正在启动...")
	r.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{"code": "PAGE_NOT_FOUND", "message": "Page not found"})
	})
	if err := r.Run(":8890"); err != nil {
		log.Fatal("运行Gin服务器失败: ", err)
	}

}

func broadcastStats(uploadsService *services.UploadService) {
	ticker := time.NewTicker(5 * time.Second)
	for range ticker.C {

		fileCount, fileSize, err := uploadsService.GetStatistics()
		if err != nil {
			return
		}
		statsMsg := map[string]interface{}{
			"type":       "stats",
			"totalFiles": fileCount,
			"totalSize":  fileSize,
		}
		statsJSON, _ := json.Marshal(statsMsg)

		connMutex.Lock()
		for _, userConns := range connections {
			for _, conn := range userConns {
				conn.WriteMessage(websocket.TextMessage, statsJSON)
			}
		}
		connMutex.Unlock()
	}
}

func handleWebSocket(w http.ResponseWriter, r *http.Request, uploadsService *services.UploadService) {
	forwardedFor := r.Header.Get("X-Forwarded-For")
	subprotocols := r.Header.Get("Sec-Websocket-Protocol")
	log.Println(subprotocols)
	userId := ""
	if subprotocols != "" {
		token := strings.Split(subprotocols, ", ")[1]

		claims, err := services.ValidateToken(token)
		if err != nil {

			return
		}
		userId = claims.Subject
	}
	if forwardedFor != "" {
		r.RemoteAddr = forwardedFor
	}
	log.Println("Remote address:", r.RemoteAddr, forwardedFor)
	shareId := r.URL.Query().Get("s")
	role := r.URL.Query().Get("r")
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

	// userId := assignUserId()
	if role == "sender" {
		if sender := getSender(shareId); sender != "" {
			userId = sender
		}
	}
	connMutex.Lock()
	if _, ok := connections[shareId]; !ok {
		connections[shareId] = make(map[string]CustomConn)
	}
	connections[shareId][userId] = CustomConn{conn, formatIP(r.RemoteAddr), role}
	connMutex.Unlock()

	log.Printf("User: %s connected to share: %s", userId, shareId)

	if role == "sender" {
		conn.WriteJSON(map[string]interface{}{
			"type":    "user-id",
			"userId":  userId,
			"shareId": shareId,
		})
		sendReceivers(shareId, map[string]interface{}{
			"type":    "sender-online",
			"shareId": shareId,
			"userId":  userId,
		})
	} else {
		if sender := getSender(shareId); sender != "" {
			conn.WriteJSON(map[string]interface{}{
				"type":    "user-id",
				"userId":  userId,
				"shareId": shareId,
				"target":  sender,
			})
		} else {
			conn.WriteJSON(map[string]interface{}{
				"type":    "error",
				"userId":  userId,
				"shareId": shareId,
				"message": "sender offline",
			})
		}

	}

	// 发送初始统计数据
	// statsMutex.Lock()

	fileCount, fileSize, err := uploadsService.GetStatistics()
	if err != nil {
		return
	}

	conn.WriteJSON(map[string]interface{}{
		"type":       "stats",
		"totalFiles": fileCount,
		"totalSize":  fileSize,
	})
	// statsMutex.Unlock()

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
			sendSenderWithReceiverOffline(shareId, userId)
			sendReceivers(shareId, map[string]interface{}{
				"type":    "error",
				"message": "sender-offline",
			})
			// sendReceiversList(shareId)
			break
		}
		handleMessage(shareId, userId, msg, uploadsService)
	}
}

func handleMessage(shareId, userId string, msg []byte, uploadsService *services.UploadService) {
	var data map[string]interface{}
	err := json.Unmarshal(msg, &data)
	if err != nil {
		log.Println("Error unmarshaling message:", err)
		return
	}

	switch data["type"] {

	case "wsf-stats":
		target := data["target"].(string)
		connMutex.Lock()
		if data["type"] == "wsf-stats" {
			// if data["status"] == "accepted" {
			if size, ok := data["fileSize"].(float64); ok {

				// 记录上传信息
				filename, _ := data["filename"].(string)
				senderRemoteIp := connections[shareId][userId].ClientIP

				receiverRemoteIp := connections[shareId][target].ClientIP
				// senderIP := getIP(senderRemoteIp)
				senderIP := senderRemoteIp
				// receiverIP := getIP(receiverRemoteIp)
				receiverIP := receiverRemoteIp
				sendTime := time.Now()

				uploads := models.UploadRecord{
					SenderID:    target,
					SenderIP:    senderIP,
					Filename:    filename,
					Filesize:    int64(size),
					SendTime:    sendTime,
					ReceiverID:  userId,
					ReceiverIP:  receiverIP,
					ReceiveTime: sendTime, // 暂时设置为相同时间，后续可以更新
				}
				uploadsService.CreateUpload(&uploads)

				// go recordUpload(UploadRecord{
				// 	SenderID:    userId,
				// 	SenderIP:    senderIP,
				// 	Filename:    filename,
				// 	Filesize:    int64(size),
				// 	SendTime:    sendTime,
				// 	ReceiverID:  target,
				// 	ReceiverIP:  receiverIP,
				// 	ReceiveTime: sendTime, // 暂时设置为相同时间，后续可以更新
				// })
			}
			// }
		}
		connMutex.Unlock()

	case "receivers-notice":
		sendReceivers(shareId, map[string]interface{}{
			"type":   "file-ready",
			"target": userId,
		})

	case "offer", "answer", "new-ice-candidate", "request-file", "accept-request", "request-status":
		target := data["target"].(string)
		connMutex.Lock()
		if conn, ok := connections[shareId][target]; ok {
			conn.WriteJSON(data)
		}

		connMutex.Unlock()

	}
}

func getReceivers(shareId string) []string {
	receivers := []string{}
	for u, v := range connections[shareId] {
		if v.Role != "sender" {
			receivers = append(receivers, u)
		}
	}
	return receivers
}

func getSender(shareId string) (sender string) {
	for k, v := range connections[shareId] {
		if v.Role == "sender" {
			sender = k
			break
		}
	}
	return sender
}

func sendReceivers(shareId string, message map[string]interface{}) {
	connMutex.Lock()
	defer connMutex.Unlock()
	for id, v := range connections[shareId] {
		if v.Role == "receiver" {
			message["userId"] = id
			v.Conn.WriteJSON(message)
		}
	}
}

func sendSenderWithReceiverOffline(shareId string, userId string) {
	connMutex.Lock()
	defer connMutex.Unlock()

	for id, v := range connections[shareId] {
		if v.Role == "sender" && id != userId {
			v.Conn.WriteJSON(map[string]interface{}{
				"type":     "receiver-offline",
				"receiver": userId,
				"user":     id,
			})
			break
		}

	}

}

func sendReceiversList(shareId string) {
	connMutex.Lock()
	defer connMutex.Unlock()
	for k := range connections[shareId] {
		if conn, ok := connections[shareId][k]; ok {
			conn.WriteJSON(map[string]interface{}{
				"type":    "all-receivers",
				"userIds": getReceivers(shareId),
				"user":    k,
			})
		}

		// notice all receivers
		for id := range connections[shareId] {
			if conn, ok := connections[shareId][id]; ok {
				conn.WriteJSON(map[string]interface{}{
					"type":   "sender-online",
					"user":   id,
					"sender": getSender(shareId),
				})
			}
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

// func initDB() {
// 	var err error
// 	// db, err = sql.Open("sqlite", "/var/lib/websf/uploads.db")
// 	db, err = sql.Open("sqlite", "uploads.db")
// 	if err != nil {
// 		log.Fatal("打开数据库失败:", err)
// 	}

// 	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS uploads (
// 		sender_id TEXT,
// 		sender_ip TEXT,
// 		filename TEXT,
// 		filesize INTEGER,
// 		send_time DATETIME,
// 		receiver_id TEXT,
// 		receiver_ip TEXT,
// 		receive_time DATETIME
// 	)`)
// 	if err != nil {
// 		log.Fatal("创建表失败:", err)
// 	}
// }

// func recordUpload(record UploadRecord) {
// 	_, err := db.Exec(`INSERT INTO uploads
// 		(sender_id, sender_ip, filename, filesize, send_time, receiver_id, receiver_ip, receive_time)
// 		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
// 		record.SenderID, record.SenderIP, record.Filename, record.Filesize,
// 		record.SendTime, record.ReceiverID, record.ReceiverIP, record.ReceiveTime)

// 	if err != nil {
// 		log.Println("记录上传信息失败:", err)
// 	}
// }

func getIP(addr net.Addr) string {
	if tcpAddr, ok := addr.(*net.TCPAddr); ok {
		return tcpAddr.IP.String()
	}
	return ""
}

func formatIP(remoteAddr string) string {
	ip, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		// 处理错误，例如日志记录
		log.Printf("Error splitting host and port: %v", err)
		ip = remoteAddr // 如果发生错误，使用完整的地址
	}
	return ip
}
