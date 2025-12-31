package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()

	// API routes
	api := router.Group("/api")
	{
		api.GET("/hello", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "Hello from the Go API!",
			})
		})
	}

	router.Run(":8080")
}
