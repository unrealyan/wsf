package services

import (
	"app/internal/models"
	"app/internal/repositories"
)

type UploadService struct {
	repo *repositories.UploadRepository
}

func NewUploadService(repo *repositories.UploadRepository) *UploadService {
	return &UploadService{repo: repo}
}

func (s *UploadService) CreateUpload(record *models.UploadRecord) error {
	return s.repo.Create(record)
}

func (s *UploadService) GetUpload(id int64) (*models.UploadRecord, error) {
	return s.repo.GetByID(id)
}

func (s *UploadService) ListUploads() ([]*models.UploadRecord, error) {
	return s.repo.List()
}

func (s *UploadService) FindListByUserId(id string, page, pageSize int) (*models.PaginatedUploadRecords, error) {
	return s.repo.FindListByUserId(id, page, pageSize)
}

func (s *UploadService) GetStatistics() (int64, int64, error) {
	return s.repo.GetStatistics()
}
