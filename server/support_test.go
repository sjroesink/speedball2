package main

import (
	"math"
	"testing"
)

func TestSupportAggression(t *testing.T) {
	s := initial()
	s.logicalView = [2]int{0, 484}
	place := func(i, x, y int) {
		s.Players[i].X = float64(576-y) * (22.4 / 576)
		s.Players[i].Z = float64(x-320) * (22.4 / 576)
	}
	place(3, 120, 576)
	for j := 9; j < 18; j++ {
		place(j, 600, 1000)
	}
	place(9, 160, 576)
	place(10, 180, 576)
	var distances [18]int
	for j := range distances {
		distances[j] = 999
	}
	distances[9], distances[10] = 100, 100
	check := func(random, want int) {
		t.Helper()
		x, z, ok := s.aggressionTarget(3, &distances, random)
		if want < 0 {
			if ok {
				t.Fatal("unexpected aggressive target")
			}
			return
		}
		if !ok || math.Abs(x-s.Players[want].X) > 1e-9 || math.Abs(z-s.Players[want].Z) > 1e-9 {
			t.Fatalf("target %v,%v,%v, want player %d", x, z, ok, want)
		}
	}
	check(49, 9)
	check(50, -1)
	distances[9] = 101
	check(49, 10)
	distances[9], distances[10] = 200, 200
	check(49, -1)
	distances[9] = 100
	s.Players[9].Stun = 1
	check(49, -1)
	s.Players[9].Stun = 0
	place(9, 213, 576)
	check(49, 9)
	s.Players[9].moveZ = (22.4 / 576) * 25
	check(49, -1)
	s.Players[9].moveZ = 0
	s.logicalView = [2]int{320, 484}
	check(49, -1)
}

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
