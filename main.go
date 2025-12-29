package main

import (
    "net/http"
    // "path/filepath"

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

    // Serve static files and handle SPA routing
    router.NoRoute(func(c *gin.Context) {
        // path := filepath.Join("./out", c.Request.URL.Path)

        // Check if file exists
        if _, err := http.Dir("./out").Open(c.Request.URL.Path); err == nil {
            c.FileFromFS(c.Request.URL.Path, http.Dir("./out"))
            return
        }

        // Fallback to index.html for client-side routes
        c.File("./out/index.html")
    })

    router.Run(":3000")
}
