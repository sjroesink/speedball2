package main

import (
	"math"
	"testing"
)

func boundaryState(x, z, vx, vz float64) State {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	s.Ball = Ball{X: x, Z: z, VX: vx, VZ: vz, H: .75, Owner: -1, LastTouch: 7, SpeedTimer: 100}
	return s
}
func TestExactGoalBoundaries(t *testing.T) {
	const u = 22.4 / 576
	for _, side := range []float64{-1, 1} {
		for _, width := range []float64{-49, -48, 48, 49} {
			s := boundaryState(side*545*u, width*u, side*8*velocityUnit, 0)
			s.step(simulationStep, [2]Input{})
			team := 0
			if side < 0 {
				team = 1
			}
			want := 0
			if math.Abs(width) == 48 {
				want = 10
			}
			if s.Score[team] != want {
				t.Fatal(side, width, s.Score)
			}
		}
	}
	for _, v := range []float64{-8, 0} {
		s := boundaryState(545*u, 0, v*velocityUnit, 0)
		s.step(simulationStep, [2]Input{})
		if s.Score != [2]int{} {
			t.Fatal("inward goal")
		}
	}
	s := boundaryState(pitchX, 0, 8*velocityUnit, 0)
	s.step(simulationStep, [2]Input{})
	if s.Score[0] != 0 {
		t.Fatal("goal on boundary")
	}
	s.step(simulationStep, [2]Input{})
	if s.Score[0] != 10 {
		t.Fatal("no goal after crossing")
	}
}
func TestWallClipsBeforeMoving(t *testing.T) {
	s := boundaryState(0, 12.5, 0, 8*velocityUnit)
	s.step(simulationStep, [2]Input{})
	if math.Abs(s.Ball.Z-(pitchZ-8*velocityUnit*simulationStep)) > 1e-9 {
		t.Fatal(s.Ball)
	}
	s = boundaryState(23, 3, 8*velocityUnit, 0)
	s.step(simulationStep, [2]Input{})
	if math.Abs(s.Ball.X-(pitchX-8*velocityUnit*simulationStep)) > 1e-9 {
		t.Fatal(s.Ball)
	}
}
