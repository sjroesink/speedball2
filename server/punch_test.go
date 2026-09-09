package main

import "testing"

func punchSetup() State {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p := &s.Players[7]
	p.X, p.Z, p.Stun, p.FX, p.FZ = 4, 0, 0, 1, 0
	s.Ball.Owner, s.Ball.X, s.Ball.Z = -1, 10, 10
	return s
}
func TestStationaryPunch(t *testing.T) {
	s := punchSetup()
	s.logicalView = [2]int{160, 380}
	p := &s.Players[7]
	s.simulate(simulationStep, [2]Input{{Tackle: true}, {}}, [2]bool{true, true})
	if p.Action != 7 || p.ActionTime != 4./25 || p.X != 4 {
		t.Fatal("punch start")
	}
	inputs := [2]Input{{Tackle: true, X: 1}, {}}
	for n := 1; n < 4; n++ {
		s.simulate(simulationStep, inputs, [2]bool{true, true})
		if p.Action != 7 || p.X != 4 {
			t.Fatal("punch busy")
		}
	}
	s.simulate(simulationStep, inputs, [2]bool{true, true})
	if p.Action != 0 || p.X <= 4 {
		t.Fatal("punch recovery")
	}
	count := 0
	for _, e := range s.Events[:s.EventCount] {
		if e.Kind == 20 {
			count++
		}
	}
	if count != 1 {
		t.Fatal("punch repeated")
	}
}
func TestPunchFallVelocity(t *testing.T) {
	s := punchSetup()
	s.logicalView = [2]int{160, 360}
	s.RNG = [2]uint32{}
	q := &s.Players[16]
	q.X, q.Z, q.Stun, q.FX, q.FZ = 4.6, 0, 0, 1, 0
	s.Ball.Owner = 16
	s.simulate(simulationStep, [2]Input{{Tackle: true}, {}}, [2]bool{true, true})
	if s.Ball.Owner != 16 {
		t.Fatal("early punch")
	}
	s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	if s.Ball.Owner != 7 || q.Stun <= 0 || q.fallX != 3*velocityUnit {
		t.Fatal("punch contact")
	}
}

func TestHitIndependentOfViewport(t *testing.T) {
	const u = 22.4 / 576
	for _, actorOutside := range []bool{false, true} {
		s := punchSetup()
		s.RNG = [2]uint32{}
		p, q := &s.Players[7], &s.Players[16]
		p.X, p.Action, p.ActionTime = 91*u, 7, 4./25
		q.X, q.Z, q.Stun = 93*u, 0, 0
		if actorOutside {
			p.X, q.X = 93*u, 91*u
		}
		s.Ball.Owner = 16
		s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
		if s.Ball.Owner != 7 || !p.tackleResolved {
			t.Fatal("offscreen hit missing")
		}
	}
}
