package main

import "testing"

func TestPickupPursuit(t *testing.T) {
	const u = 22.4 / 576
	s := initial()
	var d [18]int
	for i := range d {
		d[i] = 32
	}
	s.Players[7].X, s.Players[7].Z = -32*u, 0
	s.Ball.X, s.Ball.Z, s.Ball.VX, s.Ball.VZ, s.Ball.Owner = 0, 0, 0, 0, -1
	for i := range s.Pickups {
		s.Pickups[i].Wait = 100
	}
	s.Pickups[2].X, s.Pickups[2].Z, s.Pickups[2].Wait = 8*u, 0, 0
	s.Pickups[6].X, s.Pickups[6].Z, s.Pickups[6].Wait = 24*u, 0, 0
	check := func(want float64) {
		t.Helper()
		_, x, _ := s.pursuit(7, 255, &d, false)
		if x != want {
			t.Fatal("pickup", x, want)
		}
	}
	check(24 * u)
	s.Pickups[0].X, s.Pickups[0].Z, s.Pickups[0].Wait = 16*u, 0, 0
	check(16 * u)
	s.Pickups[0].X = 64 * u
	check(0)
	s.Pickups[0].X = 200 * u
	check(24 * u)
	s.Players[7].X = 200 * u
	a, x, _ := s.pursuit(7, 0, &d, false)
	if x != 0 || a.attack {
		t.Fatal("offscreen pursuit")
	}
}

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

func TestPursuitCollectedArmour(t *testing.T) {
	const u = 22.4 / 576
	s := initial()
	var d [18]int
	for i := range d {
		d[i] = 32
	}
	s.Players[7].X, s.Players[7].Z = -32*u, 0
	s.Ball.X, s.Ball.Z, s.Ball.VX, s.Ball.VZ, s.Ball.Owner = 0, 0, 0, 0, -1
	for i := range s.Pickups {
		s.Pickups[i].Wait = 100
	}
	s.Pickups[6].Kind, s.Pickups[6].Wait, s.Pickups[6].X, s.Pickups[6].Z = 14, 0, 24*u, 0
	s.Pickups[2].Kind, s.Pickups[2].Wait, s.Pickups[2].X, s.Pickups[2].Z = 13, 0, 8*u, 0
	_, x, _ := s.pursuit(7, 255, &d, false)
	if x != 24*u {
		t.Fatal("live armour priority", x)
	}
	s.pickup(16, 14)
	_, x, _ = s.pursuit(7, 255, &d, false)
	if x != 8*u {
		t.Fatal("collected armour hides next coin", x)
	}
}
