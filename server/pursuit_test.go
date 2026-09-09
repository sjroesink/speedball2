package main

import "testing"

func TestSelectedPursuitTarget(t *testing.T) {
	const u = 22.4 / 576
	s := initial()
	var d [18]int
	for i := range d {
		d[i] = 100
	}
	p, q := &s.Players[7], &s.Players[16]
	p.X, p.Z = 0, 0
	q.X, q.Z, q.moveX, q.moveZ = 128*u, 0, 0, 0
	s.Ball.X, s.Ball.Z, s.Ball.VX, s.Ball.VZ, s.Ball.Owner = -128*u, 0, 0, 0, -1
	d[16] = 50
	a, x, _ := s.pursuit(7, 49, &d, false)
	if x != 128*u || !a.attack {
		t.Fatal("aggressive pursuit")
	}
	a, x, _ = s.pursuit(7, 50, &d, false)
	if x != -128*u || a.attack {
		t.Fatal("aggression equality")
	}
	d[16] = 100
	_, x, _ = s.pursuit(7, 49, &d, false)
	if x != -128*u {
		t.Fatal("distance equality")
	}
	d[16] = 50
	q.Stun = 1
	_, x, _ = s.pursuit(7, 49, &d, false)
	if x != -128*u {
		t.Fatal("fallen opponent")
	}
	_, x, _ = s.pursuit(7, 255, &d, true)
	if x != 128*u {
		t.Fatal("multiplier target")
	}
	s.Ball.Owner = 16
	_, x, _ = s.pursuit(7, 255, &d, false)
	if x != 128*u {
		t.Fatal("carrier target")
	}
}
