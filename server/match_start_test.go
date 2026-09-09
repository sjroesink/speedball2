package main

import "testing"

func TestPlayableMatchRoster(t *testing.T) {
	s := newMatch()
	if s.RestartPhase != 1 || s.Time != 90 {
		t.Fatal("kickoff")
	}
	for _, p := range s.Players {
		for j, v := range p.Stats {
			if v != 170 || p.BaseStats[j] != 170 {
				t.Fatal("roster attributes")
			}
		}
		if movementSpeed(&p, false, false) != 6*velocityUnit || movementSpeed(&p, true, false) != 5*velocityUnit {
			t.Fatal("match pace")
		}
	}
	for _, b := range s.Bench {
		for _, stats := range b {
			for _, v := range stats {
				if v != 170 {
					t.Fatal("reserve attributes")
				}
			}
		}
	}
	s.Players[7].Stats = defaultStats()
	s.pickup(7, 11)
	for _, v := range s.Players[7].Stats {
		if v != 170 {
			t.Fatal("full energy baseline")
		}
	}
}
