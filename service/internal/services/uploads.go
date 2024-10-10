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

func (s *UploadService) GetUpload(id int64) (*models.Upload, error) {
	return s.repo.GetByID(id)
}

func (s *UploadService) ListUploads() ([]*models.Upload, error) {
	return s.repo.List()
}
