package config

import "fmt"

func HelloWorld(amount float64) {
	result := "US"
	fmt.Printf("%.2f converted to USD is %.2f\n", amount, result)
}
