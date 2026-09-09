package main

import "testing"

func TestPossessionSelectionReference(t *testing.T) {
	for _, period := range []int{1, 2} {
		for team := 0; team < 2; team++ {
			for _, facing := range [][2]float64{{1, 0}, {-1, 0}, {0, 1}, {0, -1}} {
				s := initial()
				s.Period = period
				for i := range s.Players {
					s.Players[i].X, s.Players[i].Z = 20, 10
				}
				owner, a := team*9+7, (1-team)*9+6
				b := a + 1
				p := &s.Players[owner]
				p.X, p.Z, p.FX, p.FZ = 0, 0, facing[0], facing[1]
				advancePhysicalPose(p, owner, period, .04)
				ox, oz := physicalBallOffset(p, &s.Ball)
				s.Ball.Owner, s.Ball.X, s.Ball.Z = owner, ox, oz
				s.Players[a].X, s.Players[a].Z = 0, 0
				s.Players[b].X, s.Players[b].Z = ox, oz
				distances := s.possessionDistances()
				if distances[a] != 0 || distances[b] <= 0 {
					t.Fatal("carrier target", distances[a], distances[b])
				}
				s.selectPlayers()
				if s.Controlled[1-team] != a || s.Controlled[team] != owner {
					t.Fatal("held selection", s.Controlled)
				}
				s.Ball.Owner = -1
				s.selectPlayers()
				if s.Controlled[1-team] != b {
					t.Fatal("loose selection", s.Controlled)
				}
			}
		}
	}
}
func TestFallenNearestSelection(t *testing.T) {
	for team := 0; team < 2; team++ {
		s := initial()
		for i := range s.Players {
			s.Players[i].X, s.Players[i].Z = 20, 10
		}
		a := team*9 + 7
		b := a + 1
		s.Ball.Owner, s.Ball.X, s.Ball.Z = -1, 0, 0
		s.Players[a].X, s.Players[a].Z, s.Players[a].Stun, s.Players[a].Action = 0, 0, .5, 4
		s.Players[b].X, s.Players[b].Z = 2, 0
		s.selectPlayers()
		if s.Controlled[team] != a {
			t.Fatal("fallen selection", s.Controlled)
		}
		s.Players[b].X = 0
		s.selectPlayers()
		if s.Controlled[team] != b {
			t.Fatal("tie selection", s.Controlled)
		}
	}
}
