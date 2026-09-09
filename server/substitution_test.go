package main

import (
	"math"
	"testing"
)

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

func TestMedicalStartAlignmentAndSerialization(t *testing.T) {
	const u = 22.4 / 576
	s := initial()
	p := &s.Players[7]
	p.Health, p.ActionTime, p.X, p.Z = 0, 0, (576-1107)*u, (595-320)*u
	s.Players[16].Health, s.Players[16].ActionTime = 0, 0
	s.Multiplier = -2
	if !s.startInjury(7) {
		t.Fatal("medical did not start")
	}
	if math.Abs(p.X-(576-1104)*u) > 1e-12 || math.Abs(p.Z-(592-320)*u) > 1e-12 {
		t.Fatal("alignment")
	}
	if s.Score[1] != 20 || s.startInjury(7) || s.startInjury(16) || s.Score[0] != 0 {
		t.Fatal("duplicate or concurrent injury scoring")
	}
}
func TestSimultaneousFatalFalls(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	for i := range s.Pickups {
		s.Pickups[i].Wait = 100
	}
	for _, i := range []int{7, 16} {
		p := &s.Players[i]
		p.Health, p.Action, p.ActionTime, p.Stun = 0, 4, 35./25, 35./25
	}
	for frame := 0; frame < 35; frame++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{})
	}
	if s.Players[16].Injury != 6 || s.Players[7].Injury != 0 || s.Score != [2]int{10, 0} {
		t.Fatal("medical processing order")
	}
	for frame := 0; s.Players[16].Injury > 0 && frame < 160; frame++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{})
	}
	s.simulate(simulationStep, [2]Input{}, [2]bool{})
	if s.Players[16].Injury != 0 || s.Players[7].Injury != 6 || s.Score != [2]int{10, 10} {
		t.Fatal("queued injury")
	}
}
