package main

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

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

		json.NewEncoder(w).Encode(map[string]interface{}{"port": port})
	}))

	mux.HandleFunc("DELETE /sandboxes/{port}", auth(func(w http.ResponseWriter, r *http.Request) {

		port, err := strconv.Atoi(r.PathValue("port"))
		if err != nil {
			http.Error(w, "an error occured", http.StatusInternalServerError)
		}

		reg.Release(port)
		w.WriteHeader(http.StatusNoContent)
	}))

	return mux

}
