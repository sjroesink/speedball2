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
		s.logicalView = [2]int{160, 380}
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

func TestAIThrowPreparation(t *testing.T) {
	for _, high := range []bool{false, true} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 100
			s.Players[i].X = -10
			s.Players[i].Z = 8
		}
		p := &s.Players[7]
		p.Stun, p.X, p.Z, p.FX, p.FZ = 0, 14, 0, 1, 0
		if high {
			p.X = 4
			s.Players[16].X = 5.6
			s.Players[16].Stun = 0
			s.Players[16].aiWait = 100
			s.Players[16].Z = 0
		}
		for i := range s.Pickups {
			s.Pickups[i].Wait = 100
		}
		x := p.X
		s.Ball.Owner = 7
		s.Ball.X = x
		s.Ball.Z = 0
		for n := 0; n < 4; n++ {
			s.simulate(simulationStep, [2]Input{}, [2]bool{})
			if s.Ball.Owner != 7 || p.Action != 3 || p.X != x {
				t.Fatal("AI skipped preparation", n)
			}
		}
		s.simulate(simulationStep, [2]Input{}, [2]bool{})
		kind := 1
		if high {
			kind = 2
		}
		if s.Ball.Owner != -1 || s.Ball.FlightKind != kind {
			t.Fatal("AI release")
		}
	}
}
func TestPossessionLossCancelsLob(t *testing.T) {
	s := initial()
	s.logicalView = [2]int{160, 380}
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p := &s.Players[7]
	p.Stun, p.X, p.Z = 0, 4, 0
	s.Ball.Owner = 7
	inputs := [2]Input{{LobID: 1}, {}}
	s.simulate(simulationStep, inputs, [2]bool{true, true})
	if p.throwMode != 3 {
		t.Fatal("lob did not begin")
	}
	s.Ball = Ball{Owner: -1, X: 10, Z: 10, H: 1}
	for n := 0; n < 8; n++ {
		s.simulate(simulationStep, inputs, [2]bool{true, true})
	}
	for _, e := range s.Events[:s.EventCount] {
		if e.Kind == 3 {
			t.Fatal("released lost ball")
		}
	}
	if s.Charge[0] != 0 {
		t.Fatal("stale windup")
	}
}

func TestActionRecoverySoundFrames(t *testing.T) {
	for _, tc := range [][4]int{{1, 8, 19, 7}, {2, 12, 18, 10}} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 100
		}
		p := &s.Players[7]
		p.X, p.Z, p.Stun = 4, 0, 0
		p.Action = tc[0]
		p.ActionTime = float64(tc[1]) / 25
		p.jumping = tc[0] == 2
		s.Ball.Owner, s.Ball.X, s.Ball.Z = -1, 10, 10
		for frame := 1; frame <= tc[1]+2; frame++ {
			s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
			count := 0
			for _, e := range s.Events[:s.EventCount] {
				if e.Kind == tc[2] {
					count++
					if e.Actor != 7 {
						t.Fatal("sound actor")
					}
				}
			}
			expected := 0
			if frame >= tc[3] {
				expected = 1
			}
			if count != expected {
				t.Fatal("sound timing", tc, frame, count)
			}
		}
	}
}
