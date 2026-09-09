package main

import (
	"reflect"
	"testing"
)

func TestTackleAudio(t *testing.T) {
	for team := 0; team < 2; team++ {
		for _, success := range []bool{false, true} {
			for _, carrying := range []bool{false, true} {
				s := initial()
				i, j := team*9+7, (1-team)*9+7
				for n := range s.Players {
					s.Players[n].Stun = 100
					s.Players[n].X, s.Players[n].Z, s.Players[n].aiWait = -20, -10, 100
				}
				p, q := &s.Players[i], &s.Players[j]
				p.X, p.Z, p.Stun, p.Action, p.ActionTime, p.FX, p.FZ = 0, 0, 0, 7, .16, 1, 0
				q.X, q.Z, q.Stun, q.FX, q.FZ = .5, 0, 0, 1, 0
				s.Ball.Owner, s.Ball.X, s.Ball.Z = -1, 10, 10
				if carrying {
					s.Ball.Owner = j
				}
				s.RNG = [2]uint32{65535, 65535}
				if success {
					s.RNG = [2]uint32{}
				}
				s.simulate(.04, [2]Input{}, [2]bool{true, true})
				expected := []int{29}
				if success {
					expected = append(expected, 4)
					if carrying {
						expected = append(expected, 24+team)
					}
				}
				actual := []int{}
				for _, e := range s.Events[:s.EventCount] {
					actual = append(actual, e.Kind)
				}
				if !reflect.DeepEqual(actual, expected) {
					t.Fatal(team, success, carrying, actual, expected)
				}
				id := s.Event.ID
				s.simulate(.04, [2]Input{}, [2]bool{true, true})
				if s.Event.ID != id {
					t.Fatal("resolved contact repeated")
				}
			}
		}
	}
}
