package main

import "testing"

func TestJumpSelection(t *testing.T) {
	p := Player{Stats: defaultStats()}
	b := Ball{Owner: -1, FlightKind: 2, FlightStage: 3, H: 5}
	if !canJumpAtBall(&p, &b, 48, false) || canJumpAtBall(&p, &b, 49, false) {
		t.Fatal("base speed reach")
	}
	p.Stats[3] = 250
	if !canJumpAtBall(&p, &b, 72, false) || canJumpAtBall(&p, &b, 73, false) {
		t.Fatal("boosted speed reach")
	}
	if canJumpAtBall(&p, &b, 0, true) {
		t.Fatal("multiplier ball")
	}
	b.Owner = 9
	if canJumpAtBall(&p, &b, 0, false) {
		t.Fatal("held ball")
	}
	b.Owner = -1
	b.FlightStage = 2
	if canJumpAtBall(&p, &b, 0, false) {
		t.Fatal("low flight stage")
	}
}

func TestSlideDurationAndRecovery(t *testing.T) {
	for _, tc := range [][2]int{{100, 8}, {120, 9}, {160, 10}, {200, 11}, {240, 12}} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 10
		}
		p := &s.Players[7]
		p.X, p.Z, p.FX, p.FZ, p.Stun = 0, 0, 1, 0, 0
		p.Stats[3] = tc[0]
		s.Ball.X, s.Ball.Z, s.Ball.Owner = 8, 8, -1
		inputs := [2]Input{{TackleID: 1, X: 1}, {}}
		s.simulate(simulationStep, inputs, [2]bool{true, false})
		if p.ActionTime != float64(tc[1])/25 {
			t.Fatal("start duration", p.ActionTime)
		}
		for i := 1; i < tc[1]; i++ {
			s.simulate(simulationStep, inputs, [2]bool{true, false})
			if p.Action != 1 {
				t.Fatal("ended early", tc, i)
			}
		}
		s.simulate(simulationStep, inputs, [2]bool{true, false})
		if p.Action != 0 || p.Cooldown > 1e-9 {
			t.Fatal("extra recovery", tc, p.Action, p.Cooldown)
		}
	}
}
func TestJumpDurationAndDirection(t *testing.T) {
	for _, speed := range []int{100, 250} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 10
		}
		p := &s.Players[7]
		p.X, p.Z, p.FX, p.FZ, p.Stun = 0, 0, 1, 0, 0
		p.Stats[3] = speed
		p.Action = 2
		p.ActionTime = actionDuration(2, speed)
		expected := 12. / 25
		if speed == 250 {
			expected = 16. / 25
		}
		if p.ActionTime != expected {
			t.Fatal("jump duration")
		}
		s.Ball.X, s.Ball.Z, s.Ball.Owner = 8, 8, -1
		s.simulate(simulationStep, [2]Input{{X: -1, Z: 1}, {}}, [2]bool{true, false})
		if p.X <= 0 || p.Z != 0 || p.FX != 1 {
			t.Fatal("steered busy jump")
		}
		p.ActionTime = 2. / 25
		if jumpHeight(*p) > 1e-9 {
			t.Fatal("landing height")
		}
	}
}
