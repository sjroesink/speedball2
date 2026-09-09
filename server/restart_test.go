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
	if s.RestartPhase != 0 || s.Ball.H != 3 || s.Time != clock {
		t.Fatal("launch completion")
	}
}
