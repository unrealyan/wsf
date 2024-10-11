package repositories

import (
	"app/internal/models"
	"app/pkg/database"
	"fmt"
	"log"
)

type UploadRepository struct {
	db *database.SQLite
}

func NewUploadRepository(db *database.SQLite) *UploadRepository {
	repo := &UploadRepository{db: db}
	if err := repo.EnsureTable(); err != nil {
		log.Printf("Error ensuring uploads table: %v", err)
	}
	return repo
}

func (r *UploadRepository) Create(record *models.UploadRecord) error {
	query := `INSERT INTO uploads 
		(sender_id, sender_ip, filename, filesize, send_time, receiver_id, receiver_ip, receive_time) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	result, err := r.db.DB.Exec(query,
		record.SenderID, record.SenderIP, record.Filename, record.Filesize,
		record.SendTime, record.ReceiverID, record.ReceiverIP, record.ReceiveTime)

	if err != nil {
		return fmt.Errorf("创建上传记录失败: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("获取插入ID失败: %w", err)
	}

	record.ID = id
	return nil
}

func (r *UploadRepository) GetByID(id int64) (*models.UploadRecord, error) {
	query := `SELECT id, sender_id, sender_ip, filename, filesize, send_time, receiver_id, receiver_ip, receive_time 
		FROM uploads WHERE id = ?`

	var upload models.UploadRecord
	err := r.db.DB.QueryRow(query, id).Scan(
		&upload.ID, &upload.SenderID, &upload.SenderIP, &upload.Filename, &upload.Filesize,
		&upload.SendTime, &upload.ReceiverID, &upload.ReceiverIP, &upload.ReceiveTime)

	if err != nil {
		return nil, fmt.Errorf("获取上传记录失败: %w", err)
	}
	return &upload, nil
}

func (r *UploadRepository) List() ([]*models.UploadRecord, error) {
	query := `SELECT id, sender_id, sender_ip, filename, filesize, send_time, receiver_id, receiver_ip, receive_time 
		FROM uploads ORDER BY send_time DESC`

	rows, err := r.db.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("获取上传记录列表失败: %w", err)
	}
	defer rows.Close()

	var uploads []*models.UploadRecord
	for rows.Next() {
		var upload models.UploadRecord
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

func (r *UploadRepository) FindListByUserId(id string, page, pageSize int) (*models.PaginatedUploadRecords, error) {
	// 添加分页和计数查询
	countQuery := `SELECT COUNT(*) FROM uploads WHERE sender_id = ?`
	var totalCount int
	err := r.db.DB.QueryRow(countQuery, id).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("获取总记录数失败: %w", err)
	}

	// 计算总页数
	totalPages := (totalCount + pageSize - 1) / pageSize

	// 修改主查询以支持分页
	query := `SELECT id, sender_id, sender_ip, filename, filesize, send_time, receiver_id, receiver_ip, receive_time 
		FROM uploads WHERE sender_id = ? ORDER BY send_time DESC LIMIT ? OFFSET ?`

	offset := (page - 1) * pageSize
	rows, err := r.db.DB.Query(query, id, pageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("获取上传记录列表失败: %w", err)
	}
	defer rows.Close()

	var uploads []*models.UploadRecord
	for rows.Next() {
		var upload models.UploadRecord
		err := rows.Scan(
			&upload.ID, &upload.SenderID, &upload.SenderIP, &upload.Filename, &upload.Filesize,
			&upload.SendTime, &upload.ReceiverID, &upload.ReceiverIP, &upload.ReceiveTime)
		if err != nil {
			return nil, fmt.Errorf("扫描上传记录失败: %w", err)
		}
		uploads = append(uploads, &upload)
	}

	return &models.PaginatedUploadRecords{
		Records:    uploads,
		TotalCount: totalCount,
		TotalPages: totalPages,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

// 新增方法
func (r *UploadRepository) GetStatistics() (int64, int64, error) {
	query := `SELECT COUNT(*), COALESCE(SUM(filesize), 0) FROM uploads`

	var count int64
	var totalSize int64
	err := r.db.DB.QueryRow(query).Scan(&count, &totalSize)
	if err != nil {
		return 0, 0, fmt.Errorf("获取上传统计信息失败: %w", err)
	}

	return count, totalSize, nil
}

func (r *UploadRepository) EnsureTable() error {
	query := `CREATE TABLE IF NOT EXISTS uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT,
        sender_ip TEXT,
        filename TEXT,
        filesize INTEGER,
        send_time DATETIME,
        receiver_id TEXT,
        receiver_ip TEXT,
        receive_time DATETIME
    )`
	_, err := r.db.DB.Exec(query)
	return err
}
