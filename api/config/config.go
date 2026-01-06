package config

import (
	"fmt"

	"loom.app/models"
)

func CreateProjectItem(project models.CreateProject) string {
	fmt.Printf("Project name is %s \n & Project Get Config Url is %s \n", project.Name, project.GetConfigUrl)
	return "Success"
}
