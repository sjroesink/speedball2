package main

import "testing"

func keeperActionSetup() State {
	const u = 22.4 / 576
	s := initial()
	s.logicalView = [2]int{160, 960}
	s.Players[0].X, s.Players[0].Z = -464*u, 0
	s.Ball.X, s.Ball.Z, s.Ball.VX, s.Ball.VZ, s.Ball.Owner = -400*u, 0, 0, 0, -1
	return s
}
func TestKeeperActionReach(t *testing.T) {
	const u = 22.4 / 576
	s := keeperActionSetup()
	a, _, _ := s.keeperAction(0, 64, 255)
	if a == nil || !a.attack {
		t.Fatal("inclusive reach")
	}
	a, _, _ = s.keeperAction(0, 65, 255)
	if a != nil {
		t.Fatal("outside reach")
	}
	a, x, _ := s.keeperAction(0, 65, 49)
	if a == nil || a.attack || x != -400*u {
		t.Fatal("stationary chase")
	}
	a, _, _ = s.keeperAction(0, 65, 50)
	if a != nil {
		t.Fatal("aggression equality")
	}
	s.Players[0].Stats[3] = 250
	a, _, _ = s.keeperAction(0, 96, 255)
	if a == nil || !a.attack {
		t.Fatal("boosted reach")
	}
	a, _, _ = s.keeperAction(0, 97, 255)
	if a != nil {
		t.Fatal("outside boosted reach")
	}
	s.Ball.Owner = 1
	a, _, _ = s.keeperAction(0, 0, 0)
	if a != nil {
		t.Fatal("teammate possession")
	}
}
func TestSelectedKeeperAction(t *testing.T) {
	s := keeperActionSetup()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	s.Players[0].Stun = 0
	s.Ball.H = .75
	s.simulate(simulationStep, [2]Input{}, [2]bool{})
	if s.Controlled[0] != 0 || s.Players[0].Action != 1 {
		t.Fatal("keeper initiation")
	}
}
