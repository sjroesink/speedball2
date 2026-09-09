package main

import "testing"

func TestRuntimeCadence(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	for n := 0; n < simulationRate; n++ {
		s.step(simulationStep, [2]Input{})
	}
	if s.Tick != 25 || s.Time != 89 {
		t.Fatal(s.Tick, s.Time)
	}
}
func TestReleasedActionAtRuntimeCadence(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p := &s.Players[7]
	p.X, p.Z, p.Stun = 0, 0, 0
	p.FX, p.FZ = 1, 0
	s.Ball = Ball{Owner: 7, H: 1, LastTouch: 7}
	for n := 0; n < 5; n++ {
		s.step(simulationStep, [2]Input{{Fire: 1}, {}})
	}
	if s.Ball.Owner != -1 || s.Ball.FlightKind != 1 || s.Ball.LastTouch != 7 {
		t.Fatal(s.Ball)
	}
	s.step(simulationStep, [2]Input{{Fire: 1}, {}})
	throws := 0
	for _, e := range s.Events[:s.EventCount] {
		if e.Kind == 3 {
			throws++
		}
	}
	if throws != 1 {
		t.Fatal("repeated released action", throws)
	}
}

func TestThrowAnimationIndices(t *testing.T) {
	for _, high := range []bool{false, true} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 100
		}
		p := &s.Players[7]
		p.X, p.Z, p.FX, p.FZ, p.Stun = 4, 0, 1, 0, 0
		s.Ball.Owner = 7
		s.simulate(simulationStep, [2]Input{{Shoot: true}, {}}, [2]bool{true, true})
		for index := 1; index < 4; index++ {
			s.simulate(simulationStep, [2]Input{{Shoot: !high}, {}}, [2]bool{true, true})
			if s.Ball.Owner != 7 {
				t.Fatal("early release", index)
			}
		}
		s.simulate(simulationStep, [2]Input{{Shoot: high}, {}}, [2]bool{true, true})
		expected := 1
		if high {
			expected = 2
		}
		if s.Ball.Owner != -1 || s.Ball.FlightKind != expected || p.ActionTime != 4./25 {
			t.Fatal("release frame", s.Ball, p.ActionTime)
		}
		for index := 5; index < 8; index++ {
			s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
			if p.Action != 3 {
				t.Fatal("early recovery", index)
			}
		}
		s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
		if p.Action != 0 {
			t.Fatal("late recovery")
		}
	}
}
