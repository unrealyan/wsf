package handlers

import (
	"app/internal/services"
	"net/http"
	"strconv"

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
	page := c.Query("page")
	if page == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少page参数"})
		return
	}
	pageSize := c.Query("pageSize")
	if pageSize == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少pageSize参数"})
		return
	}
	pageInt, err := strconv.Atoi(page)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "page参数类型不正确"})
		return
	}
	pageSizeInt, err := strconv.Atoi(pageSize)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pageSize参数类型不正确"})
		return
	}
	uploads, err := h.service.FindListByUserId(userIDStr, pageInt, pageSizeInt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "uploads not found"})
		return
	}

	c.JSON(http.StatusOK, uploads)
}
