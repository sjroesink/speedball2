package main

import (
	"math"
	"testing"
)

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
