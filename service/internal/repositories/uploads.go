package repositories

import (
	"app/internal/models"
	"app/pkg/database"
	"fmt"
)

type UploadRepository struct {
	db *database.SQLite
}

func NewUploadRepository(db *database.SQLite) *UploadRepository {
	return &UploadRepository{db: db}
}

func (r *UploadRepository) Create(record *models.UploadRecord) error {
	query := `INSERT INTO uploads 
		(sender_id, sender_ip, filename, filesize, send_time, receiver_id, receiver_ip, receive_time) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := r.db.DB.Exec(query,
		record.SenderID, record.SenderIP, record.Filename, record.Filesize,
		record.SendTime, record.ReceiverID, record.ReceiverIP, record.ReceiveTime)

	if err != nil {
		return fmt.Errorf("创建上传记录失败: %w", err)
	}
	return nil
}

func (r *UploadRepository) GetByID(id int64) (*models.Upload, error) {
	query := `SELECT id, sender_id, sender_ip, filename, filesize, send_time, receiver_id, receiver_ip, receive_time 
		FROM uploads WHERE id = ?`

	var upload models.Upload
	err := r.db.DB.QueryRow(query, id).Scan(
		&upload.ID, &upload.SenderID, &upload.SenderIP, &upload.Filename, &upload.Filesize,
		&upload.SendTime, &upload.ReceiverID, &upload.ReceiverIP, &upload.ReceiveTime)

	if err != nil {
		return nil, fmt.Errorf("获取上传记录失败: %w", err)
	}
	return &upload, nil
}

func (r *UploadRepository) List() ([]*models.Upload, error) {
	query := `SELECT id, sender_id, sender_ip, filename, filesize, send_time, receiver_id, receiver_ip, receive_time 
		FROM uploads ORDER BY send_time DESC`

	rows, err := r.db.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("获取上传记录列表失败: %w", err)
	}
	defer rows.Close()

	var uploads []*models.Upload
	for rows.Next() {
		var upload models.Upload
		err := rows.Scan(
			&upload.ID, &upload.SenderID, &upload.SenderIP, &upload.Filename, &upload.Filesize,
			&upload.SendTime, &upload.ReceiverID, &upload.ReceiverIP, &upload.ReceiveTime)
		if err != nil {
			return nil, fmt.Errorf("扫描上传记录失败: %w", err)
		}
		uploads = append(uploads, &upload)
	}
	return uploads, nil
}
