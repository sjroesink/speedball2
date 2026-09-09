package main

import (
	"math"
	"testing"
)

func carrierFixture(x, y, i int) (State, [18]int) {
	s := initial()
	var d [18]int
	for j := range s.Players {
		s.Players[j].Stun = 100
		d[j] = 1000
	}
	for j := range s.Pickups {
		s.Pickups[j].Wait = 100
	}
	s.Players[i].X, s.Players[i].Z = carrierWorld(x, y)
	s.Players[i].Stun, s.Players[i].aiWait = 0, 0
	s.Ball.X, s.Ball.Z, s.Ball.Owner = s.Players[i].X, s.Players[i].Z, i
	s.logicalView = [2]int{40, 900}
	return s, d
}
func carrierWorld(x, y int) (float64, float64) {
	const u = 22.4 / 576
	return float64(576-y) * u, float64(x-320) * u
}
func checkCarrierTarget(t *testing.T, p *passPlan, x, y int) {
	t.Helper()
	wx, wz := carrierWorld(x, y)
	if p == nil || math.Abs(p.x-wx) > 1e-12 || math.Abs(p.z-wz) > 1e-12 {
		t.Fatal("target", p, x, y)
	}
}
func TestCarrierZoneCenter(t *testing.T) {
	s, d := carrierFixture(200, 1000, 1)
	checkCarrierTarget(t, s.carrierMove(1, 255, &d), 200, 884)
	s.Players[1].X, s.Players[1].Z = carrierWorld(200, 936)
	if s.carrierMove(1, 255, &d) != nil {
		t.Fatal("center")
	}
	s.Period = 2
	s.Players[1].X, s.Players[1].Z = carrierWorld(440, 152)
	checkCarrierTarget(t, s.carrierMove(1, 255, &d), 440, 268)
	s.Players[1].X, s.Players[1].Z = carrierWorld(440, 216)
	if s.carrierMove(1, 255, &d) != nil {
		t.Fatal("mirrored center")
	}
}
func TestCarrierRoutePriority(t *testing.T) {
	s, d := carrierFixture(200, 960, 1)
	s.Players[16].X, s.Players[16].Z = carrierWorld(200, 860)
	s.Players[16].Stun = 0
	d[16] = 100
	checkCarrierTarget(t, s.carrierMove(1, 8, &d), 116, 864)
	checkCarrierTarget(t, s.carrierMove(1, 0, &d), 260, 864)
	s.Players[1].X, s.Players[1].Z = carrierWorld(100, 1000)
	s.Players[16].X, s.Players[16].Z = carrierWorld(100, 900)
	s.Players[15].X, s.Players[15].Z = carrierWorld(180, 900)
	s.Players[15].Stun = 0
	d[15] = 128
	checkCarrierTarget(t, s.carrierMove(1, 8, &d), 66, 968)
}
func TestCarrierOpponentBeforeItem(t *testing.T) {
	s, d := carrierFixture(200, 1000, 1)
	s.Players[16].X, s.Players[16].Z = carrierWorld(200, 936)
	s.Players[16].Stun = 0
	d[16] = 64
	s.Pickups[0].X, s.Pickups[0].Z = carrierWorld(280, 1000)
	s.Pickups[0].Wait = 0
	if s.carrierMove(1, 0, &d) != nil {
		t.Fatal("close opponent")
	}
	d[16] = 65
	checkCarrierTarget(t, s.carrierMove(1, 0, &d), 280, 1000)
	d[16] = 64
	s.Players[16].Stun = 1
	checkCarrierTarget(t, s.carrierMove(1, 0, &d), 280, 1000)
}
func TestCarrierCollectibles(t *testing.T) {
	s, d := carrierFixture(200, 1000, 1)
	s.Pickups[6].X, s.Pickups[6].Z = carrierWorld(200, 980)
	s.Pickups[6].Wait = 0
	s.Pickups[2].X, s.Pickups[2].Z = carrierWorld(280, 1000)
	s.Pickups[2].Wait = 0
	checkCarrierTarget(t, s.carrierMove(1, 0, &d), 200, 980)
	s.Players[16].X, s.Players[16].Z = carrierWorld(200, 900)
	s.Players[16].Stun = 0
	d[16] = 100
	checkCarrierTarget(t, s.carrierMove(1, 0, &d), 280, 1000)
	a, ad := carrierFixture(200, 300, 6)
	a.logicalView = [2]int{40, 200}
	a.Pickups[0].X, a.Pickups[0].Z = carrierWorld(280, 300)
	a.Pickups[0].Wait = 0
	checkCarrierTarget(t, a.carrierMove(6, 49, &ad), 280, 300)
	checkCarrierTarget(t, a.carrierMove(6, 50, &ad), 200, 174)
}
func TestCarrierSimulation(t *testing.T) {
	for _, y := range []int{1000, 936} {
		s, _ := carrierFixture(200, y, 1)
		s.simulate(simulationStep, [2]Input{}, [2]bool{})
		if y == 1000 {
			if s.Players[1].throwMode != 0 {
				t.Fatal("premature pass")
			}
			checkCarrierTarget(t, &passPlan{x: s.Players[1].aiX, z: s.Players[1].aiZ}, 200, 884)
		} else if s.Players[1].throwMode != 3 {
			t.Fatal("missing pass")
		}
	}
}
