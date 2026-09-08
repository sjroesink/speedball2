package main

import (
	"encoding/base64"
	"math"
	"testing"
)

func TestAllPowers(t *testing.T) {
	for k := 1; k <= 12; k++ {
		s := initial()
		s.Ball.Owner = 16
		s.pickup(7, k)
		switch k {
		case 7:
			if s.Ball.Owner != 7 {
				t.Fatal("magnet")
			}
		case 8:
			if s.Players[s.Ball.Owner].Team != 0 {
				t.Fatal("transport")
			}
		case 11:
			if s.Players[7].Health != 100 {
				t.Fatal("heal")
			}
		case 12:
			if s.Players[16].Stun <= 0 || s.Ball.Owner != -1 {
				t.Fatal("zap")
			}
		default:
			if s.Effect.Kind != k || s.Effect.Time != 6 || s.Effect.Team != 0 {
				t.Fatal("temporary power", k)
			}
		}
	}
}
func TestPowerMovement(t *testing.T) {
	for _, c := range []struct {
		k, owner int
		factor   float64
	}{{1, 16, 0}, {2, 16, -1}, {3, 16, 1}, {4, 7, 1.4}, {5, 16, 1.4}, {6, 16, 1}} {
		s := isolated()
		s.Ball.H = 4
		s.pickup(c.owner, c.k)
		x := s.Players[7].X
		s.step(dt, [2]Input{{X: 1}, {}})
		if math.Abs(s.Players[7].X-x-5*velocityUnit*dt*c.factor) > 1e-8 {
			t.Fatal("movement", c.k, s.Players[7].X)
		}
	}
}
func TestPowerExpiryShieldHeal(t *testing.T) {
	s := initial()
	s.pickup(7, 1)
	s.pickup(16, 10)
	if s.active(1, -1) || !s.active(10, 1) {
		t.Fatal("replacement")
	}
	if s.damage(7, 16) {
		t.Fatal("shield failed")
	}
	s.pickup(7, 12)
	if s.Players[16].Health != 100 {
		t.Fatal("shield failed against zap")
	}
	s.matchClock(6)
	if s.Effect.Kind != 0 {
		t.Fatal("expiry")
	}
	s.damage(7, 16)
	s.pickup(16, 11)
	if s.Players[16].Health != 100 {
		t.Fatal("heal")
	}
	s.Tick = 1
	s.Players[7].Health = 45
	s.resetPitch()
	if s.Players[7].Health != 45 {
		t.Fatal("goal reset healed injury damage")
	}
}
func TestDoorBothHalves(t *testing.T) {
	for _, period := range []int{1, 2} {
		s := isolated()
		s.Period = period
		s.pickup(7, 9)
		x := -20.9
		if period == 2 {
			x = -x
		}
		s.Ball = Ball{X: x, H: 1, VX: math.Copysign(24, x), Owner: -1, LastTouch: -1}
		s.step(dt, [2]Input{})
		s.step(dt, [2]Input{})
		if s.Score[1] != 0 || s.Ball.VX*x >= 0 {
			t.Fatal("door")
		}
		if s.goalBlocked(-x) {
			t.Fatal("wrong door")
		}
	}
}
func TestWarpsAndHighBounce(t *testing.T) {
	for _, x := range []float64{-8, 8} {
		for _, sign := range []float64{-1, 1} {
			s := isolated()
			s.Ball = Ball{X: x, Z: 11.1 * sign, H: 1, VZ: 24 * sign, Owner: -1, LastTouch: 7}
			s.step(dt, [2]Input{})
			s.step(dt, [2]Input{})
			if s.Ball.Z*sign >= -10 || s.Ball.VZ*sign <= 0 || s.Event.Kind != 12 {
				t.Fatal("warp", s.Ball)
			}
		}
	}
	s := isolated()
	s.Ball = Ball{X: 8, Z: 11.1, H: 3, VZ: 24, Owner: -1, LastTouch: -1}
	s.step(dt, [2]Input{})
	s.step(dt, [2]Input{})
	if s.Ball.VZ >= 0 || s.Ball.Z < 0 {
		t.Fatal("high ball warped")
	}
}
func TestElectroChargesAndShieldCatch(t *testing.T) {
	s := isolated()
	s.Multiplier = 2
	s.Ball = Ball{ElectricBudget: 3, X: 304 * terrainUnit, Z: 11.3, H: 1, LastTouch: 7, Owner: -1}
	s.sideFeature()
	if s.Ball.Electric != 3 {
		t.Fatal("charge")
	}
	s.Players[16] = Player{X: 5, Z: 2, Health: 100, Team: 1, FX: -1}
	s.Ball.X = 5
	s.Ball.Z = 2
	s.step(dt, [2]Input{})
	if s.Ball.Owner != -1 || s.Ball.Electric != 2 || s.Players[16].Stun <= 0 {
		t.Fatal("electro hit")
	}
	s.Players[16].Stun = 0
	s.pickup(16, 10)
	s.Ball.X = s.Players[16].X
	s.Ball.Z = s.Players[16].Z
	s.step(dt, [2]Input{})
	if s.Ball.Owner != 16 || s.Ball.Electric != 0 {
		t.Fatal("shield catch")
	}
}
func TestInjuryMedicalAndNoReserves(t *testing.T) {
	s := initial()
	s.Players[16].Health = 1
	s.damage(7, 16)
	if s.Score[0] != 10 || s.Players[16].Injury != 6 {
		t.Fatal("injury")
	}
	clock := s.Time
	for i := 0; i < 361; i++ {
		s.step(dt, [2]Input{})
	}
	if s.Time != clock || s.Reserves[1] != 2 || s.Players[16].Health != 100 {
		t.Fatal("medical replacement")
	}
	s.Reserves[1] = 0
	s.Players[16].Health = 1
	s.Players[16].Stun = 0
	s.damage(7, 16)
	for i := 0; i < 361; i++ {
		s.step(dt, [2]Input{})
	}
	if s.Players[16].Health != 0 || s.Score[0] != 20 || s.Reserves[1] != 0 {
		t.Fatal("no reserves")
	}
}
func TestPickupRespawnAndEquipment(t *testing.T) {
	s := isolated()
	s.Pickups[0] = Pickup{Kind: 13, X: 0, Z: 0, Life: 14}
	s.featureStep(dt)
	s.featureStep(dt)
	if s.Credits[0] != 10 || s.Pickups[0].Wait <= 0 {
		t.Fatal("double pickup")
	}
	s.pickup(7, 17)
	if movementSpeed(&s.Players[7], false, false) != 7*velocityUnit {
		t.Fatal("boots")
	}
	s.pickup(7, 18)
	s.throw(7, false)
	if s.Ball.VX != 8*velocityUnit || s.Ball.SpeedTimer != 125 {
		t.Fatal("throw gear")
	}
	s.Players[16].Stun = 0
	s.damage(16, 7)
	if s.Players[7].Gear != 0 {
		t.Fatal("gear not lost")
	}
}
func TestFeatureSnapshot(t *testing.T) {
	s := initial()
	s.Effect = Effect{10, 1, 5.5}
	s.Credits = [2]int{100, 50}
	s.Reserves = [2]int{2, 1}
	s.Ball.Charged = true
	s.Ball.Electric = 3
	for i := range s.Players {
		s.Players[i].Health = float64(90 - i)
		s.Players[i].Injury = float64(i) / 10
		s.Players[i].Gear = 14 + i%8
		for j := range s.Players[i].Stats {
			s.Players[i].Stats[j] = 100 + i
		}
	}
	for i := 0; i < 20; i++ {
		s.event(3+i%3, 7, -1, float64(i), -2, 1)
	}
	raw := encodeSnapshot(Snapshot{State: s, Room: "ABCDEF", Names: [2]string{"Blue", "Red"}, Started: true})
	if len(raw) > 1200 {
		t.Fatal("snapshot exceeds datagram", len(raw))
	}
	t.Log("WIRE:" + base64.StdEncoding.EncodeToString(raw))
}

