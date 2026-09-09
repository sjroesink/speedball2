package main

import (
	"math"
	"testing"
)

func TestSelectedGoaliePosition(t *testing.T) {
	const u = 22.4 / 576
	for _, c := range []struct {
		x, y, dir    int
		held         bool
		wantX, wantY int
	}{
		{200, 1050, 4, false, 236, 1085}, {440, 1050, 4, false, 380, 1085},
		{400, 980, 4, false, 330, 1050}, {320, 1000, 4, false, 320, 1060},
		{320, 1080, 4, false, 320, 1100}, {320, 1080, 3, false, 340, 1100},
		{320, 1080, 3, true, 330, 1100}, {320, 576, 4, false, 320, 960},
	} {
		s := initial()
		x, z := float64(576-c.y)*u, float64(c.x-320)*u
		fx, fz := math.Round(math.Cos(float64(c.dir)*math.Pi/4)), math.Round(math.Sin(float64(c.dir)*math.Pi/4))
		if c.held {
			s.Ball.Owner = 16
			s.Players[16].X, s.Players[16].Z, s.Players[16].FX, s.Players[16].FZ = x, z, fx, fz
		} else {
			s.Ball.X, s.Ball.Z, s.Ball.DirX, s.Ball.DirZ = x, z, fx, fz
		}
		tx, tz := s.goaliePosition(0, true)
		got := [2]int{int(math.Round(tz/u + 320)), int(math.Round(576 - tx/u))}
		if got != [2]int{c.wantX, c.wantY} {
			t.Fatal(c, got)
		}
	}
	s := initial()
	s.Period = 2
	s.Ball.X, s.Ball.Z, s.Ball.DirX, s.Ball.DirZ = 504*u, 0, 1, 1
	tx, tz := s.goaliePosition(0, true)
	if int(math.Round(tz/u+320)) != 340 || int(math.Round(576-tx/u)) != 52 {
		t.Fatal("switched ends", tx, tz)
	}
}

func TestGoaliePositioning(t *testing.T) {
	s := initial()
	u := 22.4 / 576
	place := func(x, y int) { s.Ball.X = float64(576-y) * u; s.Ball.Z = float64(x-320) * u }
	check := func(x, y int) {
		t.Helper()
		a, b := s.goalieTarget(0)
		got := [2]int{int(math.Round(b/u + 320)), int(math.Round(576 - a/u))}
		if got != [2]int{x, y} {
			t.Fatalf("got %v want %d,%d", got, x, y)
		}
	}
	place(200, 1000)
	check(304, 1104)
	place(440, 1000)
	check(336, 1104)
	place(200, 576)
	check(320, 1104)
	s.Period = 2
	place(200, 152)
	check(304, 48)
	s.Period = 1
	place(320, 1080)
	s.Ball.DirX = -1
	s.Ball.DirZ = 1
	check(344, 1104)
	s.Ball.Owner = 17
	p := &s.Players[17]
	p.X = s.Ball.X
	p.Z = s.Ball.Z
	p.FX = -1
	p.FZ = 1
	check(332, 1104)
	p.Action = 3
	check(344, 1104)
	s = initial()
	place(300, 1000)
	s.Ball.VZ = 8 * 25 * u
	check(308, 1104)
	s.Players[0].Stats[7] = 150
	check(316, 1104)
	s.Players[0].Stats[7] = 200
	check(332, 1104)
	s.Players[0].Stats[7] = 250
	check(332, 1104)
}
