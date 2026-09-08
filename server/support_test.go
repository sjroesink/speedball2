package main

import (
	"math"
	"testing"
)

func TestSupportTargets(t *testing.T) {
	s := initial()
	s.Controlled[0] = 8
	place := func(i, x, y int) {
		s.Players[i].X = float64(576-y) * (22.4 / 576)
		s.Players[i].Z = float64(x-320) * (22.4 / 576)
	}
	check := func(i, x, y int) {
		t.Helper()
		a, b := s.supportTarget(i)
		got := [2]int{int(math.Round(b/(22.4/576) + 320)), int(math.Round(576 - a/(22.4/576)))}
		if got != [2]int{x, y} {
			t.Fatalf("player %d target %v, want %d,%d", i, got, x, y)
		}
	}
	check(1, 248, 1032)
	place(8, 80, 80)
	check(1, 248, 1032)
	place(8, 320, 200)
	check(3, 136, 384)
	place(8, 120, 800)
	check(3, 120, 768)
	place(8, 160, 96)
	check(6, 213, 208)
	s.Period = 2
	place(8, 479, 1055)
	check(6, 426, 943)
}
