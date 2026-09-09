package main

import "testing"

func TestOpponentMovementBlocking(t *testing.T) {
	const unit = 22.4 / 576
	for _, tc := range [][4]int{{20, 0, 30, 1}, {20, 0, 31, 0}, {20, 10, 25, 1}, {20, 11, 25, 2}} {
		var players [18]Player
		players[0] = Player{Team: 0, Health: 100, moveX: 25 * unit, moveZ: 25 * unit}
		players[9] = Player{Team: 1, Health: 100, X: float64(tc[0]) * unit, Z: float64(tc[1]) * unit}
		var distances [18]int
		distances[9] = tc[2]
		blockPlayerMovement(&players, 0, &distances, 1./25)
		x, z := 0., 0.
		if tc[3] > 0 {
			x = -unit
		}
		if tc[3] > 1 {
			z = -unit
		}
		if players[0].X != x || players[0].Z != z {
			t.Fatal("blocked axes", tc, players[0])
		}
		if players[9].X != float64(tc[0])*unit {
			t.Fatal("pushed opponent")
		}
	}
}
func TestContactExclusions(t *testing.T) {
	const unit = 22.4 / 576
	for _, kind := range []string{"team", "fallen", "stationary", "retreat"} {
		var players [18]Player
		players[0] = Player{Team: 0, Health: 100, moveX: 25 * unit, moveZ: 25 * unit}
		players[9] = Player{Team: 1, Health: 100, X: 20 * unit}
		switch kind {
		case "team":
			players[9].Team = 0
		case "fallen":
			players[9].Stun = 1
		case "stationary":
			players[0].moveX = 0
			players[0].moveZ = 0
		case "retreat":
			players[0].moveX = -25 * unit
		}
		distances := contactDistances(&players)
		blockPlayerMovement(&players, 0, &distances[0], 1./25)
		if players[0].X != 0 || players[0].Z != 0 {
			t.Fatal("unexpected push", kind)
		}
	}
}
