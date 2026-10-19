package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"math/rand/v2"
	"os"
	"slices"
	"sync"
)

var min, max = 35000, 40000
var filename = "ports.json"
var routesFilename = "routes.json"

type Mapping struct {
	HostPort  int `json:"host_port"`
	GuestPort int `json:"guest_port"`
}

type Registry struct {
	mu     sync.Mutex
	m      map[int]string
	routes map[string]Mapping
	free   []int
}

func (r *Registry) Deregister(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.routes, id)
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

func (r *Registry) Register(id string, hostPort, guestPort int) (bool, error) {

	if _, exists := r.routes[id]; exists {
		return false, fmt.Errorf("route already exists for id %s", id)
	}

	if hostPort < min || hostPort > max {
		return false, fmt.Errorf("host port %d is out of range (%d-%d)", hostPort, min, max)
	}

	r.routes[id] = Mapping{
		HostPort:  hostPort,
		GuestPort: guestPort,
	}
	return true, nil
}

func (r *Registry) GetRoute(id string) (Mapping, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	route, exists := r.routes[id]
	return route, exists
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
	maps.Copy(out, r.m)
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

func (r *Registry) DumpRoutes() {

	data, err := json.MarshalIndent(r.routes, "", " ")

	if err != nil {
		panic(err)
	}

	err = os.WriteFile(routesFilename, data, 0644)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Saved routes to file %s\n", routesFilename)

}

func (r *Registry) Load() {
	result := make(map[int]string)
	r.routes = make(map[string]Mapping)

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

func (r *Registry) LoadRoutes() {
	result := make(map[string]Mapping)

	data, err := os.ReadFile(routesFilename)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Print("routes file not found, creating new map \n")
			r.routes = result
			return
		} else {
			panic(err)
		}
	}
	
	err = json.Unmarshal(data, &result)
	if err != nil {
		panic(err)
	}
	r.routes = result
	fmt.Println("Routes files loaded")

}
