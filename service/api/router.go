package api

import (
	"app/internal/handlers"
	"app/internal/repositories"
	"app/internal/services"
	"app/pkg/database"
	"net/http"
	"strings"

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
		api.POST("/register", userHandler.Register)
		api.POST("/login", userHandler.Login)

		// 需要认证的路由
		authorized := api.Group("/")
		authorized.Use(JWTAuthMiddleware(userService))
		{
			authorized.POST("/user", userHandler.CreateUser)
			authorized.GET("/user/:id", userHandler.GetUser)
			authorized.PUT("/user/:id", userHandler.UpdateUser)
			authorized.DELETE("/user/:id", userHandler.DeleteUser)
			authorized.GET("/users", userHandler.ListUsers)
		}
	}
}

func JWTAuthMiddleware(userService *services.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		bearerToken := strings.Split(authHeader, " ")
		if len(bearerToken) != 2 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
			c.Abort()
			return
		}

		claims, err := services.ValidateToken(bearerToken[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("userID", claims.Subject)
		c.Next()
	}
}
