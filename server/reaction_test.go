package main

import "testing"

func TestAIReactionAndTargetPersistence(t *testing.T) {
	expected := [16]int{16, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 9, 8}
	for i, n := range expected {
		if aiReactionTime(100+i*10) != float64(n)/25 {
			t.Fatal("reaction table", i)
		}
	}
	for _, intelligence := range []int{100, 250} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 100
		}
		p := &s.Players[7]
		p.X, p.Z, p.Stun = 0, 0, 0
		p.Stats[7] = intelligence
		s.Ball.X, s.Ball.H = 5, 4
		s.simulate(.04, [2]Input{}, [2]bool{})
		if p.aiX != 5 {
			t.Fatal("first target")
		}
		s.Ball.X = -5
		ticks := 16
		if intelligence == 250 {
			ticks = 8
		}
		for n := 1; n < ticks; n++ {
			s.simulate(.04, [2]Input{}, [2]bool{})
		}
		if p.aiX != 5 {
			t.Fatal("retargeted before timer")
		}
		s.simulate(.04, [2]Input{}, [2]bool{})
		if p.aiX != -5 {
			t.Fatal("did not retarget")
		}
	}
}
func TestBusyAIWaitsForAction(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p := &s.Players[7]
	p.X, p.Z, p.Stun = 0, 0, 0
	p.Action = 3
	p.ActionTime = .2
	p.aiX = 2
	p.aiTarget = true
	s.Ball.X, s.Ball.H = 5, 4
	s.simulate(.04, [2]Input{}, [2]bool{})
	if p.aiX != 2 {
		t.Fatal("busy decision")
	}
	for n := 0; n < 5; n++ {
		s.simulate(.04, [2]Input{}, [2]bool{})
	}
	if p.aiX != 5 {
		t.Fatal("missing decision after action")
	}
}
