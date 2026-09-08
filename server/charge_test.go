package main

import "testing"

func TestElectricChargeLifecycle(t *testing.T) {
	s := initial()
	s.Controlled[1] = 16
	s.Players[16].X = 0
	s.Players[16].Z = 0
	s.Ball = Ball{H: .75, VX: 1, Charged: true, Electric: 1, ElectricBudget: 1, LastTouch: 7, Owner: -1}
	s.catchBall()
	if s.Ball.Owner != -1 || s.Ball.Electric != 0 || !s.Ball.Charged {
		t.Fatal("last hit removed charged state")
	}
	s.Players[16].Stun = 10
	s.Controlled[0] = 7
	s.Players[7].X = 0
	s.Players[7].Z = 0
	s.catchBall()
	if s.Ball.Owner != 7 || !s.Ball.Charged {
		t.Fatal("friendly catch cleared charge")
	}
	s.throw(7, false)
	if s.Ball.Charged || s.Ball.ElectricBudget != 1 {
		t.Fatal("throw did not reset electric state")
	}
	for _, vx := range []float64{0, 1} {
		s = initial()
		s.Controlled[1] = 16
		s.Players[16].X = 0
		s.Players[16].Z = 0
		s.Ball = Ball{H: .75, VX: vx, Charged: true, LastTouch: 7, Owner: -1}
		s.catchBall()
		if s.Ball.Owner != 16 || s.Ball.Charged != (vx == 0) {
			t.Fatal("opposing catch charge state", vx)
		}
	}
}
