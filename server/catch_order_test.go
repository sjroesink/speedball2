package main

import "testing"

func TestCatchBeforeMovement(t *testing.T) {
	for _, c := range []struct {
		distance, velocity float64
		owner              int
	}{{17, -8, -1}, {15, 8, 7}} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 100
		}
		p := &s.Players[7]
		p.X, p.Z, p.Stun = 0, 0, 0
		p.FX = 1
		p.FZ = 0
		s.Ball = Ball{X: c.distance * (22.4 / 576), VX: c.velocity * velocityUnit, Owner: -1, LastTouch: 16, SpeedTimer: 100}
		startFlight(&s.Ball, false)
		s.step(simulationStep, [2]Input{})
		if s.Ball.Owner != c.owner {
			t.Fatalf("distance %v owner %d", c.distance, s.Ball.Owner)
		}
		if c.owner < 0 {
			s.step(simulationStep, [2]Input{})
			if s.Ball.Owner != 7 {
				t.Fatal("missing next-tick catch")
			}
		}
	}
}
func TestInterleavedCatchOrder(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	for _, i := range []int{7, 16} {
		s.Players[i].X = 0
		s.Players[i].Z = 0
		s.Players[i].Stun = 0
	}
	s.Ball = Ball{H: .75, Owner: -1, LastTouch: -1}
	s.step(simulationStep, [2]Input{})
	if s.Ball.Owner != 16 {
		t.Fatal(s.Ball.Owner)
	}
}
