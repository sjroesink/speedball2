package main

import (
	"math"
	"testing"
)

func TestWallHeightInsets(t *testing.T) {
	for _, axis := range []string{"x", "z"} {
		for _, sign := range []float64{-1, 1} {
			for _, high := range []bool{false, true} {
				for _, beyond := range []bool{false, true} {
					s := initial()
					for i := range s.Players {
						s.Players[i].Stun = 100
					}
					center := 320.
					if axis == "x" {
						center = 576
					}
					inset := 32.
					stage, index := 1, 0
					if high {
						inset = 24
						stage, index = 3, 8
					}
					position := (center - 28) * terrainUnit
					if beyond {
						position = (center - 20) * terrainUnit
					}
					s.Ball = Ball{Owner: -1, LastTouch: -1, Z: 4, H: .25 + float64(stage)*.5, FlightKind: 2, FlightStage: stage, FlightIndex: index, SpeedTimer: 100}
					if axis == "x" {
						s.Ball.X = sign * position
						s.Ball.VX = sign * 8 * velocityUnit
					} else {
						s.Ball.Z = sign * position
						s.Ball.VZ = sign * 8 * velocityUnit
					}
					s.simulate(.04, [2]Input{}, [2]bool{true, true})
					value, velocity := s.Ball.Z, s.Ball.VZ
					if axis == "x" {
						value, velocity = s.Ball.X, s.Ball.VX
					}
					reflected := !high || beyond
					expected := sign * position
					expectedSign := sign
					if reflected {
						expected = sign * (center - inset) * terrainUnit
						expectedSign = -sign
					}
					if math.Copysign(1, velocity) != expectedSign || math.Abs(value-(expected+velocity*.04)) > 1e-8 {
						t.Fatal(axis, sign, high, beyond, value, velocity)
					}
				}
			}
		}
	}
}

func TestFlightStageBeforeWallAndGoal(t *testing.T) {
	for _, rising := range []bool{false, true} {
		for _, axis := range []string{"x", "z"} {
			for _, sign := range []float64{-1, 1} {
				s := initial()
				for i := range s.Players {
					s.Players[i].Stun = 100
				}
				stage, index := 3, 41
				if rising {
					stage, index = 2, 4
				}
				center := 320.
				if axis == "x" {
					center = 576
				}
				s.Ball = Ball{Owner: -1, LastTouch: -1, H: .25 + float64(stage)*.5, FlightKind: 2, FlightStage: stage, FlightIndex: index, SpeedTimer: 100}
				if axis == "x" {
					s.Ball.X = sign * (center - 28) * terrainUnit
					s.Ball.VX = sign * 8 * velocityUnit
				} else {
					s.Ball.Z = sign * (center - 28) * terrainUnit
					s.Ball.VZ = sign * 8 * velocityUnit
				}
				s.simulate(.04, [2]Input{}, [2]bool{true, true})
				if axis == "x" && !rising {
					scorer := 0
					if sign < 0 {
						scorer = 1
					}
					if s.Score[scorer] != 10 {
						t.Fatal("descending goal")
					}
				} else {
					expectedStage, expectedSign := 2, -sign
					if rising {
						expectedStage, expectedSign = 3, sign
					}
					velocity := s.Ball.VZ
					if axis == "x" {
						velocity = s.Ball.VX
					}
					if s.Score != [2]int{} || s.Ball.FlightStage != expectedStage || math.Copysign(1, velocity) != expectedSign {
						t.Fatal("transition", axis, sign, rising, s.Ball)
					}
				}
			}
		}
	}
}
