package main

import (
	"math"
	"testing"
)

func TestOpponentMovementBlocking(t *testing.T) {
	const unit = 22.4 / 576
	for _, tc := range [][4]int{{20, 0, 30, 1}, {20, 0, 31, 0}, {20, 10, 25, 1}, {20, 11, 25, 2}} {
		var players [18]Player
		players[0] = Player{Team: 0, Health: 100, moveX: 25 * unit, moveZ: 25 * unit}
		players[9] = Player{Team: 1, Health: 100, X: float64(tc[0]) * unit, Z: float64(tc[1]) * unit}
		var distances [18]int
		distances[9] = tc[2]
		blockPlayerMovement(&players, 0, &distances, 1./25, [2]int{160, 484})
		x, z := 0., 0.
		if tc[3] > 0 {
			x = -unit
		}
		if tc[3] > 1 {
			z = -unit
		}
		if players[0].X != x || players[0].Z != z {
			t.Fatal("blocked axes", tc, players[0])
		}
		if players[9].X != float64(tc[0])*unit {
			t.Fatal("pushed opponent")
		}
	}
}
func TestContactExclusions(t *testing.T) {
	const unit = 22.4 / 576
	for _, kind := range []string{"team", "fallen", "stationary", "retreat"} {
		var players [18]Player
		players[0] = Player{Team: 0, Health: 100, moveX: 25 * unit, moveZ: 25 * unit}
		players[9] = Player{Team: 1, Health: 100, X: 20 * unit}
		switch kind {
		case "team":
			players[9].Team = 0
		case "fallen":
			players[9].Stun = 1
		case "stationary":
			players[0].moveX = 0
			players[0].moveZ = 0
		case "retreat":
			players[0].moveX = -25 * unit
		}
		distances := contactDistances(&players)
		blockPlayerMovement(&players, 0, &distances[0], 1./25, [2]int{160, 484})
		if players[0].X != 0 || players[0].Z != 0 {
			t.Fatal("unexpected push", kind)
		}
	}
}

func tackleFixture(distance int) State {
	const unit = 22.4 / 576
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p, q := &s.Players[7], &s.Players[16]
	p.Stun, p.X, p.Z, p.FX, p.FZ = 0, 0, 0, 1, 0
	p.Action = 1
	p.ActionTime = .3
	q.Stun, q.X, q.Z, q.FX, q.FZ = 0, float64(distance)*unit, 0, 1, 0
	s.Ball.Owner, s.Ball.X, s.Ball.Z = 16, q.X, 0
	return s
}
func TestTackleCachedDistance(t *testing.T) {
	near := tackleFixture(30)
	near.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	if !near.Players[7].tackleResolved {
		t.Fatal("inclusive reach")
	}
	far := tackleFixture(31)
	far.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	if far.Players[7].tackleResolved {
		t.Fatal("used post-movement distance")
	}
	far.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	if !far.Players[7].tackleResolved {
		t.Fatal("next tick contact")
	}
}
func TestTackleRosterOrder(t *testing.T) {
	for _, tick := range []uint64{0, 1} {
		s := tackleFixture(20)
		s.Tick = tick
		s.RNG = [2]uint32{}
		s.Players[16].Action = 1
		s.Players[16].ActionTime = .3
		s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
		if !s.Players[16].tackleResolved || s.Players[7].tackleResolved || s.Players[7].Stun <= 0 {
			t.Fatal("roster order", tick)
		}
	}
}

func TestTacklePreemptsLaterThrow(t *testing.T) {
	s := tackleFixture(20)
	s.RNG = [2]uint32{}
	p, q := &s.Players[7], &s.Players[16]
	p.Action = 3
	p.ActionTime = 5. / 25
	p.throwMode = 1
	q.Action = 1
	q.ActionTime = .3
	s.Ball.Owner, s.Ball.X, s.Ball.Z = 7, 0, 0
	s.simulate(simulationStep, [2]Input{{Shoot: true}, {}}, [2]bool{true, true})
	if p.Stun <= 0 || s.Ball.Owner != 16 {
		t.Fatal("late throw escaped tackle")
	}
	for _, e := range s.Events[:s.EventCount] {
		if e.Kind == 3 {
			t.Fatal("throw executed after tackle")
		}
	}
}

