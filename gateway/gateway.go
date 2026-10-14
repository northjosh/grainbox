package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"time"
)

type Gateway struct {
	listen int
	t http.RoundTripper
}

func (h *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Println("Routing...")

	targetPort, err := strconv.Atoi(r.Header.Get("X-Target-Port"))

	if err != nil {
		panic("no port in header")
	}

	if targetPort == h.listen {
		http.Error(w, "port not allowed", http.StatusBadGateway)
	}

	target := &url.URL{Scheme: "http", Host: "127.0.0.1:" + strconv.Itoa(targetPort)}

	rp := &httputil.ReverseProxy{
		Transport: h.t,
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(target)
			pr.Out.Host = r.Host

			for _, k := range []string{"X-Forwarded-For", "X-Forwarded-Proto", "X-Forwarded-Host"} {
				if v, ok := pr.In.Header[k]; ok {
					pr.Out.Header[k] = v
				}
			}
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("gateway error port=%d: %v", targetPort, err)
			http.Error(w, "app not reachable (is it running?)", http.StatusBadGateway)
		},
	}

	rp.ServeHTTP(w, r)
}

func main() {
	var listen int
	flag.IntVar(&listen, "port", 8080, "gateway port to listen")
	flag.Parse()

	fmt.Printf("parsed port: %d\n", listen)

	transport := &http.Transport{
		DialContext:           (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
		MaxIdleConnsPerHost:   16,
		IdleConnTimeout:       60 * time.Second,
		ResponseHeaderTimeout: 60 * time.Second,
	}

	addr := "0.0.0.0:" + strconv.Itoa(listen)
	log.Printf("gateway on %s on port %d", addr, listen)

	srv := &http.Server{
		Addr:              addr,
		Handler:           &Gateway{listen: listen, t: transport},
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	srv.ListenAndServe()
}
