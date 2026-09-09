package main

import "testing"

func TestThrowerIdentityAtWindup(t *testing.T) {
	for team := 0; team < 2; team++ {
		s := initial()
		catcher, thrower := team*9+7, (1-team)*9+7
		for i := range s.Players {
			s.Players[i].X, s.Players[i].Z, s.Players[i].Stun = 20, 10, 100
		}
		p := &s.Players[catcher]
		p.X, p.Z, p.Stun = 0, 0, 0
		s.Controlled[team] = catcher
		s.Ball = Ball{X: .1, H: .75, VX: 1, Owner: -1, LastTouch: thrower}
		s.catchBall()
		if s.Ball.Owner != catcher || s.Ball.LastTouch != thrower {
			t.Fatal("catch changed thrower", s.Ball)
		}
		for n := 0; n < 5 && p.Action != 3; n++ {
			inputs := [2]Input{}
			inputs[team].Shoot = true
			s.simulate(.04, inputs, [2]bool{true, true})
		}
		if p.Action != 3 || s.Ball.Owner != catcher || s.Ball.LastTouch != catcher {
			t.Fatal("windup identity", s.Ball, p.Action)
		}
	}
}
