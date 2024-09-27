package database

import (
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
)

type SQLite struct {
	DB *sql.DB
}

func New(dbPath string) (*SQLite, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	return &SQLite{DB: db}, nil
}

func (s *SQLite) Close() error {
	return s.DB.Close()
}

func (s *SQLite) CreateTable(query string) error {
	_, err := s.DB.Exec(query)
	if err != nil {
		return fmt.Errorf("error creating table: %w", err)
	}
	return nil
}
