package main

import (
	"math"
	"testing"
)

func TestOriginalPrediction(t *testing.T) {
	const u = 22.4 / 576
	for _, c := range []struct {
		intelligence int
		expected     float64
	}{{100, 8}, {149, 8}, {150, 16}, {199, 16}, {200, 32}, {255, 32}} {
		x, z := predictedTarget(0, 0, 8*u*25, -3*u*25, c.intelligence)
		if math.Abs(x/u-c.expected) > 1e-9 || math.Abs(z/u+c.expected*3/8) > 1e-9 {
			t.Fatalf("intelligence %d: %v,%v", c.intelligence, x/u, z/u)
		}
	}
	for _, sign := range []float64{-1, 1} {
		x, z := predictedTarget(sign*540*u, sign*284*u, sign*8*u*25, sign*8*u*25, 200)
		if math.Abs(x/u-sign*516) > 1e-9 || math.Abs(z/u-sign*260) > 1e-9 {
			t.Fatalf("corner: %v,%v", x/u, z/u)
		}
		x, z = predictedTarget(sign*544*u, sign*288*u, 0, 0, 100)
		if math.Abs(x/u-sign*544) > 1e-9 || math.Abs(z/u-sign*288) > 1e-9 {
			t.Fatalf("stationary wall: %v,%v", x/u, z/u)
		}
	}
}

func TestOriginalTargetSteering(t *testing.T) {
	const u = 22.4 / 576
	cases := []struct {
		x, z   float64
		fresh  bool
		vx, vz float64
	}{{40, 20, false, 1, 0}, {40, 21, false, 1, 1}, {40, -20, false, 1, 0}, {40, -21, false, 1, -1}, {20, 40, false, 0, 1}, {32, 4, true, 1, 0}, {32, 4, false, 1, 1}, {33, 4, false, 1, 0}, {3, 20, false, 0, 1}, {4, 4, false, 1, 1}, {-3, -3, false, 0, 0}}
	for _, c := range cases {
		p := Player{}
		x, z := steerToTarget(&p, c.x*u, c.z*u, c.fresh)
		if x != c.vx || z != c.vz {
			t.Fatalf("%+v -> %v,%v", c, x, z)
		}
	}
	p := Player{}
	steerToTarget(&p, 3*u, 20*u, false)
	if p.X != 3*u || p.Z != 0 {
		t.Fatal("axis arrival")
	}
	p = Player{}
	steerToTarget(&p, 4*u, 4*u, false)
	if p.X != 0 || p.Z != 0 {
		t.Fatal("snapped at inclusive boundary")
	}
}
