package main

import (
	"encoding/json"
	"testing"
)

func TestSimulationParityTrace(t *testing.T) {
	s := newMatch()
	rows := [][]float64{}
	for tick := 0; tick < 5000; tick++ {
		s.simulate(.04, [2]Input{}, [2]bool{false, false})
		if tick%25 != 0 {
			continue
		}
		row := []float64{float64(tick), s.Time, float64(s.Period), float64(s.Score[0]), float64(s.Score[1]), float64(s.RNG[0]), float64(s.RNG[1]), s.Ball.X, s.Ball.Z, s.Ball.H, float64(s.Ball.Owner), float64(s.RestartPhase), s.Ball.VX, s.Ball.VZ, float64(s.Ball.FlightKind), float64(s.Ball.FlightIndex), float64(s.Ball.SpeedTimer)}
		for _, p := range s.Players {
			row = append(row, p.X, p.Z, p.Health, float64(p.Action), p.FX, p.FZ)
		}
		rows = append(rows, row)
	}
	raw, err := json.Marshal(rows)
	if err != nil {
		t.Fatal(err)
	}
	t.Log("TRACE:" + string(raw))
}
