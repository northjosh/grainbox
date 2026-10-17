package main

import (
	"crypto/subtle"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

type RegistrationRequest struct {
	GuestPort int    `json:"guestPort"`
	ID        string `json:"id"`
}

func AdminHandler(reg *Registry, token string) http.Handler {
	mux := http.NewServeMux()

	auth := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			got := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			if subtle.ConstantTimeCompare([]byte(got), []byte(token)) != 1 {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			next(w, r)
		}
	}

	mux.HandleFunc("GET /sandboxes", auth(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(reg.Snapshot())
	}))

	mux.HandleFunc("PUT /sandboxes/{id}", auth(func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		// if !idRe.MatchString(id) {
		// 	http.Error(w, "invalid sandbox id", http.StatusBadRequest)
		// 	return
		// }

		port, err := reg.Set(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]any{"port": port})
	}))

	// host + guest port
	mux.HandleFunc("POST /register/{hostPort}", auth(func(w http.ResponseWriter, r *http.Request) {
		hostPort, err := strconv.Atoi(r.PathValue("hostPort"))
		if err != nil {
			http.Error(w, "invalid host port", http.StatusBadRequest)
			return
		}

		defer r.Body.Close()
		var body RegistrationRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		_, ok := reg.Get(hostPort)
		if !ok {
			http.Error(w, "port not found", http.StatusNotFound)
			return
		}

		reg.Register(body.ID, hostPort, body.GuestPort)
		log.Printf("registering route id=%s port=%d: %v", body.ID, body.GuestPort, err)

		json.NewEncoder(w).Encode(map[string]any{"ok": true, "hostPort": hostPort, "guestPort": body.GuestPort, "id": body.ID})
	}))

	mux.HandleFunc("POST /deregister/{id}", auth(func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")

		if id == "" {
			http.Error(w, "invalid id", http.StatusBadRequest)
			return
		}

		reg.Deregister(id)

		json.NewEncoder(w).Encode(map[string]any{"ok": true})
	}))

	mux.HandleFunc("DELETE /sandboxes/{port}", auth(func(w http.ResponseWriter, r *http.Request) {

		port, err := strconv.Atoi(r.PathValue("port"))
		if err != nil {
			http.Error(w, "an error occured", http.StatusInternalServerError)
			return
		}

		reg.Release(port)
		w.WriteHeader(http.StatusNoContent)
	}))

	return mux

}
