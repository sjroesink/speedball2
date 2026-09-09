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
					if reflected {
						expectedKind := 5
						if axis == "x" {
							expectedKind = 27
						}
						if high {
							if axis == "x" {
								expectedKind = 28
							} else {
								expectedKind = 26
							}
						}
						if s.Event.Kind != expectedKind {
							t.Fatal("wall cue", axis, high, s.Event.Kind)
						}
					}
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

func TestDescendingCornerContact(t *testing.T) {
	for _, sx := range []float64{-1, 1} {
		for _, sz := range []float64{-1, 1} {
			s := initial()
			for i := range s.Players {
				s.Players[i].Stun = 100
			}
			s.Ball = Ball{Owner: -1, LastTouch: -1, X: sx * 548 * terrainUnit, Z: sz * 292 * terrainUnit, H: 1.75,
				FlightKind: 2, FlightStage: 3, FlightIndex: 41, VX: sx * 8 * velocityUnit, VZ: sz * 8 * velocityUnit,
				DirX: sx, DirZ: sz, SpeedTimer: 100, Charged: true, Electric: 3, ElectricBudget: 3}
			after := s.Event.ID
			s.simulate(.04, [2]Input{}, [2]bool{true, true})
			b := s.Ball
			if b.FlightStage != 2 || math.Abs(b.X-sx*536*terrainUnit) > 1e-8 || math.Abs(b.Z-sz*280*terrainUnit) > 1e-8 {
				t.Fatal("corner position", b)
			}
			if b.DirX != -sx || b.DirZ != -sz || b.SpeedTimer != 50 || !b.Charged || b.Electric != 3 {
				t.Fatal("corner state", b)
			}
			kinds := []int{}
			for _, e := range s.Events {
				if e.ID > after {
					kinds = append(kinds, e.Kind)
				}
			}
			if len(kinds) != 2 || kinds[0] != 5 || kinds[1] != 27 {
				t.Fatal("corner audio sequence", kinds)
			}
		}
	}
}
