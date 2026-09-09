package main

import "testing"

func TestGoalLastTouchAtBothEnds(t *testing.T) {
	for _, period := range []int{1, 2} {
		for _, sign := range []float64{-1, 1} {
			for _, touch := range []int{-1, 7, 16} {
				s := initial()
				s.Period = period
				s.Multiplier = 2
				for i := range s.Players {
					s.Players[i].Stun = 100
				}
				s.Ball = Ball{Owner: -1, LastTouch: touch, X: sign * 21.4, VX: sign * 8, H: .75, FlightKind: 1, FlightStage: 1, SpeedTimer: 100}
				s.simulate(.04, [2]Input{}, [2]bool{true, true})
				scorer := 0
				direction := 1.
				if period == 2 {
					direction = -1
				}
				if sign*direction < 0 {
					scorer = 1
				}
				points := 10
				if scorer == 0 {
					points = 20
				}
				if s.Score[scorer] != points || s.Score[1-scorer] != 0 || s.Event.Kind != 7 || s.Event.Target != touch || s.Event.Actor != scorer {
					t.Fatal(period, sign, touch, s.Score, s.Event)
				}
			}
		}
	}
}
