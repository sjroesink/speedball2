package main

import "testing"

func TestHardwareUsesTickStartPosition(t *testing.T) {
	for _, warp := range []bool{true, false} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 100
		}
		s.Ball = Ball{X: 48 * (22.4 / 576), Z: -11.1, H: 1, VZ: -8, Owner: -1, LastTouch: 7, SpeedTimer: 100}
		if warp {
			s.Ball.X = 8
			s.Ball.Z = 11.1
			s.Ball.VZ = 8
		}
		s.step(simulationStep, [2]Input{})
		if s.Score[0] != 0 || warp && s.Ball.Z <= 11.2 || !warp && s.Ball.Z >= -11.2 {
			t.Fatal("premature contact")
		}
		s.step(simulationStep, [2]Input{})
		if warp {
			if s.Ball.Z >= 0 || s.Event.Kind != 12 {
				t.Fatal("missing warp")
			}
		} else if s.Score[0] != 2 {
			t.Fatal("missing star")
		}
	}
}
