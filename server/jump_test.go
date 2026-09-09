package main

import "testing"

func TestJumpSelection(t *testing.T) {
	p := Player{Stats: defaultStats()}
	b := Ball{Owner: -1, FlightKind: 2, FlightStage: 3, H: 5}
	if !canJumpAtBall(&p, &b, 48, false) || canJumpAtBall(&p, &b, 49, false) {
		t.Fatal("base speed reach")
	}
	p.Stats[3] = 250
	if !canJumpAtBall(&p, &b, 72, false) || canJumpAtBall(&p, &b, 73, false) {
		t.Fatal("boosted speed reach")
	}
	if canJumpAtBall(&p, &b, 0, true) {
		t.Fatal("multiplier ball")
	}
	b.Owner = 9
	if canJumpAtBall(&p, &b, 0, false) {
		t.Fatal("held ball")
	}
	b.Owner = -1
	b.FlightStage = 2
	if canJumpAtBall(&p, &b, 0, false) {
		t.Fatal("low flight stage")
	}
}
