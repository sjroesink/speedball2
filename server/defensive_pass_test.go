package main

import "testing"

func defensivePassFixture() (State, [18]int) {
	const u = 22.4 / 576
	s := initial()
	var d [18]int
	for i := range s.Players {
		s.Players[i].Stun = 100
		d[i] = 1000
	}
	s.Players[0].X, s.Players[0].Z, s.Players[0].Stun = 0, 0, 0
	s.Players[1].X, s.Players[1].Z, s.Players[1].Stun = 20*u, 0, 0
	s.Players[3].X, s.Players[3].Z, s.Players[3].Stun = 100*u, 0, 0
	d[1], d[3] = 20, 100
	s.Ball.Owner = 0
	return s, d
}
func TestDefensivePassRolesAndRange(t *testing.T) {
	s, d := defensivePassFixture()
	p := s.defensivePass(0, &d)
	if p == nil || p.receiver != 3 || !p.high {
		t.Fatal("role priority", p)
	}
	s.Players[3].Stun = 1
	p = s.defensivePass(0, &d)
	if p == nil || p.receiver != 1 || p.high {
		t.Fatal("defender fallback", p)
	}
	d[1] = 200
	p = s.defensivePass(0, &d)
	if p == nil || !p.high {
		t.Fatal("strict throw range")
	}
	d[1] = 201
	if s.defensivePass(0, &d) != nil {
		t.Fatal("intelligence range")
	}
}
func TestDefensivePassBlockedDirections(t *testing.T) {
	const u = 22.4 / 576
	s, d := defensivePassFixture()
	s.Players[16].X, s.Players[16].Z, s.Players[16].Stun = 50*u, 0, 0
	d[16] = 50
	if s.defensivePass(0, &d) != nil {
		t.Fatal("blocked lane")
	}
	s.Ball.Charged = true
	if p := s.defensivePass(0, &d); p == nil || p.receiver != 3 {
		t.Fatal("charged ball")
	}
	s.Players[4].X, s.Players[4].Z, s.Players[4].Stun = 100*u, 0, 0
	d[4] = 100
	if p := s.defensivePass(0, &d); p == nil || p.receiver != 4 {
		t.Fatal("equal-distance roster tie")
	}
}
