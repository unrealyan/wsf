package repositories

import (
	"app/internal/models"
	"app/pkg/database"
	"database/sql"
	"fmt"
)

type UserRepository struct {
	db *database.SQLite
}

func NewUserRepository(db *database.SQLite) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) LoginByGoogle(user *models.User) error {
	ok, err := r.userIDExists(user.UserID)
	if ok {
		return nil
	}
	if !ok {
		err = r.Create(user)
		if err := r.Create(user); err != nil {
			return err
		}
	}
	return err
}

func (r *UserRepository) Create(user *models.User) error {
	// 检查表是否存在
	if err := r.ensureTableExists(); err != nil {
		return fmt.Errorf("确保表存在时出错: %w", err)
	}

	// 检查 user_id 是否已存在
	exists, err := r.userIDExists(user.UserID)
	if err != nil {
		return fmt.Errorf("检查 user_id 是否存在时出错: %w", err)
	}
	if exists {
		return fmt.Errorf("user_id %s 已存在", user.UserID)
	}

	query := "INSERT INTO users (user_id, name, email, password, given_name, family_name, picture) VALUES (?, ?, ?, ?, ?, ?, ?)"
	result, err := r.db.DB.Exec(query, user.UserID, user.Name, user.Email, user.Password, user.GivenName, user.FamilyName, user.Picture)
	if err != nil {
		return fmt.Errorf("创建用户时出错: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("error getting last insert id: %w", err)
	}
	user.ID = id
	return nil
}

// 新增方法
func (r *UserRepository) ensureTableExists() error {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE,
		password TEXT,
		given_name TEXT,
		family_name TEXT,
		picture TEXT
	)
	`
	_, err := r.db.DB.Exec(query)
	if err != nil {
		return fmt.Errorf("创建用户表时出错: %w", err)
	}
	return nil
}

func (r *UserRepository) userIDExists(userID string) (bool, error) {
	query := "SELECT COUNT(*) FROM users WHERE user_id = ?"
	var count int
	err := r.db.DB.QueryRow(query, userID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("检查 user_id 是否存在时出错: %w", err)
	}
	return count > 0, nil
}

func (r *UserRepository) GetByID(id int64) (*models.User, error) {
	query := "SELECT id, user_id, name, email, given_name, family_name, picture FROM users WHERE id = ?"
	row := r.db.DB.QueryRow(query, id)

	var user models.User
	err := row.Scan(&user.ID, &user.UserID, &user.Name, &user.Email, &user.GivenName, &user.FamilyName, &user.Picture)
	if err != nil {
		return nil, fmt.Errorf("获取用户时出错: %w", err)
	}
	return &user, nil
}

func (r *UserRepository) Update(user *models.User) error {
	query := "UPDATE users SET name = ?, email = ?, password = ?, given_name = ?, family_name = ?, picture = ? WHERE id = ?"
	_, err := r.db.DB.Exec(query, user.Name, user.Email, user.Password, user.GivenName, user.FamilyName, user.Picture, user.ID)
	if err != nil {
		return fmt.Errorf("更新用户时出错: %w", err)
	}
	return nil
}

func (r *UserRepository) Delete(id int64) error {
	query := "DELETE FROM users WHERE id = ?"
	_, err := r.db.DB.Exec(query, id)
	if err != nil {
		return fmt.Errorf("error deleting user: %w", err)
	}
	return nil
}

func (r *UserRepository) List() ([]*models.User, error) {
	query := "SELECT id, user_id, name, email, given_name, family_name, picture FROM users"
	rows, err := r.db.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("列出用户时出错: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(&user.ID, &user.UserID, &user.Name, &user.Email, &user.GivenName, &user.FamilyName, &user.Picture)
		if err != nil {
			return nil, fmt.Errorf("扫描用户时出错: %w", err)
		}
		users = append(users, &user)
	}
	return users, nil
}

func (r *UserRepository) EmailExists(email string) (bool, error) {
	// 检查表是否存在
	if err := r.ensureTableExists(); err != nil {
		return false, fmt.Errorf("确保表存在时出错: %w", err)
	}
	query := "SELECT COUNT(*) FROM users WHERE email = ?"
	var count int
	err := r.db.DB.QueryRow(query, email).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("检查邮箱是否存在时出错: %w", err)
	}
	return count > 0, nil
}

func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	query := "SELECT id, user_id, name, email, password, given_name, family_name, picture FROM users WHERE email = ?"
	var user models.User
	err := r.db.DB.QueryRow(query, email).Scan(&user.ID, &user.UserID, &user.Name, &user.Email, &user.Password, &user.GivenName, &user.FamilyName, &user.Picture)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("用户不存在")
		}
		return nil, fmt.Errorf("获取用户信息时出错: %w", err)
	}
	return &user, nil
}
