package main

import (
	"encoding/base64"
	"encoding/binary"
	"errors"
)

func Base64ToPort(encodedPort string)(int, error) {
	data, err := base64.RawStdEncoding.DecodeString(encodedPort)
	if err != nil {
		return 0, err
	}

	if len(data) == 0 || len(data) > 2 {
		return 0 , errors.New("invalid byte length for a port number")
	}
	// skipped checking of small numbers since our ports start from 35000
	port := binary.BigEndian.Uint16(data)

	return int(port), nil
}

func PortToBase64(port int) string {
	var buf []byte

	if port < 255 {
		buf = []byte{byte(port)}
	}else{
		buf = make([]byte, 2)
		binary.BigEndian.PutUint16(buf, uint16(port))
	}
	return base64.RawStdEncoding.EncodeToString(buf)
	
}