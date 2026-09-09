package main

import (
	"encoding/json"
	"math"
	"testing"
)

func TestSimulationParityTrace(t *testing.T) {
	traces := [][][]float64{}
	for scenario := 0; scenario < 6; scenario++ {
		s := newMatch()
		if scenario == 4 {
			s.RestartPhase = 0
			s.Ball = Ball{X: 206 * 22.4 / 576, Z: 11.2, H: .25, VZ: 6, Owner: -1, LastTouch: 7}
		}
		rows := [][]float64{}
		if scenario == 5 {
			s.RestartPhase = 0
			s.Players[7].Health = 1
			s.damage(16, 7)
		}
		for tick := 0; tick < 10000; tick++ {
			inputs := [2]Input{}
			humans := [2]bool{scenario > 0, scenario > 1}
			for team := 0; team < 2; team++ {
				p := s.Players[s.Controlled[team]]
				dx, dz := s.Ball.X-p.X, s.Ball.Z-p.Z
				if scenario != 3 && s.Ball.Owner == s.Controlled[team] {
					dx = s.direction(team) * 20
					dz = -p.Z
				}
				sign := func(v float64) float64 {
					if math.Abs(v) < .05 {
						return 0
					}
					return math.Copysign(1, v)
				}
				inputs[team] = Input{X: sign(dx), Z: sign(dz), Shoot: tick%37 < 8, Tackle: tick%53 == 0, Lob: tick%97 < 7}
				if scenario == 3 {
					inputs[team].Shoot = false
					inputs[team].Lob = false
					inputs[team].Tackle = tick%18 < 5
				}
			}
			s.simulate(.04, inputs, humans)
			if tick%25 != 0 {
				continue
			}
			row := []float64{float64(tick), s.Time, float64(s.Period), float64(s.Score[0]), float64(s.Score[1]), float64(s.RNG[0]), float64(s.RNG[1]), s.Ball.X, s.Ball.Z, s.Ball.H, float64(s.Ball.Owner), float64(s.RestartPhase), s.Ball.VX, s.Ball.VZ, float64(s.Ball.FlightKind), float64(s.Ball.FlightIndex), float64(s.Ball.SpeedTimer)}
			for _, p := range s.Players {
				row = append(row, p.X, p.Z, p.Health, float64(p.Action), p.FX, p.FZ, float64(p.Gear))
				for _, v := range p.Stats {
					row = append(row, float64(v))
				}
				poseValid := 0.
				if p.physicalPoseValid {
					poseValid = 1
				}
				fallPending := 0.
				if p.fallPosePending {
					fallPending = 1
				}
				row = append(row, poseValid, float64(p.physicalSprite), float64(p.physicalFrame), p.poseCursor, float64(p.poseKind), p.poseRemaining, p.poseDuration, p.ActionTime, fallPending)
			}
			row = append(row, float64(s.Credits[0]), float64(s.Credits[1]), float64(s.Effect.Kind), s.Effect.Time)
			rows = append(rows, row)
		}
		traces = append(traces, rows)
	}
	raw, err := json.Marshal(traces)
	if err != nil {
		t.Fatal(err)
	}
	t.Log("TRACE:" + string(raw))
}
