package main

import (
	"math"
	"testing"
)

func TestArmourCirculation(t *testing.T) {
	s := initial()
	for i := range s.Pickups {
		s.Pickups[i].Wait = 10000
	}
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	i := s.Controlled[0]
	p := &s.Players[i]
	item := &s.Pickups[6]
	p.X = 1.1
	p.Z = 2.1
	p.Stun = 0
	p.Action = 0
	*item = Pickup{Kind: 17, X: p.X, Z: p.Z}
	s.featureStep(.04)
	if p.Gear != 17 || p.Stats[3] != 250 || s.ArmourPickupsLeft != 1 {
		t.Fatal("first collection", p.Gear, s.ArmourPickupsLeft)
	}
	s.featureStep(60)
	if item.Kind != 0 || p.Gear != 17 {
		t.Fatal("held armor respawned")
	}
	if !s.damage(9, i) {
		t.Fatal("damage rejected")
	}
	if p.Gear != 0 || p.Stats[3] != 100 || item.Kind != 17 || item.Wait != 0 {
		t.Fatal("drop", *item)
	}
	const u = 22.4 / 576
	if int(math.Round(item.Z/u+320)) != (int(math.Round(p.Z/u+320))&0xfe0)+16 || int(math.Round(576-item.X/u)) != (int(math.Round(576-p.X/u))&0xfe0)+16 {
		t.Fatal("drop grid")
	}
	p.X = item.X
	p.Z = item.Z
	p.Stun = 0
	p.Action = 0
	s.featureStep(.04)
	if p.Gear != 17 || s.ArmourPickupsLeft != 0 || item.Kind != 0 {
		t.Fatal("second collection")
	}
	if !s.damage(9, i) {
		t.Fatal("second damage")
	}
	if p.Gear != 0 || s.ArmourPickupsLeft != 2 || item.Kind < 14 || item.Kind > 21 || item.Wait < 0 || item.Wait > 255./25 {
		t.Fatal("replacement", *item)
	}
}
