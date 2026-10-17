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

// var hostRe = regexp.MustCompile(`^(\d{1,5})\-([a-z0-9\-]{4,30})\-(\d{1,5})\.` + regexp.QuoteMeta(BaseDomain) + `$`)
var hostRe = regexp.MustCompile(`^([a-z0-9\-]{4,30})\.` + regexp.QuoteMeta(BaseDomain) + `$`)

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
		http.Error(w, "no route found", http.StatusNotFound)
		return
	}

	id := m[1]

	route, ok := h.reg.GetRoute(id)
	log.Printf("route: %v, ok: %v", route, ok)

	if !ok {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	if route.GuestPort < minGuestPort || route.GuestPort > maxGuestPort || reservedGuestPorts[route.GuestPort] {
		http.Error(w, "port not allowed", http.StatusForbidden)
		log.Print("port not allwed %n", route.GuestPort)
		return
	}

	
	target := &url.URL{Scheme: "http", Host: "127.0.0.1:" + strconv.Itoa(route.HostPort)}

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
			log.Printf("proxying to sandbox=%s port=%d %s", id, route.GuestPort, target.String())

			pr.Out.Header.Set("X-Target-Port", strconv.Itoa(route.GuestPort))
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("proxy error sandbox=%s port=%d: %v", id, route.GuestPort, err)
			http.Error(w, "app not reachable (is it running?)", http.StatusBadGateway)
		},
	}

	rp.ServeHTTP(w, r)
}
