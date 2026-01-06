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
			apiResponse := config.HelloWorld(200)
			c.JSON(200, gin.H{
				"message": apiResponse,
			})
		})
	}

	router.Run(":8080")
}
