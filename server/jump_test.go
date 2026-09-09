package main

import (
	"math"
	"testing"
)

func TestCarriedBallDuringJump(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p := &s.Players[7]
	p.X, p.Z, p.FX, p.FZ, p.Stun = 0, 0, 1, 0, 0
	p.Action, p.jumping, p.ActionTime = 2, true, 12./25
	s.Ball.Owner = 7
	step := func() { s.simulate(simulationStep, [2]Input{}, [2]bool{true, false}) }
	step()
	if s.Ball.H <= 1 || s.Ball.VX != 4*velocityUnit || s.Ball.VZ != 0 {
		t.Fatal("jump attachment", s.Ball)
	}
	for tick := 1; tick < 5; tick++ {
		step()
	}
	if s.Ball.H <= 2.7 {
		t.Fatal("ball stayed below carrier")
	}
	for tick := 5; tick < 10; tick++ {
		step()
	}
	if math.Abs(s.Ball.H-1) > 1e-9 || s.Ball.Owner != 7 {
		t.Fatal("landing")
	}
	for tick := 10; tick < 12; tick++ {
		step()
	}
	if s.Ball.VX != 0 || s.Ball.H != 1 {
		t.Fatal("standing attachment")
	}
}

func TestHumanJumpLaunchSpeed(t *testing.T) {
	for _, c := range [][2]int{{100, 5}, {140, 5}, {141, 6}, {170, 6}, {171, 6}, {200, 6}, {201, 7}, {250, 7}} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 100
		}
		p := &s.Players[7]
		p.X, p.Z, p.Stun = 0, 0, 0
		p.Stats[3] = c[0]
		s.Ball.X, s.Ball.Z, s.Ball.H, s.Ball.Owner = 1, 0, 4, -1
		s.simulate(simulationStep, [2]Input{{Shoot: true, X: 1}, {}}, [2]bool{true, false})
		if p.Action != 2 || p.moveX != float64(c[1])*velocityUnit {
			t.Fatal("launch", c, p.Action, p.moveX)
		}
		p.Stats[3] = 100
		if c[0] == 100 {
			p.Stats[3] = 250
		}
		s.Ball.X = 8
		s.simulate(simulationStep, [2]Input{{X: -1}, {}}, [2]bool{true, false})
		if p.moveX != float64(c[1])*velocityUnit {
			t.Fatal("midair speed changed", c, p.moveX)
		}
	}
}

func TestStationaryJump(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p := &s.Players[7]
	p.X, p.Z, p.FX, p.FZ, p.Stun = 0, 0, 0, -1, 0
	s.Ball.X, s.Ball.Z, s.Ball.H, s.Ball.Owner = 1, 0, 4, -1
	s.simulate(simulationStep, [2]Input{{Shoot: true}, {}}, [2]bool{true, false})
	if p.Action != 2 || !p.stationaryJump {
		t.Fatal("stationary launch")
	}
	s.Ball.X = 8
	for tick := 1; tick < 12; tick++ {
		s.simulate(simulationStep, [2]Input{{X: 1}, {}}, [2]bool{true, false})
		if p.X != 0 || p.Z != 0 || p.FZ != -1 {
			t.Fatal("jump drift", tick, p.X, p.Z)
		}
	}
	s.simulate(simulationStep, [2]Input{{X: 1}, {}}, [2]bool{true, false})
	if p.X <= 0 {
		t.Fatal("movement not restored")
	}
}

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

func TestLandingCatchOrder(t *testing.T) {
	for _, tc := range [][3]int{{0, 3, 7}, {8, 3, -1}, {8, 2, 7}} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 10
		}
		p := &s.Players[7]
		p.X, p.Z, p.FX, p.FZ, p.Stun = 0, 0, 1, 0, 0
		p.Action = 2
		p.jumping = true
		p.ActionTime = 3. / 25
		s.Ball = Ball{Owner: -1, X: float64(tc[0]), FlightKind: 2, FlightStage: 3, H: 3, LastTouch: -1}
		s.simulate(simulationStep, [2]Input{}, [2]bool{true, false})
		if p.jumping || p.Action != 2 {
			t.Fatal("landing must clear jumping but remain busy")
		}
		if tc[0] != 0 {
			s.Ball = Ball{Owner: -1, X: p.X, Z: p.Z, FlightKind: 2, FlightStage: tc[1], H: 3, LastTouch: -1}
			s.simulate(simulationStep, [2]Input{}, [2]bool{true, false})
		}
		if s.Ball.Owner != tc[2] {
			t.Fatal("landing catch", tc, s.Ball.Owner)
		}
	}
}

func TestLobCannotCancelBusyAction(t *testing.T) {
	for _, action := range []int{1, 2, 3} {
		s := initial()
		s.logicalView = [2]int{160, 380}
		for i := range s.Players {
			s.Players[i].Stun = 10
		}
		p := &s.Players[7]
		p.X, p.Z, p.FX, p.FZ, p.Stun = 4, 0, 1, 0, 0
		p.Action = action
		p.jumping = action == 2
		p.ActionTime = 3. / 25
		s.Ball = Ball{Owner: 7, X: 4, H: 1, LastTouch: 7}
		inputs := [2]Input{{LobID: 1}, {}}
		s.simulate(simulationStep, inputs, [2]bool{true, false})
		if s.Ball.Owner != 7 || p.Action != action || s.Charge[0] != 0 {
			t.Fatal("lob interrupted busy action", action)
		}
		s.simulate(simulationStep, inputs, [2]bool{true, false})
		s.simulate(simulationStep, inputs, [2]bool{true, false})
		if p.Action != 0 || s.Ball.Owner != 7 {
			t.Fatal("blocked input was queued", action)
		}
		inputs[0].LobID = 2
		s.simulate(simulationStep, inputs, [2]bool{true, false})
		if s.Ball.Owner != 7 {
			t.Fatal("shortcut skipped windup")
		}
		for n := 0; n < 4; n++ {
			s.simulate(simulationStep, inputs, [2]bool{true, false})
		}
		if s.Ball.Owner != -1 || s.Ball.FlightKind != 2 {
			t.Fatal("lob blocked after recovery", action)
		}
	}
}
