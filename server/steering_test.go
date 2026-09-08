package main

import "testing"

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
