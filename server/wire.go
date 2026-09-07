package main

import (
	"bytes"
	"encoding/binary"
	"math"
)

// Versioned, bounded binary snapshots keep all 18 players in one QUIC datagram.
func encodeSnapshot(m Snapshot) []byte {
	b := new(bytes.Buffer)
	b.Write([]byte{'S', 'B', '2', 2})
	put := func(v any) { _ = binary.Write(b, binary.LittleEndian, v) }
	u8 := func(v int) { put(uint8(v)) }
	i8 := func(v int) { put(int8(v)) }
	f := func(v float64) { put(float32(v)) }
	q := func(v float64) { put(int16(math.Round(v * 1000))) }
	str := func(s string) {
		raw := []byte(s)
		if len(raw) > 80 {
			raw = raw[:80]
		}
		u8(len(raw))
		b.Write(raw)
	}
	s := m.State
	put(uint32(s.Tick))
	f(s.Time)
	u8(s.Period)
	flags := 0
	if s.Over {
		flags |= 1
	}
	if m.Started {
		flags |= 2
	}
	u8(flags)
	u8(m.Team)
	u8(s.Controlled[0])
	u8(s.Controlled[1])
	for _, n := range s.Score {
		put(uint16(n))
	}
	q(s.Charge[0])
	q(s.Charge[1])
	q(s.Pause)
	u8(int(s.Stars[0]))
	u8(int(s.Stars[1]))
	i8(s.Multiplier)
	for _, v := range []float64{s.Ball.X, s.Ball.Z, s.Ball.H, s.Ball.VX, s.Ball.VZ, s.Ball.VH} {
		f(v)
	}
	i8(s.Ball.Owner)
	i8(s.Ball.LastTouch)
	e := s.Event
	put(e.ID)
	u8(e.Kind)
	i8(e.Actor)
	i8(e.Target)
	f(e.X)
	f(e.Z)
	f(e.H)
	for _, p := range s.Players {
		put(int16(math.Round(p.X * 100)))
		put(int16(math.Round(p.Z * 100)))
		q(p.FX)
		q(p.FZ)
		q(p.Stun)
		u8(p.Action)
		q(p.ActionTime)
		q(p.Cooldown)
	}
	str(m.Room)
	str(m.Names[0])
	str(m.Names[1])
	return b.Bytes()
}
