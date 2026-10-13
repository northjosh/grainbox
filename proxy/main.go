package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

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

	adminAddr := env("ADMIN_LISTEN_ADDR", "127.0.0.1:9090")
	log.Printf("admin API on %s", adminAddr)

	adminSrv := &http.Server{
		Addr:              adminAddr,
		Handler:           AdminHandler(reg, token),
		ReadHeaderTimeout: 5 * time.Second,
	}

	//admin server
	go func() {
		log.Fatal(adminSrv.ListenAndServe())
		// log.Printf("proxy on %s for *%s", addr, baseDomain)
	}()

	proxyAddr := env("PROXY_LISTEN_ADDR", "0.0.0.0:8080") // attach to tailscale interface
	log.Printf("proxy on %s for .%s", proxyAddr, BaseDomain)
	proxySrv := &http.Server{
		Addr:              proxyAddr,
		Handler:           &ProxyHandler{reg: reg, transport: transport},
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// proxy server
	go func() {
		log.Fatal(proxySrv.ListenAndServe())
		// log.Printf("proxy on %s for *%s", addr, baseDomain)
	}()

	<-ctx.Done()
	log.Print("gracefully shutting down....\n")

	// dump our registry so we can load it on next start
	reg.Dump()
	shutdownctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = proxySrv.Shutdown(shutdownctx)
	_ = adminSrv.Shutdown(shutdownctx)

}
