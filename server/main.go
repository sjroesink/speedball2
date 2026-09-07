package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"flag"
	"github.com/quic-go/quic-go"
	"github.com/quic-go/quic-go/http3"
	"github.com/quic-go/webtransport-go"
	"log"
	"math"
	"math/big"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"sync"
	"time"
)

type Peer struct {
	Name      string
	Session   *webtransport.Session
	Input     Input
	LastInput time.Time
}
type Room struct {
	Code    string
	State   State
	Peers   [2]*Peer
	Started bool
	Created time.Time
}
type Hub struct {
	sync.Mutex
	Rooms map[string]*Room
}
type Snapshot struct {
	State   State     `json:"state"`
	Team    int       `json:"team"`
	Room    string    `json:"room"`
	Started bool      `json:"started"`
	Names   [2]string `json:"names"`
}

func (h *Hub) connect(session *webtransport.Session, code, name string) {
	h.Lock()
	var room *Room
	team := 0
	if code == "" {
		if len(h.Rooms) >= 256 {
			h.Unlock()
			session.CloseWithError(1, "Server vol")
			return
		}
		for {
			raw := make([]byte, 6)
			if _, err := rand.Read(raw); err != nil {
				h.Unlock()
				session.CloseWithError(1, "Serverfout")
				return
			}
			const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
			for i := range raw {
				raw[i] = alphabet[int(raw[i])%len(alphabet)]
			}
			code = string(raw)
			if h.Rooms[code] == nil {
				break
			}
		}
		room = &Room{Code: code, State: initial(), Created: time.Now()}
		h.Rooms[code] = room
	} else {
		room = h.Rooms[code]
		if room == nil || room.Peers[1] != nil || room.Started {
			h.Unlock()
			session.CloseWithError(1, "Arena bestaat niet of is vol")
			return
		}
		team = 1
	}
	peer := &Peer{Session: session, Input: Input{Seq: -1}, LastInput: time.Now()}
	peer.Name = string([]rune(name)[:min(len([]rune(name)), 20)])
	room.Peers[team] = peer
	if room.Peers[0] != nil && room.Peers[1] != nil {
		room.Started = true
	}
	h.Unlock()
	defer func() {
		h.Lock()
		delete(h.Rooms, code)
		var other *Peer
		for _, p := range room.Peers {
			if p != nil && p != peer {
				other = p
			}
		}
		h.Unlock()
		if other != nil {
			other.Session.CloseWithError(0, "Tegenstander heeft de arena verlaten")
		}
	}()
	for {
		data, err := session.ReceiveDatagram(session.Context())
		if err != nil {
			return
		}
		if len(data) > 256 {
			continue
		}
		var input Input
		if json.Unmarshal(data, &input) != nil || math.IsNaN(input.X) || math.IsNaN(input.Z) || math.IsInf(input.X, 0) || math.IsInf(input.Z, 0) {
			continue
		}
		h.Lock()
		if input.Seq > peer.Input.Seq {
			input.X = clamp(input.X, -1, 1)
			input.Z = clamp(input.Z, -1, 1)
			peer.Input = input
			peer.LastInput = time.Now()
		}
		h.Unlock()
	}
}
func (h *Hub) run(done <-chan os.Signal) {
	ticker := time.NewTicker(time.Second / 60)
	defer ticker.Stop()
	count := 0
	for {
		select {
		case <-done:
			return
		case now := <-ticker.C:
			type outbound struct {
				p    *Peer
				data []byte
			}
			var packets []outbound
			var expired []*Peer
			h.Lock()
			count++
			for code, r := range h.Rooms {
				if !r.Started && now.Sub(r.Created) > 10*time.Minute {
					for _, p := range r.Peers {
						if p != nil {
							expired = append(expired, p)
						}
					}
					delete(h.Rooms, code)
					continue
				}
				var inputs [2]Input
				for i, p := range r.Peers {
					if p != nil {
						inputs[i] = Input{Fire: p.Input.Fire, TackleID: p.Input.TackleID, LobID: p.Input.LobID}
					}
					if p != nil && now.Sub(p.LastInput) < 300*time.Millisecond {
						inputs[i] = p.Input
					}
				}
				if r.Started {
					r.State.step(1.0/60, inputs)
				} else {
					r.State.Tick++
				}
				if count%2 == 0 {
					for team, p := range r.Peers {
						if p == nil {
							continue
						}
						names := [2]string{"Challenger", "Wacht op speler"}
						for i, peer := range r.Peers {
							if peer != nil {
								names[i] = peer.Name
							}
						}
						data := encodeSnapshot(Snapshot{r.State, team, code, r.Started, names})
						packets = append(packets, outbound{p, data})
					}
				}
			}
			h.Unlock()
			for _, p := range expired {
				p.Session.CloseWithError(0, "Wachtruimte verlopen")
			}
			for _, packet := range packets {
				if err := packet.p.Session.SendDatagram(packet.data); err != nil {
					log.Printf("snapshot: %v", err)
				}
			}
		}
	}
}
func certificate() (tls.Certificate, []int, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return tls.Certificate{}, nil, err
	}
	now := time.Now()
	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return tls.Certificate{}, nil, err
	}
	template := &x509.Certificate{SerialNumber: serial, Subject: pkix.Name{CommonName: "localhost"}, NotBefore: now.Add(-time.Hour), NotAfter: now.Add(13 * 24 * time.Hour), KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, DNSNames: []string{"localhost"}, IPAddresses: []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")}}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		return tls.Certificate{}, nil, err
	}
	hash := sha256.Sum256(der)
	nums := make([]int, 32)
	for i, b := range hash {
		nums[i] = int(b)
	}
	return tls.Certificate{Certificate: [][]byte{der}, PrivateKey: key}, nums, nil
}
func main() {
	addr := flag.String("addr", ":4433", "UDP WebTransport listen address")
	publicURL := flag.String("public-url", "https://localhost:4433/play", "Browser-facing WebTransport URL")
	origins := flag.String("origins", "http://localhost:5188,http://127.0.0.1:5188,http://localhost:4173,http://localhost:8088,http://127.0.0.1:8088", "Comma-separated frontend origins")
	certFile := flag.String("cert", "", "Public TLS certificate PEM")
	keyFile := flag.String("key", "", "Public TLS private key PEM")
	webAddr := flag.String("web-addr", "127.0.0.1:8088", "HTTP address serving production dist (place behind HTTPS proxy remotely)")
	flag.Parse()
	var cert tls.Certificate
	var hash []int
	var err error
	if *certFile != "" {
		cert, err = tls.LoadX509KeyPair(*certFile, *keyFile)
	} else {
		cert, hash, err = certificate()
	}
	if err != nil {
		log.Fatal(err)
	}
	connection, _ := json.Marshal(map[string]any{"url": *publicURL, "hash": hash})
	if err = os.MkdirAll("public", 0755); err != nil {
		log.Fatal(err)
	}
	if err = os.WriteFile("public/connection.json", connection, 0644); err != nil {
		log.Fatal(err)
	}
	allowed := map[string]bool{}
	for _, o := range strings.Split(*origins, ",") {
		allowed[strings.TrimSpace(o)] = true
	}
	h3 := &http3.Server{Addr: *addr, TLSConfig: http3.ConfigureTLSConfig(&tls.Config{MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{cert}}), QUICConfig: &quic.Config{EnableDatagrams: true, EnableStreamResetPartialDelivery: true, MaxIdleTimeout: 20 * time.Second, KeepAlivePeriod: 5 * time.Second}}
	webtransport.ConfigureHTTP3Server(h3)
	wt := &webtransport.Server{H3: h3, CheckOrigin: func(r *http.Request) bool { return allowed[r.Header.Get("Origin")] }}
	hub := &Hub{Rooms: map[string]*Room{}}
	mux := http.NewServeMux()
	h3.Handler = mux
	mux.HandleFunc("/play", func(w http.ResponseWriter, r *http.Request) {
		code := strings.ToUpper(r.URL.Query().Get("room"))
		if code != "" && (len(code) != 6 || strings.ContainsAny(code, " /?&")) {
			http.Error(w, "Ongeldige code", 400)
			return
		}
		s, err := wt.Upgrade(w, r)
		if err != nil {
			log.Printf("upgrade: %v", err)
			return
		}
		hub.connect(s, code, r.URL.Query().Get("name"))
	})
	web := http.NewServeMux()
	web.HandleFunc("/connection.json", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		w.Write(connection)
	})
	web.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })
	web.Handle("/", http.FileServer(http.Dir("dist")))
	go func() {
		log.Printf("Browser: http://%s", *webAddr)
		if err := http.ListenAndServe(*webAddr, web); err != nil {
			log.Fatal(err)
		}
	}()
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt)
	go func() { hub.run(done); wt.Close() }()
	if u, err := url.Parse(*publicURL); err == nil {
		log.Printf("WebTransport: %s (UDP %s)", u.String(), *addr)
	}
	if err := wt.ListenAndServe(); err != nil {
		log.Print(err)
	}
}
