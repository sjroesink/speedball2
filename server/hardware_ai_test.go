package main

import (
	"math"
	"testing"
)

func hardwareFixture(x, y int) (State, [18]int) {
	const u = 22.4 / 576
	s := initial()
	var distances [18]int
	for i := range s.Players {
		s.Players[i].Stun = 100
		distances[i] = 1000
	}
	p := &s.Players[1]
	p.X, p.Z, p.Stun, p.aiWait = float64(576-y)*u, float64(x-320)*u, 0, 0
	s.Ball.X, s.Ball.Z, s.Ball.Owner = p.X, p.Z, 1
	return s, distances
}
func TestHardwareThrowPriority(t *testing.T) {
	const u = 22.4 / 576
	s, d := hardwareFixture(56, 700)
	if p := s.hardwareThrow(1, 255, &d); p == nil || p.high {
		t.Fatal("multiplier")
	}
	s.Multiplier = 2
	if s.hardwareThrow(1, 255, &d) != nil {
		t.Fatal("maximum multiplier")
	}
	s.Multiplier = 0
	s.Players[16].X, s.Players[16].Z, s.Players[16].Stun = (576-650)*u, (56-320)*u, 0
	if s.hardwareThrow(1, 255, &d) != nil {
		t.Fatal("blocked lane")
	}
	s.Ball.Charged = true
	if p := s.hardwareThrow(1, 255, &d); p == nil || p.key != 3 {
		t.Fatal("electroball lane")
	}
}
func TestHardwareWallDirection(t *testing.T) {
	const u = 22.4 / 576
	s, d := hardwareFixture(160, 600)
	p := s.hardwareThrow(1, 255, &d)
	if p == nil || !p.high || p.key != 2 || math.Abs(p.x-(576-464)*u) > 1e-12 || math.Abs(p.z-(32-320)*u) > 1e-12 {
		t.Fatal("wall diagonal", p)
	}
	s.Period = 2
	if s.hardwareThrow(1, 255, &d) != nil {
		t.Fatal("backwards wall throw")
	}
	s.Players[1].X, s.Players[1].Z = (576-552)*u, (480-320)*u
	if p := s.hardwareThrow(1, 255, &d); p == nil || !p.high || p.key != -2 {
		t.Fatal("mirrored diagonal", p)
	}
}
func TestHardwareZapper(t *testing.T) {
	const u = 22.4 / 576
	s, d := hardwareFixture(100, 900)
	if p := s.hardwareThrow(1, 49, &d); p == nil || p.high || p.key != -1 {
		t.Fatal("zapper", p)
	}
	if s.hardwareThrow(1, 50, &d) != nil {
		t.Fatal("strict aggression")
	}
	s.Ball.Charged = true
	if s.hardwareThrow(1, 49, &d) != nil {
		t.Fatal("already charged")
	}
	s.Ball.Charged = false
	s.Players[1].X, s.Players[1].Z = (576-986)*u, (126-320)*u
	if p := s.hardwareThrow(1, 49, &d); p == nil || p.high {
		t.Fatal("inclusive rectangle", p)
	}
	s.Players[1].Z = (127 - 320) * u
	if s.hardwareThrow(1, 49, &d) != nil {
		t.Fatal("outside rectangle")
	}
}
func TestHardwareStartsThrow(t *testing.T) {
	s, _ := hardwareFixture(56, 700)
	s.simulate(simulationStep, [2]Input{}, [2]bool{})
	p := s.Players[1]
	if p.throwMode != 2 || p.FX != 1 || p.FZ != 0 {
		t.Fatal("hardware did not override legacy trigger", p)
	}
}