func TestGlobalMovementAfterThinking(t *testing.T) {
	const unit = 22.4 / 576
	s := initial()
	s.logicalView = [2]int{160, 380}
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p, q := &s.Players[7], &s.Players[16]
	p.X, p.Z, p.Stun, p.FX, p.FZ = 4, unit, 0, 0, -1
	q.X, q.Z, q.Stun, q.FX, q.FZ = 4, 0, 0, 1, 0
	s.Ball.Owner, s.Ball.X, s.Ball.Z = 16, 4, 0
	s.simulate(simulationStep, [2]Input{{Z: -1}, {X: 1}}, [2]bool{true, true})
	if q.X <= 4 {
		t.Fatal("earlier player did not move")
	}
	if math.Abs(p.Z-unit) > 1e-9 {
		t.Fatal("later player saw already-moved opponent", p.Z)
	}
}

func TestCollisionVisibility(t *testing.T) {
	const unit = 22.4 / 576
	var players [18]Player
	players[0] = Player{X: 91 * unit, Team: 0, Health: 100, Action: 4, Stun: .5, ActionTime: .5, fallX: 25 * unit, moveX: 25 * unit}
	players[9] = Player{X: 93 * unit, Team: 1, Health: 100}
	var distances [18]int
	distances[9] = 2
	blockPlayerMovement(&players, 0, &distances, 1./25, [2]int{160, 484})
	p := &players[0]
	if p.X != 91*unit || p.Stun != .5 || p.fallX != 25*unit {
		t.Fatal("offscreen opponent held fall")
	}
	players[9].X = 92 * unit
	blockPlayerMovement(&players, 0, &distances, 1./25, [2]int{160, 484})
	if p.Stun != 17./25 || p.fallX != 0 {
		t.Fatal("visible opponent did not hold fall")
	}
	p.X, p.Action, p.Stun, p.moveX = 93*unit, 0, 0, -25*unit
	players[9].X = 91 * unit
	blockPlayerMovement(&players, 0, &distances, 1./25, [2]int{160, 484})
	if p.X != 93*unit {
		t.Fatal("offscreen actor blocked")
	}
}

func TestTackleFallMotion(t *testing.T) {
	const unit = 22.4 / 576
	s := tackleFixture(20)
	s.RNG = [2]uint32{}
	p, q := &s.Players[7], &s.Players[16]
	p.Action, p.ActionTime = 0, 0
	q.Action = 1
	q.ActionTime = .3
	s.Ball.Owner = 7
	s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	if p.Stun != 35./25 || math.Abs(p.X) > 1e-9 {
		t.Fatal("initial fall", p.X, p.Stun)
	}
	q.Stun = 100
	for n := 1; n < 34; n++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	}
	if math.Abs(p.X-132*unit) > 1e-9 {
		t.Fatal("fall speed", p.X)
	}
	x := p.X
	s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	if p.X != x || p.Action != 4 {
		t.Fatal("last fall frame")
	}
	s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	if p.Stun != 0 || p.Action != 0 {
		t.Fatal("fall recovery")
	}
}

func TestLateFallContactHoldsRecovery(t *testing.T) {
	s := tackleFixture(20)
	p := &s.Players[7]
	p.Action = 4
	p.ActionTime = 18. / 25
	p.Stun = 18. / 25
	p.fallX = 4 * velocityUnit
	p.fallZ = 0
	for n := 0; n < 4; n++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
		if p.Stun != 17./25 || p.ActionTime != 17./25 || p.fallX != 0 || p.X != 0 {
			t.Fatal("late fall contact", p)
		}
	}
	s.Players[16].X = 10
	for n := 0; n < 17; n++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	}
	if p.Stun != 0 || p.Action != 0 {
		t.Fatal("recovery after opponent leaves")
	}
}
