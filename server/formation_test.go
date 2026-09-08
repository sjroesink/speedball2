package main

import (
	"math"
	"testing"
)

func TestLaunchFormationAndRestarts(t *testing.T) {
	s := initial()
	expected := [18][2]int{{320, 1104}, {213, 992}, {426, 992}, {213, 768}, {426, 768}, {320, 800}, {106, 576}, {426, 576}, {320, 640}, {320, 48}, {426, 160}, {213, 160}, {426, 384}, {213, 384}, {320, 352}, {533, 576}, {213, 576}, {320, 512}}
	check := func(swapped bool) {
		t.Helper()
		for i, p := range s.Players {
			j := i
			if swapped {
				j = (i + 9) % 18
			}
			got := [2]int{int(math.Round(p.Z/(22.4/576) + 320)), int(math.Round(576 - p.X/(22.4/576)))}
			if got != expected[j] {
				t.Fatalf("player %d: %v, want %v", i, got, expected[j])
			}
		}
	}
	check(false)
	s.selectPlayers()
	if s.Controlled != [2]int{8, 17} {
		t.Fatal(s.Controlled)
	}
	s.Tick = 1
	s.Players[3].Health = 63
	s.Players[3].Stats[0] = 180
	for i := range s.Players {
		s.Players[i].X = 0
		s.Players[i].Z = 0
	}
	s.resetPitch()
	check(false)
	s.Period = 2
	s.resetPitch()
	check(true)
	if s.Players[3].Health != 63 || s.Players[3].Stats[0] != 180 || s.Players[0].FX != -1 || s.Players[9].FX != 1 {
		t.Fatal("restart lost player state or orientation")
	}
}
