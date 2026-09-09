package main

import "testing"

func TestFormationDuringMedical(t *testing.T) {
	s := initial()
	p := &s.Players[1]
	x, z := s.launchPosition(1)
	p.X += 3
	before := p.X
	s.Players[7].X = 0
	s.Players[7].Z = 0
	s.Players[7].Health = 0
	s.Players[7].ActionTime = 0
	s.startInjury(7)
	bx, bz := s.Ball.X, s.Ball.Z
	s.Players[8].Health = 0
	s.Players[8].ActionTime = .4
	s.step(.04, [2]Input{})
	if p.X >= before || s.Players[7].Stun != 1 {
		t.Fatal("formation movement or patient changed")
	}
	for i := 0; i < 49; i++ {
		s.step(.04, [2]Input{})
	}
	if s.Medical == nil || s.Medical.Player != 7 || s.Players[8].Injury != 0 {
		t.Fatal("medical serialization")
	}
	if p.X != x || p.Z != z {
		t.Fatal("formation not reached")
	}
	if s.Ball.X != bx || s.Ball.Z != bz || s.Ball.Owner != -1 || s.Time != 90 || s.RestartPhase == 2 {
		t.Fatal("premature restart")
	}
	for _, e := range s.Events[:s.EventCount] {
		if e.Kind == 22 || e.Kind == 23 {
			t.Fatal("launcher during medical")
		}
	}
}
