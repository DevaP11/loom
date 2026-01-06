package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"loom.app/config"
	"loom.app/models"
)

func main() {
	router := gin.Default()

	// API routes
	api := router.Group("/api")
	{
		api.POST("/project", func(c *gin.Context) {
			var body models.CreateProject

			if err := c.ShouldBindJSON(&body); err != nil {
				log.Printf("Error: %v", err)
				c.JSON(400, gin.H{
					"message": "bad parameter exception",
				})
				return
			}
			apiResponse := config.CreateProjectItem(body)
			c.JSON(200, gin.H{
				"message": apiResponse,
			})
		})
	}

	router.Run(":8080")
}
