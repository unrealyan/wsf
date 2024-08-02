package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"math/rand"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
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
)

func main() {

	go func() {
		log.Printf("Main server listening on %d", MAIN_SERVER_PORT)
		if err := http.ListenAndServe(fmt.Sprintf(":%d", MAIN_SERVER_PORT), nil); err != nil {
			log.Fatal("ListenAndServe: ", err)
		}
	}()

	http.HandleFunc("/ws", handleWebSocket)

	log.Printf("WebSocket server listening on %d", WEBSOCKET_SERVER_PORT)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", WEBSOCKET_SERVER_PORT), nil); err != nil {
		log.Fatal("ListenAndServe: ", err)
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
