package main

import (
	"math"
	"testing"
)

func TestPickupSpawnRegions(t *testing.T) {
	const u = 22.4 / 576
	s := initial()
	if s.Pickups[2].Wait != s.Pickups[5].Wait {
		t.Fatal("initial coin timers")
	}
	for n := 0; n < 100; n++ {
		for slot := 0; slot < 6; slot++ {
			s.spawnPickup(slot)
			p := s.Pickups[slot]
			x, y := int(math.Round(p.Z/u+320)), int(math.Round(576-p.X/u))
			right, bottom := 0, 0
			if slot >= 2 && (slot-2)%2 != 0 {
				right = 256
			}
			if slot == 1 || slot >= 4 {
				bottom = 512
			}
			maxX := 240
			minWait, maxWait := 32., 63.
			if slot < 2 {
				maxX = 496
				minWait, maxWait = 128, 255
			}
			if (x-72)%16 != 0 || (y-72)%16 != 0 || x < 72+right || x > 72+maxX+right || y < 72+bottom || y > 568+bottom || p.Wait < minWait/25 || p.Wait > maxWait/25 {
				t.Fatal(slot, p, x, y)
			}
		}
	}
}
func TestPersistentPickupAndDistance(t *testing.T) {
	const u = 22.4 / 576
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	for i := 0; i < 6; i++ {
		s.Pickups[i].Wait = 0
		s.Pickups[i].Life = 0
	}
	old := s.Pickups
	s.featureStep(60)
	for i := 0; i < 6; i++ {
		if old[i] != s.Pickups[i] {
			t.Fatal("expired", i)
		}
	}
	item := &s.Pickups[2]
	item.X, item.Z, item.Wait = 0, 0, 0
	p := &s.Players[7]
	p.X, p.Z, p.Stun = 17*u, 0, 0
	s.featureStep(.04)
	if item.Wait != 0 {
		t.Fatal("collected too far away")
	}
	p.X = 16 * u
	s.featureStep(.04)
	if item.Wait <= 0 || s.Credits[0] != 10 {
		t.Fatal("boundary collection")
	}
}
