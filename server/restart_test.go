package main

import "testing"

func TestMedicalRestartFormationAndLaunch(t *testing.T) {
	s := initial()
	s.Pause = 0
	s.RestartPhase = 1
	s.Players[7].X += 5
	s.Players[7].Health = 42
	s.Players[7].Stats[3] = 170
	s.Ball.X, s.Ball.Z = 0, 0
	x, clock := s.Players[7].X, s.Time
	s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	if s.Players[7].X >= x || s.Players[7].X <= x-1 {
		t.Fatal("did not walk")
	}
	for i := 0; s.RestartPhase == 1 && i < 1000; i++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	}
	if s.RestartPhase != 2 {
		t.Fatal("formation stalled")
	}
	for i, p := range s.Players {
		x, z := s.launchPosition(i)
		if p.X != x || p.Z != z {
			t.Fatal("wrong formation", i)
		}
	}
	if s.Players[7].Health != 42 || s.Players[7].Stats[3] != 170 {
		t.Fatal("attributes reset")
	}
	for i := 0; i < 39; i++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	}
	if s.RestartPhase != 2 || s.Time != clock || s.Ball.Owner != -1 {
		t.Fatal("premature play")
	}
	s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	if s.RestartPhase != 0 || s.Ball.H != 3.25 || s.Time != clock {
		t.Fatal("launch completion")
	}
}

func TestKickoffLaunchLockout(t *testing.T) {
	s := initial()
	s.beginRestart(0)
	for i := 0; i < 40; i++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	}
	if s.RestartPhase != 2 || s.Time != 90 || s.Ball.Owner != -1 {
		t.Fatal("premature kickoff")
	}
	s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
	if s.RestartPhase != 0 || s.Time != 90 {
		t.Fatal("kickoff release")
	}
}
func TestGoalReturnPreservesPlayers(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p := &s.Players[7]
	p.X, p.Z, p.Health = 3, 2, 41
	s.Ball = Ball{X: pitchX + .01, H: .5, VX: 8, Owner: -1, LastTouch: -1}
	s.simulate(simulationStep, [2]Input{}, [2]bool{})
	if s.Score[0] != 10 || s.RestartPhase != 1 || s.Pause != 1.4 || p.X != 3 || p.Z != 2 || p.Health != 41 {
		t.Fatal("goal reset players")
	}
	for i := 0; i < 34; i++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{})
	}
	if p.X != 3 || p.Z != 2 {
		t.Fatal("celebration skipped")
	}
	for i := 0; s.RestartPhase != 0 && i < 1500; i++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{})
	}
	if s.RestartPhase != 0 || s.Time != 90 || p.Health != 41 || s.Ball.Owner != -1 || s.Ball.H != 3.25 {
		t.Fatal("restart completion")
	}
}

func TestRestartClearsPowerPreservesEquipment(t *testing.T) {
	for _, kind := range []int{1, 2, 3, 4, 5, 6, 9, 10} {
		s := initial()
		p := &s.Players[7]
		p.Health = 42
		p.Stats[0] = 170
		s.pickup(7, 17)
		s.pickup(7, kind)
		s.beginRestart(0)
		s.restartStep(.04)
		if s.Effect.Kind != 0 || s.Effect.Time != 0 || s.Effect.Team != -1 {
			t.Fatal("active restart power", kind, s.Effect)
		}
		if p.Gear != 17 || p.Stats[3] != 250 || p.Stats[0] != 170 || p.Health != 42 {
			t.Fatal("persistent player attributes changed", kind)
		}
		for _, q := range s.Players {
			for _, v := range q.StatBackup {
				if v != 0 {
					t.Fatal("temporary backup retained")
				}
			}
		}
	}
}

func TestLaunchLandingAfterRelease(t *testing.T) {
	s := initial()
	s.beginRestart(0)
	s.RestartPhase = 2
	for i := 0; i < 40; i++ {
		s.restartStep(.04)
	}
	if s.RestartPhase != 0 || s.Ball.FlightKind != 3 || s.Ball.FlightIndex != 20 {
		t.Fatal("release state", s.Ball)
	}
	for _, stage := range []int{6, 6, 10, 10, 9, 9, 8, 8, 7, 7, 0} {
		flightStep(&s.Ball, .04)
		if s.Ball.FlightStage != stage {
			t.Fatal("landing stage", stage, s.Ball.FlightStage)
		}
	}
	if s.Ball.H != .25 || s.Ball.VH != 0 {
		t.Fatal("landing height")
	}
	flightStep(&s.Ball, 1)
	if s.Ball.H != .25 {
		t.Fatal("ground hold")
	}
}
