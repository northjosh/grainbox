package main

import (
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
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

var idRe = regexp.MustCompile(`^[a-z0-9]{6,32}$`)
var BaseDomain = os.Getenv("BASE_DOMAIN")
var hostRe = regexp.MustCompile(`^([a-z0-9]{6,32})\-([a-z0-9]{6,32})-([a-z0-9]{6,32}).` + regexp.QuoteMeta(BaseDomain) + `$`)

type ProxyHandler struct {
	reg       *Registry
	transport http.RoundTripper
}

func (h *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	host := strings.ToLower(r.Host)

	if hh, _, err := net.SplitHostPort(host); err == nil {
		host = hh
	}

	m := hostRe.FindStringSubmatch(host)
	if m == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	guestPort, err := Base64ToPort(m[2])

	if err != nil || guestPort < minGuestPort || guestPort > maxGuestPort || reservedGuestPorts[guestPort] {
		http.Error(w, "not found", http.StatusForbidden)
		log.Print("port not allwed %n", guestPort)
		return
	}

	id := m[0]
	hostPort, _ := Base64ToPort(m[1])

	// checks if port is in registry and matches id to prevent forging and returns not found 
	if route, ok :=  h.reg.Get(hostPort); ok {
		if route != id  {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
	} else{
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
