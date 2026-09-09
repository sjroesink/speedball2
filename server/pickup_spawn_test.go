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
	if item.Wait <= 0 || s.Credits[0] != 100 {
		t.Fatal("boundary collection")
	}
}

func TestPowerSourceMappingAndSoloExclusion(t *testing.T) {
	expected := []int{10, 1, 3, 4, 5, 6, 7, 8, 2, 9, 11, 12}
	for index, kind := range expected {
		s := initial()
		s.RNG = [2]uint32{uint32((index*11)%16) << 16, 0}
		s.spawnPickup(0)
		if s.Pickups[0].Kind != kind {
			t.Fatal("source index", index, s.Pickups[0].Kind)
		}
	}
	s := initial()
	s.Training = true
	s.RNG = [2]uint32{11 << 16, 0}
	s.spawnPickup(0)
	if s.Pickups[0].Kind != 8 || s.RNG != [2]uint32{55 << 16, 33 << 16} {
		t.Fatal("solo rejection", s.Pickups[0], s.RNG)
	}
	s.RNG = [2]uint32{0x31415926, 0x53589793}
	seen := map[int]bool{}
	for i := 0; i < 1000; i++ {
		s.spawnPickup(0)
		seen[s.Pickups[0].Kind] = true
	}
	if seen[1] || !seen[2] || len(seen) != 11 {
		t.Fatal("solo effect pool", seen)
	}
}
