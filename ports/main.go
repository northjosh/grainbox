package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
)


func decodeLocalAddress(hexStr string) (int64, error){
	parts := strings.Split(hexStr, ":")

	if len(parts) < 2 {
		return 0, fmt.Errorf("invalid format")
	}

	port, err := strconv.ParseInt(parts[1], 16, 64)

	if err != nil {
		return 0, nil
	}

	return port, nil
}
func findListeningPorts() ([]int64, error){
	file, err := os.Open("/proc/net/tcp")
	if err != nil {
		return nil, err
	}

	defer file.Close()

	ports := []int64{}
	scanner := bufio.NewScanner(file)

	if scanner.Scan() {
		_= scanner.Text()
	}

	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 10 {
			continue
		}
		state := fields[3]

		if state != "0A" { // 0A = TCP_LISTEN
			continue
		}
		port, err := decodeLocalAddress(fields[1])

		if err != nil {
			continue
		}

		ports = append(ports, port)
	}

	return ports, scanner.Err()
}


func main (){

	ports, err := findListeningPorts()
	if err != nil {
		fmt.Println("error reading active ports")
		return 
	}
	
	j, err := json.Marshal(ports)
	if err != nil {
		fmt.Println("error parsing active ports")

	}

	fmt.Println(string(j))
	
}

