package main

import "testing"

func TestElectroRectangleRelaunchAndBudget(t *testing.T) {
	for _, center := range [][2]int{{20, 880}, {620, 272}} {
		for _, dy := range []int{-15, 0, 15} {
			s := initial()
			s.Multiplier = 2
			s.throw(7, false)
			dz := 15
			if center[0] == 620 {
				dz = -15
			}
			s.Ball.X = float64(576-center[1]-dy) * terrainUnit
			s.Ball.Z = float64(center[0]+dz-320) * terrainUnit
			expectedX := 0.
			if dy < 0 {
				expectedX = 8 * velocityUnit
			}
			if dy > 0 {
				expectedX = -8 * velocityUnit
			}
			expectedZ := 8 * velocityUnit
			if dz < 0 {
				expectedZ = -8 * velocityUnit
			}
			if !s.sideFeature() || s.Ball.VX != expectedX || s.Ball.VZ != expectedZ || s.Ball.Electric != 3 || s.Ball.SpeedTimer != 50 {
				t.Fatal("electro relaunch", center, dy, s.Ball)
			}
		}
	}
	s := initial()
	s.Multiplier = 1
	s.throw(7, false)
	s.Multiplier = 2
	s.Ball.X = 304 * terrainUnit
	s.Ball.Z = 11.3
	s.sideFeature()
	if s.Ball.Electric != 2 {
		t.Fatal("budget must be set at throw time")
	}
	s.Ball.ElectricBudget = 1
	s.Ball.X = 304 * terrainUnit
	s.Ball.Z = 11.3
	s.sideFeature()
	if s.Ball.Electric != 1 {
		t.Fatal("bounce must not replenish spent hits")
	}
}
