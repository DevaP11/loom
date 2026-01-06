package main

import (
	"github.com/gin-gonic/gin"

	"loom.app/config"
)

func main() {
	router := gin.Default()

	// API routes
	api := router.Group("/api")
	{
		api.GET("/config", func(c *gin.Context) {
			config.HelloWorld(200)
			c.JSON(200, gin.H{
				"message": "Hello from the Go API!",
			})
		})
	}

	router.Run(":8080")
}
