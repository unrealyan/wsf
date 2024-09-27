package services

import (
	"app/internal/models"
	"app/internal/repositories"
)

type UserService struct {
	repo *repositories.UserRepository
}

func NewUserService(repo *repositories.UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) LoginByGoogle(user *models.User) error {
	return s.repo.LoginByGoogle(user)
}

func (s *UserService) CreateUser(user *models.User) error {
	return s.repo.Create(user)
}

func (s *UserService) GetUser(id int64) (*models.User, error) {
	return s.repo.GetByID(id)
}

func (s *UserService) UpdateUser(user *models.User) error {
	return s.repo.Update(user)
}

func (s *UserService) DeleteUser(id int64) error {
	return s.repo.Delete(id)
}

func (s *UserService) ListUsers() ([]*models.User, error) {
	return s.repo.List()
}
