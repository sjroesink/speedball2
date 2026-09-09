package main

import "testing"

func TestItemAppearanceEvents(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	for i := range s.Pickups {
		s.Pickups[i].Wait = .08
	}
	s.featureStep(.04)
	if s.Event.ID != 0 {
		t.Fatal("early announcement")
	}
	s.featureStep(.04)
	if s.Event.ID != 7 || s.Event.Kind != 21 {
		t.Fatal("appearance events", s.Event)
	}
	s.featureStep(.04)
	if s.Event.ID != 7 {
		t.Fatal("repeated appearance")
	}
}
func TestSuppressedAppearanceIsSilent(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	for i := range s.Pickups {
		s.Pickups[i].Wait = 100
	}
	s.Credits = [2]int{2000, 2000}
	s.Pickups[2].Wait = .04
	s.Pickups[6].Kind = 0
	s.Pickups[6].Wait = .04
	s.featureStep(.04)
	if s.Event.ID != 0 {
		t.Fatal("hidden item made sound")
	}
}
