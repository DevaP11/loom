package main

import (
	"log"
	"strconv"

	"github.com/gin-gonic/gin"
	"loom.app/models"
	"loom.app/project"
)

func main() {
	router := gin.Default()

	// API routes
	api := router.Group("/api")
	{
		api.POST("/project", func(c *gin.Context) {
			var body models.Project

			if err := c.ShouldBindJSON(&body); err != nil {
				log.Printf("Error: %v", err)
				c.JSON(400, gin.H{
					"message": "bad parameter exception",
				})
				return
			}

			apiResponse := project.CreateProjectItem(body)
			c.JSON(200, gin.H{
				"message": apiResponse,
			})
		})

		api.GET("/project", func(c *gin.Context) {

			id, err := strconv.Atoi(c.Query("id"))
			if err == nil {
				log.Fatal(err)
			}

			apiResponse := project.GetProjectItem(id)
			c.JSON(200, gin.H{
				"message": apiResponse,
			})
		})
	}

	router.Run(":8080")
}
