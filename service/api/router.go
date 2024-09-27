package api

import (
	"app/internal/handlers"
	"app/internal/repositories"
	"app/internal/services"
	"app/pkg/database"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine, db *database.SQLite) {
	api := r.Group("/api")
	// user
	{
		userRepo := repositories.NewUserRepository(db)
		userService := services.NewUserService(userRepo)
		userHandler := handlers.NewUserHandler(userService)
		api.GET("/loginByGoogle", userHandler.LoginByGoogle)
		api.POST("/user", userHandler.CreateUser)
		api.GET("/user/:id", userHandler.GetUser)
		api.PUT("/user/:id", userHandler.UpdateUser)
		api.DELETE("/user/:id", userHandler.DeleteUser)
		api.GET("/users", userHandler.ListUsers)
	}
}
