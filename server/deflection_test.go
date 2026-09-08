package main

import (
	"math"
	"testing"
)

func TestKeeperDeflection(t *testing.T) {
	expected := [2][8]int{{0, 0, 1, 2, 0, 6, 7, 0}, {4, 2, 3, 4, 4, 4, 5, 6}}
	for side := 0; side < 2; side++ {
		for facing := 0; facing < 8; facing++ {
			s := initial()
			i := side * 9
			p := &s.Players[i]
			s.Controlled[side] = i
			s.Controlled[1-side] = (1-side)*9 + 8
			p.X, p.Z = 0, 0
			p.Action = 1
			p.keeperBlock = true
			p.FX = math.Round(math.Cos(float64(facing) * math.Pi / 4))
			p.FZ = math.Round(math.Sin(float64(facing) * math.Pi / 4))
			s.Ball = Ball{X: 0, Z: 0, H: .75, VX: 1, VZ: 1, Owner: -1, LastTouch: (1-side)*9 + 8}
			s.catchBall()
			dir := float64(expected[side][facing]) * math.Pi / 4
			if s.Ball.Owner != -1 || s.Ball.LastTouch != (1-side)*9+8 || s.Ball.VX != math.Round(math.Cos(dir))*8*velocityUnit || s.Ball.VZ != math.Round(math.Sin(dir))*8*velocityUnit || s.Ball.FlightKind != 2 || s.Ball.SpeedTimer != 29 || s.Event.Kind != 17 {
				t.Fatalf("side %d facing %d: %+v", side, facing, s.Ball)
			}
		}
	}
}
func TestKeeperCatchAndBlockExclusions(t *testing.T) {
	s := initial()
	p := &s.Players[0]
	s.Controlled[0] = 0
	p.X, p.Z = 0, 0
	p.FX, p.FZ = 0, 1
	s.Ball = Ball{H: .75, Owner: -1, LastTouch: 17}
	s.catchBall()
	if s.Ball.Owner != 0 {
		t.Fatal("standing keeper did not catch")
	}
	p.Action = 1
	p.keeperBlock = true
	s.Ball.Owner = -1
	s.Ball.FlightKind = 2
	s.Ball.FlightStage = 3
	s.catchBall()
	if s.Ball.Owner != -1 {
		t.Fatal("blocked high ball")
	}
	s.Ball.FlightStage = 1
	s.Ball.Electric = 1
	s.Ball.ElectricBudget = 1
	s.Ball.LastTouch = 17
	s.catchBall()
	if p.Health >= 100 || s.Ball.Owner != -1 || s.Ball.Electric != 0 {
		t.Fatal("electric block did not injure")
	}
}
