package functions

import (
	"bytes"
	"encoding/gob"
	"fmt"
	"log"

	badger "github.com/dgraph-io/badger/v4"
	"loom.app/models"
)

func CreateProjectItem(project models.Project) string {
	fmt.Printf("Project name is %s \n & Project Get Config Url is %s \n", project.Name, project.GetConfigUrl)

	db, err := badger.Open(badger.DefaultOptions("./badger"))
	if err != nil {
		log.Fatal(err)
	}

	defer db.Close() // closes the db connection after the function execution is complete

	projectEntry := models.Project{
		Name:            project.Name,
		GetConfigUrl:    project.GetConfigUrl,
		UpdateConfigUrl: project.UpdateConfigUrl,
	}

	var buf bytes.Buffer
	enc := gob.NewEncoder(&buf)
	err = enc.Encode(projectEntry)
	if err != nil {
		log.Fatal(err)
	}

	projectItem := buf.Bytes()

	err = db.Update(func(txn *badger.Txn) error {
		key := []byte("id")
		err := txn.Set([]byte(key), projectItem)
		return err // failed to save item
	})

	if err != nil {
		log.Fatalf("Error setting key-value pair: %v", err)
	}

	fmt.Printf("Badger Database Loaded\n")
	return "Success"
}

func GetProjectItem(id int) models.Project {
	db, err := badger.Open(badger.DefaultOptions("./badger"))
	if err != nil {
		log.Fatal(err)
	}

	defer db.Close() // closes the db connection after the function execution is complete

	var value models.Project

	err = db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte("id"))
		if err != nil {
			log.Fatal(err)
		}

		err = item.Value(func(val []byte) error {
			// Deserialize using gob
			decoder := gob.NewDecoder(bytes.NewReader(val))
			return decoder.Decode(&value)
		})

		return nil
	})

	if err != nil {
		log.Fatal(err)
	}

	return value
}
