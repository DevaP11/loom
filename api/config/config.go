package config

import (
	"fmt"
	"log"

	badger "github.com/dgraph-io/badger/v4"
	"loom.app/models"
)

func CreateProjectItem(project models.CreateProject) string {
	fmt.Printf("Project name is %s \n & Project Get Config Url is %s \n", project.Name, project.GetConfigUrl)

	db, err := badger.Open(badger.DefaultOptions("./badger"))
	if err != nil {
		log.Fatal(err)
	}

	defer db.Close()

	fmt.Printf("Badger Database Loaded\n")
	return "Success"
}
