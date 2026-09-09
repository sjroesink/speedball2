package main

import "testing"

func TestStandingCatchRecovery(t *testing.T) {
	s := initial()
	s.logicalView = [2]int{160, 380}
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p := &s.Players[7]
	p.X, p.Z, p.Stun, p.FX, p.FZ = 4, 0, 0, 1, 0
	s.Controlled[0] = 7
	s.Ball = Ball{Owner: -1, X: 4, Z: .2, H: .75, VZ: -1, LastTouch: -1}
	s.catchBall()
	if p.Action != 6 || p.ActionTime != 3./25 || p.FX != 0 || p.FZ != 1 {
		t.Fatal("standing catch")
	}
	inputs := [2]Input{{X: 1, LobID: 1}, {}}
	for n := 0; n < 2; n++ {
		s.simulate(simulationStep, inputs, [2]bool{true, true})
		if p.X != 4 || s.Ball.Owner != 7 {
			t.Fatal("early input")
		}
	}
	s.simulate(simulationStep, inputs, [2]bool{true, true})
	if p.Action != 0 || p.X <= 4 {
		t.Fatal("recovery")
	}
}
func TestCatchRecoveryExclusions(t *testing.T) {
	for _, mode := range []string{"moving", "still ball", "same position"} {
		s := initial()
		p := &s.Players[7]
		p.X, p.Z = 4, 0
		s.Controlled[0] = 7
		s.Ball = Ball{Owner: -1, X: 4, Z: .2, H: .75, VZ: -1, LastTouch: -1}
		switch mode {
		case "moving":
			p.moveX = 1
		case "still ball":
			s.Ball.VZ = 0
		case "same position":
			s.Ball.Z = 0
		}
		s.catchBall()
		if s.Ball.Owner != 7 || p.Action != 0 {
			t.Fatal(mode)
		}
	}
}

func TestKeeperBlockBeforeCatchEligibility(t *testing.T) {
	for _, stage := range []int{1, 6} {
		for _, charged := range []bool{false, true} {
			s := initial()
			for i := range s.Players {
				s.Players[i].Stun = 100
			}
			p := &s.Players[0]
			p.X, p.Z, p.Stun, p.Action, p.keeperBlock, p.FX, p.FZ = 0, 0, 0, 1, true, 0, 1
			s.Controlled[0] = 0
			s.Ball = Ball{Owner: -1, LastTouch: 9, VX: -4, H: .25 + float64(stage)*.5, FlightKind: 2, FlightStage: stage, Charged: charged}
			if charged {
				s.Ball.Electric = 3
			}
			s.catchBall()
			if p.Health != 100 || p.Action != 1 || s.Ball.Owner != -1 || s.Ball.FlightStage != 1 || s.Ball.Charged {
				t.Fatalf("stage=%d charged=%v: player=%+v ball=%+v", stage, charged, p, s.Ball)
			}
			if s.Event.Kind != 17 {
				t.Fatal("missing deflection cue")
			}
		}
	}
}
