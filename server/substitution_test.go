package main

import "testing"

func TestBenchRotation(t *testing.T) {
	s := initial()
	p := &s.Players[7]
	for i, v := range []int{110, 120, 130} {
		for j := range s.Bench[0][i] {
			s.Bench[0][i][j] = v
		}
	}
	for j := range p.Stats {
		p.Stats[j] = 197
	}
	p.Z = -2
	for _, want := range []int{110, 120, 130, 190} {
		p.Health = 0
		p.Injury = .04
		s.medicalStep(.04)
		if p.Stats[0] != want || p.Health != 100 || s.Reserves[0] != 3 {
			t.Fatal(want, p.Stats, s.Reserves)
		}
	}
	for i, want := range []int{110, 120, 130} {
		if s.Bench[0][i][0] != want {
			t.Fatal(s.Bench)
		}
	}
}
func TestSubstituteEntry(t *testing.T) {
	const u = 22.4 / 576
	for _, period := range []int{1, 2} {
		for team := 0; team < 2; team++ {
			for _, side := range []float64{-1, 1} {
				s := initial()
				s.Period = period
				p := &s.Players[team*9+7]
				p.Z = side
				p.Injury = .04
				p.Health = 0
				p.Gear = 17
				p.GearBackup = 150
				s.medicalStep(.04)
				if p.X != -s.direction(team)*32*u || p.Z != side*272*u || p.aiX != 0 || p.aiZ != 0 || p.aiWait != 1 || p.Gear != 0 || p.GearBackup != 0 {
					t.Fatal(period, team, side, p)
				}
			}
		}
	}
}
