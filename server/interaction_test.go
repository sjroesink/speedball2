package main

import "testing"

func interactionSetup() State {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p, q := &s.Players[1], &s.Players[9]
	p.X, p.Z, p.Stun = 0, 0, 0
	q.X, q.Z, q.Stun = 1, 0, 0
	s.Ball.Owner = -1
	return s
}
func TestLocalAggression(t *testing.T) {
	s := interactionSetup()
	var d [18]int
	for i := range d {
		d[i] = 100
	}
	d[9] = 30
	a := s.localInteraction(1, &d, 99)
	if a == nil || !a.attack || a.x != 1 {
		t.Fatal("aggression")
	}
	a = s.localInteraction(1, &d, 100)
	if a == nil || a.attack || a.x != -1 {
		t.Fatal("equality avoidance")
	}
	d[9] = 31
	if s.localInteraction(1, &d, 0) != nil {
		t.Fatal("distance")
	}
}
func TestLocalOpponentPriority(t *testing.T) {
	s := interactionSetup()
	var d [18]int
	for i := range d {
		d[i] = 100
	}
	d[9], d[10] = 20, 20
	s.Players[10].X, s.Players[10].Z, s.Players[10].Stun = 1, 0, 0
	s.Ball.Owner = 10
	if s.localInteraction(1, &d, 255).attack {
		t.Fatal("skipped first opponent")
	}
	s.Players[9].Stun = 1
	if !s.localInteraction(1, &d, 255).attack {
		t.Fatal("ball carrier")
	}
	s.Ball.Owner = -1
	s.Players[0].X, s.Players[0].Z, s.Players[0].Stun = 0, 0, 0
	if !s.localInteraction(0, &d, 255).attack {
		t.Fatal("keeper")
	}
	s.Ball.Owner = 1
	if s.localInteraction(1, &d, 0).attack {
		t.Fatal("carrier attacked")
	}
}
