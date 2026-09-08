package main

import "testing"

func TestWarpOriginalLatitudeAndBoundaryRules(t *testing.T) {
	for _, y := range []int{355, 370, 385, 767, 782, 797} {
		for _, x := range []int{31, 609} {
			s := initial()
			s.Ball = Ball{Owner: -1, LastTouch: 7, X: float64(576-y) * terrainUnit, Z: float64(x-320) * terrainUnit, H: 1.25, FlightKind: 2, FlightStage: 2, DirX: 1, VX: 2, VZ: 3}
			s.Players[7].Stats[4] = 200
			expected := 11.2
			if x == 609 {
				expected = -11.2
			}
			if !s.sideFeature() || s.Ball.Z != expected || s.Ball.VX != 8*velocityUnit || s.Ball.VZ != 3 || s.Ball.SpeedTimer != 100 || s.Ball.FlightStage != 2 {
				t.Fatal("warp endpoints/drift", x, y, s.Ball)
			}
		}
	}
	for _, y := range []int{354, 386, 766, 798} {
		s := initial()
		s.Ball = Ball{Owner: -1, X: float64(576-y) * terrainUnit, Z: -11.3, H: 1}
		if s.sideFeature() {
			t.Fatal("outside latitude warped", y)
		}
	}
	for _, change := range []func(*Ball){func(b *Ball) { b.Z = -11.2 }, func(b *Ball) { b.Z = 11.2 }, func(b *Ball) { b.Owner = 7 }, func(b *Ball) { b.FlightKind = 2; b.FlightStage = 3 }, func(b *Ball) { b.H = 1.3 }} {
		s := initial()
		s.Ball = Ball{Owner: -1, X: 206 * terrainUnit, Z: -11.3, H: 1}
		change(&s.Ball)
		if s.sideFeature() {
			t.Fatal("ineligible warp")
		}
	}
}
