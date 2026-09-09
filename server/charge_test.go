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

func TestElectroballFallDirection(t *testing.T) {
	for _, dir := range [][2]float64{{1, 0}, {1, 1}, {0, 1}, {-1, 1}, {-1, 0}, {-1, -1}, {0, -1}, {1, -1}} {
		s := initial()
		s.Controlled[1] = 16
		p := &s.Players[16]
		p.X, p.Z = 0, 0
		s.Players[7].FX, s.Players[7].FZ = -dir[0], -dir[1]
		vx, vz := dir[0]*8, dir[1]*8
		if vx == 0 {
			vx = 4
		}
		if vz == 0 {
			vz = 4
		}
		s.Ball = Ball{Owner: -1, H: .75, DirX: dir[0], DirZ: dir[1], VX: vx, VZ: vz, Charged: true, Electric: 1, ElectricBudget: 1, LastTouch: 7}
		s.catchBall()
		if p.Action != 4 || p.Stun != 26./25 || p.fallX != dir[0]*3*velocityUnit || p.fallZ != dir[1]*3*velocityUnit {
			t.Fatal("electroball fall", dir, p)
		}
		if s.Ball.Electric != 0 || s.Ball.Owner != -1 {
			t.Fatal("charge consumption")
		}
	}
}
