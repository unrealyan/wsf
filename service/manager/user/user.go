package user

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	_ "modernc.org/sqlite"
)

type UserInfo struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	GivenName  string `json:"given_name"`
	FamilyName string `json:"family_name"`
	Picture    string `json:"picture"`
}

func SaveUser(c *gin.Context) {
	var user UserInfo
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db, err := sql.Open("sqlite", "uploads.db")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "无法连接到数据库"})
		return
	}
	defer db.Close()

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		name TEXT,
		given_name TEXT,
		family_name TEXT,
		picture TEXT
	)`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建表失败"})
		return
	}

	_, err = db.Exec(`INSERT OR REPLACE INTO users (id, name, given_name, family_name, picture) 
					  VALUES (?, ?, ?, ?, ?)`,
		user.ID, user.Name, user.GivenName, user.FamilyName, user.Picture)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存用户信息失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "用户信息保存成功"})
}
