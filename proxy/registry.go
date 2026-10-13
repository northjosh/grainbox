package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/rand/v2"
	"os"
	"slices"
	"sync"
)

var min, max = 35000, 40000
var filename = "ports.json"

type Registry struct {
	mu   sync.Mutex
	m    map[int]string
	free []int
}

func (r *Registry) Get(port int) (string, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	p, ok := r.m[port]
	return p, ok
}

func (r *Registry) Set(id string) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.free) == 0 {
		return 0, errors.New("No ports available")
	}

	index := rand.IntN(len(r.free)) + 1
	port := r.free[index]
	r.free = r.free[:len(r.free)-1]
	r.free = slices.Delete(r.free, index, index+1)
	r.m[port] = id
	return port, nil
}

func (r *Registry) Release(port int) {
	r.mu.Lock()

	if _, exists := r.m[port]; exists {
		delete(r.m, port)
		r.free = append(r.free, port)
	}

	r.mu.Unlock()

}

func (r *Registry) Snapshot() map[int]string {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make(map[int]string, len(r.m))
	for k, v := range r.m {
		out[k] = v
	}
	return out

}

func (r *Registry) Dump() {

	data, err := json.MarshalIndent(r.m, "", " ")

	if err != nil {
		panic(err)
	}

	err = os.WriteFile(filename, data, 0644)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Saved integer-keyed map to file  to %s\n", filename)

}

func (r *Registry) Load() {
	result := make(map[int]string)

	data, err := os.ReadFile(filename)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Print("ports file not found, creating new map \n")
			r.m = result
			for p := min; p <= max; p++ {
				r.free = append(r.free, p)
			}
			fmt.Printf("free ports alloted: %d\n", len(r.free))
		} else {
			panic(err)
		}
	} else {
		err = json.Unmarshal(data, &result)
		if err != nil {
			panic(err)
		}
		r.m = result
		for p := min; p <= max; p++ {
			if result[p] == "" {
				r.free = append(r.free, p)
			}
		}
		fmt.Printf("free ports alloted: %d\n", len(r.free))
		fmt.Println("Ports files loaded")
	}
}
