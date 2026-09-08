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
