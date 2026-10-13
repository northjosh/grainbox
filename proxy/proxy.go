package main

import (
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

const (
	minGuestPort = 1024
	maxGuestPort = 65535
)

var reservedGuestPorts = map[int]bool{
	// 9999: true, // example: your in-guest agent
}

var idRe = regexp.MustCompile(`^[a-z\0-9]-{6,32}$`)
var BaseDomain = env("BASE_DOMAIN", "grainboxapps.northjosh.com")
var hostRe = regexp.MustCompile(`^(\d{1,5})\-([a-z0-9\-]{4,30})\-(\d{1,5})\.` + regexp.QuoteMeta(BaseDomain) + `$`)

type ProxyHandler struct {
	reg       *Registry
	transport http.RoundTripper
}

func (h *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Println("Proxyingg......")
	host := strings.ToLower(r.Host)

	if hh, _, err := net.SplitHostPort(host); err == nil {
		host = hh
	}

	m := hostRe.FindStringSubmatch(host)
	log.Printf("%s\n", m)

	if m == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	id := m[2]
	hostPort, err := strconv.Atoi(m[1])
	guestPort, err := strconv.Atoi(m[3])

	log.Printf("guest:port %d\n", guestPort)
	log.Printf("host port: %d\n", hostPort)

	if err != nil || guestPort < minGuestPort || guestPort > maxGuestPort || reservedGuestPorts[guestPort] {
		http.Error(w, "not found", http.StatusForbidden)
		log.Print("port not allwed %n", guestPort)
		return
	}

	// checks if port is in registry and matches id to prevent forging and returns not found
	if route, ok := h.reg.Get(hostPort); ok {
		if route != id {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
	} else {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	target := &url.URL{Scheme: "http", Host: "127.0.0.1:" + strconv.Itoa(hostPort)}

	rp := &httputil.ReverseProxy{
		Transport: h.transport,
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(target)
			pr.Out.Host = r.Host

			for _, k := range []string{"X-Forwarded-For", "X-Forwarded-Proto", "X-Forwarded-Host"} {
				if v, ok := pr.In.Header[k]; ok {
					pr.Out.Header[k] = v
				}
			}

			pr.Out.Header.Set("X-Target-Port", strconv.Itoa(guestPort))
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("proxy error sandbox=%s port=%d: %v", id, guestPort, err)
			http.Error(w, "app not reachable (is it running?)", http.StatusBadGateway)
		},
	}

	rp.ServeHTTP(w, r)
}
