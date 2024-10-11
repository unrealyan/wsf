package models

import "time"

type UploadRecord struct {
	ID          int64     `json:"id,omitempty"`
	SenderID    string    `json:"sender_id"`
	SenderIP    string    `json:"sender_ip"`
	Filename    string    `json:"filename"`
	Filesize    int64     `json:"filesize"`
	SendTime    time.Time `json:"send_time"`
	ReceiverID  string    `json:"receiver_id"`
	ReceiverIP  string    `json:"receiver_ip"`
	ReceiveTime time.Time `json:"receive_time"`
}
