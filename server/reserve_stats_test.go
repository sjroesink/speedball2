package main

import "testing"

func TestReserveFullEnergyBaseline(t *testing.T) {
	s := initial()
	p := &s.Players[7]
	for i, v := range []int{170, 140, 120} {
		for j := range s.Bench[0][i] {
			s.Bench[0][i][j] = v
		}
	}
	for j := range p.Stats {
		p.Stats[j] = 173
	}
	for _, expected := range []int{170, 140, 120, 170} {
		p.X = 0
		p.Z = 0
		p.Health = 0
		p.ActionTime = 0
		if !s.startInjury(7) {
			t.Fatal("injury start")
		}
		for i := 0; i < 1000 && s.Medical != nil; i++ {
			s.medicalStep(.04)
		}
		if s.Medical != nil {
			t.Fatal("transport incomplete")
		}
		for _, v := range p.BaseStats {
			if v != expected {
				t.Fatal("substitute baseline", expected, v)
			}
		}
		p.Stats = defaultStats()
		p.Health = 20
		s.pickup(7, 11)
		if p.Health != 100 {
			t.Fatal("energy")
		}
		for _, v := range p.Stats {
			if v != expected {
				t.Fatal("restored stats", expected, v)
			}
		}
	}
}
