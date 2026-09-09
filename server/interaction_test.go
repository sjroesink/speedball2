package main

import "testing"

func TestSelectedInteractionPrediction(t *testing.T) {
	s := interactionSetup()
	var d [18]int
	for i := range d {
		d[i] = 100
	}
	d[9] = 20
	s.Players[1].Stats[7] = 250
	s.Players[9].moveZ = 8 * (22.4 / 576) * 25
	s.Controlled[0] = 1
	a := s.localInteraction(1, &d, 0)
	if !a.attack || a.x != 1 || a.z != 1 {
		t.Fatal("selected prediction", a)
	}
	s.Controlled[0] = 7
	a = s.localInteraction(1, &d, 0)
	if !a.attack || a.x != 1 || a.z != 0 {
		t.Fatal("support punch", a)
	}
	s.Players[9].X = 0
	if s.localInteraction(1, &d, 255).x != 1 {
		t.Fatal("coincident avoidance direction")
	}
	s.Controlled[0] = 1
	s.Players[9].moveZ = 0
	a = s.localInteraction(1, &d, 0)
	if a.x != 0 || a.z != 0 {
		t.Fatal("coincident attack direction")
	}
}

func TestSelectedContactAction(t *testing.T) {
	for _, high := range []bool{false, true} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 100
		}
		p, q := &s.Players[7], &s.Players[16]
		p.X, p.Z, p.Stun = 0, 0, 0
		p.Stats[0] = 255
		q.X, q.Z, q.Stun, q.aiWait = .7, 0, 0, 100
		s.Ball.X, s.Ball.Z, s.Ball.H, s.Ball.Owner = .7, 0, 1, 16
		expected := 1
		if high {
			s.Ball.H, s.Ball.Owner = 4, -1
			expected = 2
		}
		s.simulate(1./25, [2]Input{}, [2]bool{})
		if s.Controlled[0] != 7 || p.Action != expected || p.jumping != high {
			t.Fatalf("high=%v selected=%v action=%v", high, s.Controlled[0], p.Action)
		}
	}
}

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
