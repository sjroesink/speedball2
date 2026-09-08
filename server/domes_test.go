package main

import "testing"

func TestBumperDirectionThresholdsAndSustain(t *testing.T) {
	for _, center := range []int{-256, 256} {
		for _, v := range [][4]int{{12, 0, 1, 0}, {-12, 0, -1, 0}, {0, 12, 0, 1}, {0, -12, 0, -1}, {10, 10, 1, 1}, {-10, 10, -1, 1}, {10, -10, 1, -1}, {-10, -10, -1, -1}, {12, 6, 1, 0}, {12, 7, 1, 1}, {6, 12, 0, 1}, {7, 12, 1, 1}} {
			s := initial()
			s.Ball = Ball{Owner: -1, LastTouch: 7, X: float64(center+v[0]) * terrainUnit, Z: float64(v[1]) * terrainUnit, H: .25, VX: 1, VZ: 2}
			s.Players[7].Stats[4] = 200
			s.domeBounce()
			if s.Ball.VX != float64(v[2])*8*velocityUnit || s.Ball.VZ != float64(v[3])*8*velocityUnit || s.Score[0] != 2 || s.Ball.SpeedTimer != 100 {
				t.Fatal("direction/score/sustain", center, v, s.Ball)
			}
		}
	}
}
func TestBumperEligibility(t *testing.T) {
	for _, change := range []func(*Ball){func(b *Ball) { b.Owner = 7 }, func(b *Ball) { b.H = 2 }, func(b *Ball) { b.FlightKind = 2; b.FlightStage = 3 }, func(b *Ball) { b.X = 256 * terrainUnit }, func(b *Ball) { b.X = 272 * terrainUnit; b.Z = 16 * terrainUnit }, func(b *Ball) { b.X = 273 * terrainUnit }} {
		s := initial()
		s.Ball = Ball{Owner: -1, LastTouch: 7, X: 268 * terrainUnit, H: .25, VX: -1}
		change(&s.Ball)
		s.domeBounce()
		if s.Score[0] != 0 {
			t.Fatal("ineligible bumper contact scored")
		}
	}
}
