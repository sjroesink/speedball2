package main

import "testing"

func TestPoseDistanceOrigins(t *testing.T) {
	p := Player{physicalSprite: 73}
	if got := playerPointDistance(&p, 28*terrainUnit, 0); got != 16 {
		t.Fatal(got)
	}
	p.physicalSprite = 94
	if got := playerPointDistance(&p, 28*terrainUnit, 0); got != 32 {
		t.Fatal(got)
	}
	p.physicalSprite = 56
	if got := playerPointDistance(&p, 0, 20*terrainUnit); got != 20 {
		t.Fatal(got)
	}
	p = Player{Team: 0, physicalSprite: 48}
	q := Player{Team: 1, Z: 20 * terrainUnit}
	if opponentDistance(&p, &q) != 18 || opponentDistance(&q, &p) != 18 {
		t.Fatal("asymmetric cache")
	}
	p.Team, q.Team = 1, 0
	if opponentDistance(&p, &q) != 20 {
		t.Fatal("query horizontal origin was included")
	}
}

func TestPoseAdjustedJumpCatch(t *testing.T) {
	for _, distance := range []int{28, 29} {
		s := initial()
		s.Controlled[0] = 7
		p := &s.Players[7]
		p.X, p.Z, p.Action, p.ActionTime, p.jumping, p.physicalSprite = 0, 0, 2, .3, true, 73
		s.Ball = Ball{Owner: -1, X: float64(distance) * terrainUnit, H: .2, LastTouch: -1}
		s.catchBallAt(7, nil)
		expected := -1
		if distance == 28 {
			expected = 7
		}
		if s.Ball.Owner != expected {
			t.Fatalf("distance %d owner %d", distance, s.Ball.Owner)
		}
	}
}
