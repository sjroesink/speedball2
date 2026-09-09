package main

import (
	"math"
	"testing"
)

func forwardWorld(x, y int) (float64, float64) {
	const u = 22.4 / 576
	return float64(576-y) * u, float64(x-320) * u
}
func forwardFixture() (State, [18]int) {
	s := initial()
	var d [18]int
	for i := range s.Players {
		s.Players[i].Stun = 100
		d[i] = 1000
	}
	for i := range s.Pickups {
		s.Pickups[i].Wait = 100
	}
	s.Players[8].X, s.Players[8].Z = forwardWorld(320, 150)
	s.Players[8].Stun = 0
	s.Ball.X, s.Ball.Z, s.Ball.Owner = s.Players[8].X, s.Players[8].Z, 8
	return s, d
}
func TestForwardGoalRange(t *testing.T) {
	s, d := forwardFixture()
	s.Players[8].X, s.Players[8].Z = forwardWorld(336, 196)
	if s.goalThrow(8, 0).high {
		t.Fatal("equality must be low")
	}
	s.Players[8].X, s.Players[8].Z = forwardWorld(336, 197)
	if !s.goalThrow(8, 0).high {
		t.Fatal("outside range")
	}
	s.Period = 2
	s.Players[8].X, s.Players[8].Z = forwardWorld(336, 956)
	if s.goalThrow(8, 0).high {
		t.Fatal("mirrored range")
	}
	s.Period = 1
	s.Players[8].X, s.Players[8].Z = forwardWorld(320, 150)
	s.Players[16].X, s.Players[16].Z = forwardWorld(320, 100)
	s.Players[16].Stun = 0
	d[16] = 50
	s.Players[6].X, s.Players[6].Z = forwardWorld(240, 150)
	s.Players[6].Stun = 0
	d[6] = 80
	s.Ball.Charged = true
	if s.forwardDecision(8, 0, &d).receiver != -1 {
		t.Fatal("electroball goal priority")
	}
}
func TestForwardPassPriority(t *testing.T) {
	s, d := forwardFixture()
	s.Players[16].X, s.Players[16].Z = forwardWorld(320, 100)
	s.Players[16].Stun = 0
	d[16] = 50
	s.Players[6].X, s.Players[6].Z = forwardWorld(240, 150)
	s.Players[6].Stun = 0
	d[6] = 80
	s.Players[3].X, s.Players[3].Z = forwardWorld(300, 150)
	s.Players[3].Stun = 0
	d[3] = 20
	if s.forwardDecision(8, 0, &d).receiver != 6 {
		t.Fatal("attacker before midfield")
	}
	s.Players[7].X, s.Players[7].Z = forwardWorld(400, 150)
	s.Players[7].Stun = 0
	d[7] = 80
	if s.forwardDecision(8, 0, &d).receiver != 7 {
		t.Fatal("later tie")
	}
	s.Players[6].Stun, s.Players[7].Stun = 1, 1
	if s.forwardDecision(8, 0, &d).receiver != 3 {
		t.Fatal("midfield fallback")
	}
	d[3] = 200
	if !s.forwardDecision(8, 0, &d).high {
		t.Fatal("strict pass threshold")
	}
	d[3] = 199
	if s.forwardDecision(8, 0, &d).high {
		t.Fatal("short low pass")
	}
	d[3] = 201
	if s.forwardDecision(8, 0, &d).receiver != -1 {
		t.Fatal("observation range")
	}
}
func TestForwardReposition(t *testing.T) {
	s, d := forwardFixture()
	s.Players[6].X, s.Players[6].Z = forwardWorld(240, 150)
	s.Players[6].Stun = 0
	d[6] = 80
	if s.forwardDecision(8, 0, &d).receiver != -1 {
		t.Fatal("free goal priority")
	}
	s.Players[16].X, s.Players[16].Z = forwardWorld(320, 50)
	s.Players[16].Stun = 0
	d[16] = 100
	p := s.forwardDecision(8, 0, &d)
	x, z := forwardWorld(255, 64)
	if !p.move || p.key != 2 || math.Abs(p.x-x) > 1e-12 || math.Abs(p.z-z) > 1e-12 {
		t.Fatal("reposition", p)
	}
	d[16] = 64
	if s.forwardDecision(8, 0, &d).receiver != 6 {
		t.Fatal("close opponent disables reposition")
	}
}
func TestForwardSimulationPass(t *testing.T) {
	s, _ := forwardFixture()
	s.Players[16].X, s.Players[16].Z = forwardWorld(320, 100)
	s.Players[16].Stun, s.Players[16].aiWait = 0, 100
	s.Players[6].X, s.Players[6].Z = forwardWorld(240, 150)
	s.Players[6].Stun, s.Players[6].aiWait = 0, 100
	s.simulate(simulationStep, [2]Input{}, [2]bool{})
	p := s.Players[8]
	if p.throwMode != 2 || p.FX != 0 || p.FZ != -1 {
		t.Fatal("source-selected teammate pass", p)
	}
}
