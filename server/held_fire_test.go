package main

import "testing"

func TestHeldFireDuringCatch(t *testing.T) {
	for team := 0; team < 2; team++ {
		for _, hold := range []bool{false, true} {
			s := initial()
			for i := range s.Players {
				s.Players[i].X, s.Players[i].Z, s.Players[i].Stun = 20, 10, 100
			}
			i := team*9 + 7
			p := &s.Players[i]
			p.X, p.Z, p.Stun, p.Action, p.ActionTime, p.FX, p.FZ = 0, 0, 0, 6, 3./25, 1, 0
			s.Ball.X, s.Ball.Z, s.Ball.H, s.Ball.Owner = 1, 0, 4, i
			windups := map[uint32]bool{}
			for n := 0; n < 9; n++ {
				input := [2]Input{}
				input[team].Shoot = n == 0 || hold
				s.simulate(.04, input, [2]bool{true, true})
				for _, e := range s.Events[:s.EventCount] {
					if e.Kind == 30 {
						windups[uint32(e.ID)] = true
					}
				}
			}
			if hold {
				if len(windups) != 1 || s.Ball.Owner != -1 || s.Ball.FlightKind != 2 || s.pendingShoot[team] {
					t.Fatal("held catch throw", team, windups, s.Ball)
				}
			} else {
				if len(windups) != 0 || s.Ball.Owner != i {
					t.Fatal("released input was retained", team, windups)
				}
			}
		}
	}
}
func TestHeldPunchDoesNotRepeat(t *testing.T) {
	for team := 0; team < 2; team++ {
		s := initial()
		for i := range s.Players {
			s.Players[i].X, s.Players[i].Z, s.Players[i].Stun = 20, 10, 100
		}
		p := &s.Players[team*9+7]
		p.X, p.Z, p.Stun = 0, 0, 0
		s.Ball.X, s.Ball.Z, s.Ball.H, s.Ball.Owner = 2, 0, .25, -1
		punches := map[uint32]bool{}
		for n := 0; n < 12; n++ {
			input := [2]Input{}
			input[team].Shoot = true
			s.simulate(.04, input, [2]bool{true, true})
			for _, e := range s.Events[:s.EventCount] {
				if e.Kind == 20 {
					punches[uint32(e.ID)] = true
				}
			}
		}
		if len(punches) != 1 {
			t.Fatal("held punch repeats", team, punches)
		}
		s.simulate(.04, [2]Input{}, [2]bool{true, true})
		input := [2]Input{}
		input[team].Shoot = true
		s.simulate(.04, input, [2]bool{true, true})
		found := false
		for _, e := range s.Events[:s.EventCount] {
			if e.Kind == 20 && !punches[uint32(e.ID)] {
				found = true
			}
		}
		if !found {
			t.Fatal("fresh press ignored", team)
		}
	}
}
