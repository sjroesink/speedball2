package main

import "testing"

func catchFixture() State {
	s := initial()
	for i := range s.Players {
		s.Players[i].X = 10
		s.Players[i].Z = 8
	}
	s.Ball = Ball{Owner: -1, LastTouch: 7, H: .25}
	s.Controlled = [2]int{7, 16}
	return s
}
func TestCatchSelectedPlayerRangeAndOrder(t *testing.T) {
	for _, distance := range []int{16, 17} {
		s := catchFixture()
		s.Players[7].X = float64(distance) * terrainUnit
		s.Players[7].Z = 0
		s.catchBall()
		expected := -1
		if distance == 16 {
			expected = 7
		}
		if s.Ball.Owner != expected {
			t.Fatal("catch range", distance)
		}
	}
	s := catchFixture()
	s.Players[8].X = 0
	s.Players[8].Z = 0
	s.catchBall()
	if s.Ball.Owner != -1 {
		t.Fatal("unselected catcher")
	}
	s = catchFixture()
	s.Players[7].X = 0
	s.Players[7].Z = 0
	s.Players[16].X = 15 * terrainUnit
	s.Players[16].Z = 0
	s.catchBall()
	if s.Ball.Owner != 16 {
		t.Fatal("interleaved roster priority")
	}
}
func TestThrowerCannotCatchButOpponentCan(t *testing.T) {
	s := catchFixture()
	s.Players[7].X = 0
	s.Players[7].Z = 0
	s.Players[7].Action = 3
	s.Ball.Lock = .18
	s.catchBall()
	if s.Ball.Owner != -1 {
		t.Fatal("throwing player caught")
	}
	s.Players[16].X = 0
	s.Players[16].Z = 0
	s.catchBall()
	if s.Ball.Owner != 16 {
		t.Fatal("opponent blocked by global throw lock")
	}
}

func TestInterceptionCues(t *testing.T) {
	for _, period := range []int{1, 2} {
		for team := 0; team < 2; team++ {
			for _, friendly := range []bool{false, true} {
				for _, charged := range []bool{false, true} {
					s := catchFixture()
					s.Period = period
					i := team*9 + 7
					s.Players[i].X = 0
					s.Players[i].Z = 0
					throwTeam := 1 - team
					if friendly {
						throwTeam = team
					}
					s.Ball.LastTouch = throwTeam*9 + 6
					s.Ball.Charged = charged
					s.Ball.Electric = 0
					s.catchBall()
					if s.Ball.Owner != i {
						t.Fatal("catch owner")
					}
					count := 0
					for _, e := range s.Events[:s.EventCount] {
						if e.Kind == 24 || e.Kind == 25 {
							count++
							if e.Kind != 24+team {
								t.Fatal("team cue")
							}
						}
					}
					expected := 0
					if !friendly && !charged {
						expected = 1
					}
					if count != expected {
						t.Fatal("interception count", team, friendly, charged, count)
					}
				}
			}
		}
	}
}

func TestCatchImpactRequiresPlanarMotion(t *testing.T) {
	for _, velocity := range [][2]float64{{0, 0}, {1, 0}, {0, -1}} {
		for _, enemy := range []bool{false, true} {
			s := catchFixture()
			s.Players[7].X, s.Players[7].Z = 0, 0
			s.Ball.VX, s.Ball.VZ, s.Ball.VH = velocity[0], velocity[1], -1
			s.Ball.LastTouch = 6
			if enemy {
				s.Ball.LastTouch = 16
			}
			s.catchBall()
			if s.Ball.Owner != 7 {
				t.Fatal("catch failed")
			}
			impact, intercept := false, false
			for _, e := range s.Events[:s.EventCount] {
				impact = impact || e.Kind == 16
				intercept = intercept || e.Kind == 24
			}
			if impact != (velocity[0] != 0 || velocity[1] != 0) || intercept != enemy {
				t.Fatal("incorrect cues", velocity, enemy)
			}
		}
	}
}
