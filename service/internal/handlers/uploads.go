package handlers

import (
	"app/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type UploadsHandler struct {
	service *services.UploadService
}

func NewUploadsHandler(service *services.UploadService) *UploadsHandler {
	return &UploadsHandler{service: service}
}

func (h *UploadsHandler) FindListByUserId(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "缺少userID参数"})
		return
	}
	userIDStr, ok := userID.(string)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "userID类型不正确"})
		return
	}
	uploads, err := h.service.FindListByUserId(userIDStr)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "uploads not found"})
		return
	}

	c.JSON(http.StatusOK, uploads)
}
