package main

import "testing"

func fallingEncounter(action int, resolved bool) State {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p, q := &s.Players[16], &s.Players[7]
	p.X, p.Z, p.FX, p.FZ, p.Stun, p.Action, p.ActionTime = .5, 0, 1, 0, 0, 1, .3
	q.X, q.Z, q.FX, q.FZ, q.Stun, q.Action, q.ActionTime = 0, 0, 1, 0, 0, action, .3
	q.tackleResolved = resolved
	s.Ball.Owner, s.Ball.X, s.Ball.Z, s.Ball.H = 7, 0, 0, 1
	s.RNG = [2]uint32{}
	return s
}
func TestFallingTackleRelease(t *testing.T) {
	for _, action := range []int{1, 7} {
		s := fallingEncounter(action, false)
		s.simulate(.04, [2]Input{}, [2]bool{true, true})
		hits, signals := []int{}, []int{}
		for _, e := range s.Events[:s.EventCount] {
			if e.Kind == 4 {
				hits = append(hits, e.Actor)
			}
			if e.Kind == 24 || e.Kind == 25 {
				signals = append(signals, e.Actor)
			}
		}
		if len(hits) != 2 || hits[0] != 16 || hits[1] != 7 {
			t.Fatal("counter order", hits)
		}
		if s.Ball.Owner != -1 || s.Ball.LastTouch != 16 || s.Ball.VX != 0 || s.Ball.VZ != 0 || s.Ball.X != .5 || s.Ball.VH > 0 {
			t.Fatal("released ball", s.Ball)
		}
		speed := 3 * velocityUnit
		if action == 1 {
			speed = 4 * velocityUnit
		}
		if s.Players[16].FX != -1 || s.Players[16].fallX != -speed {
			t.Fatal("reverse impact")
		}
		if len(signals) != 1 || signals[0] != 16 {
			t.Fatal("falling player stole possession", signals)
		}
		id := s.Event.ID
		s.simulate(.04, [2]Input{}, [2]bool{true, true})
		if s.Event.ID != id {
			t.Fatal("repeated counter")
		}
	}
}
func TestOrdinaryFallsCannotCounter(t *testing.T) {
	for _, c := range []struct {
		action   int
		resolved bool
	}{{0, false}, {2, false}, {3, false}, {6, false}, {1, true}, {7, true}} {
		s := fallingEncounter(c.action, c.resolved)
		s.simulate(.04, [2]Input{}, [2]bool{true, true})
		if s.Players[7].fallAttack != 0 || s.Players[16].Stun != 0 || s.Ball.Owner != 16 {
			t.Fatal(c, "unexpected counter")
		}
	}
}

func TestRetainedFallRecoveryTail(t *testing.T) {
	for _, attack := range []int{1, 7} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 100
			s.Players[i].X = 20
			s.Players[i].Z = 10
		}
		p := &s.Players[7]
		p.X, p.Z, p.Stun, p.Action, p.ActionTime = 0, 0, 1.04, 4, 1.04
		p.fallAttack, p.fallAttackTime, p.fallFinishing = attack, .32, attack == 7
		for i := 0; i < 7; i++ {
			s.simulate(.04, [2]Input{}, [2]bool{true, true})
		}
		if p.ActionTime != .44 || p.fallAttack != 0 {
			t.Fatal("recovery tail", attack, p.ActionTime, p.fallAttack)
		}
		for i := 0; i < 11; i++ {
			s.simulate(.04, [2]Input{}, [2]bool{true, true})
		}
		if p.Stun != 0 || p.Action == 4 {
			t.Fatal("still falling", attack)
		}
	}
}
