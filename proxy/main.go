package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"time"
)

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	token := os.Getenv("ADMIN_SECRET")

	if token == "" {
		log.Fatal("ADMIN_SECRET is required")
	}

	reg := &Registry{}
	reg.Load() // loads the ports.json file or return empty if n/a

	transport := &http.Transport{
		DialContext:           (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
		MaxIdleConnsPerHost:   16,
		IdleConnTimeout:       60 * time.Second,
		ResponseHeaderTimeout: 60 * time.Second,
	}

	go func() {
		addr := env("LISTEN_ADDR", "127.0.0.1:9090")
		log.Printf("admin API on %s", addr)

		srv := &http.Server{
			Addr:              addr,
			Handler:           AdminHandler(reg, token),
			ReadHeaderTimeout: 5 * time.Second,
		}
		log.Fatal(srv.ListenAndServe())
		// log.Printf("proxy on %s for *%s", addr, baseDomain)
	}()

	addr := env("LISTEN_ADDR", "127.0.0.1:8080")
	log.Printf("proxy on %s for .%s", addr, BaseDomain)
	srv := &http.Server{
		Addr:              addr,
		Handler:           &ProxyHandler{reg: reg, transport: transport},
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())

}
