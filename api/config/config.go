package config

import "fmt"

func HelloWorld(amount float64) string {
	result := "US"
	fmt.Printf("%.2f converted to USD is %.2f\n", amount, result)
	return "Hello world"
}
