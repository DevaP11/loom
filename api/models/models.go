package models

type CreateProject struct {
	ID              int    `json:"id"`
	Name            string `json:"name"`
	GetConfigUrl    string `json:"getConfigUrl"`
	UpdateConfigUrl string `json:"updateConfigUrl"`
}