func TestTransportRosterSlot(t *testing.T) {
	for team := 0; team < 2; team++ {
		for period := 1; period <= 2; period++ {
			s := initial()
			s.Period = period
			target := team*9 + 8
			s.Players[target].X = 0
			s.Players[team*9+7].X = 20
			s.pickup(team*9+7, 8)
			if s.Ball.Owner != target {
				t.Fatal("transport must target roster slot eight")
			}
			s.Ball.Owner = 1
			s.Players[target].Stun = 1
			s.pickup(team*9+7, 8)
			if s.Ball.Owner != 1 {
				t.Fatal("fallen target must not trigger fallback")
			}
		}
	}
}

func TestSelectedGroundedPickup(t *testing.T) {
	for _, kind := range []int{1, 13, 17} {
		s := initial()
		for i := range s.Players {
			s.Players[i].X = 10
			s.Players[i].Z = 10
		}
		s.Pickups[0] = Pickup{Kind: kind, Life: 14}
		s.Players[6].X = 0
		s.Players[6].Z = 0
		s.featureStep(dt)
		if s.Pickups[0].Wait != 0 {
			t.Fatal("unselected pickup")
		}
		s.Players[7].X = 0
		s.Players[7].Z = 0
		s.Players[7].Action = 2
		s.featureStep(dt)
		if s.Pickups[0].Wait != 0 {
			t.Fatal("jumping pickup")
		}
		s.Players[7].Action = 0
		s.Players[16].X = 0
		s.Players[16].Z = 0
		s.featureStep(dt)
		if s.Pickups[0].Wait <= 0 {
			t.Fatal("selected player missed pickup")
		}
		if kind == 1 && s.Effect.Team != 0 {
			t.Fatal("power priority")
		}
		if kind == 13 && s.Credits != [2]int{10, 0} {
			t.Fatal("credit priority")
		}
		if kind == 17 && s.Players[7].Gear != 17 {
			t.Fatal("equipment priority")
		}
	}
}
