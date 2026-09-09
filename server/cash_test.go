package main

import "testing"

func TestCashSpawnLimit(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	item := &s.Pickups[2]
	s.Credits = [2]int{2000, 1900}
	item.Wait = .04
	s.featureStep(.04)
	if item.Wait != 0 {
		t.Fatal("other team below limit")
	}
	s.Credits[1] = 2000
	item.Wait = .04
	s.featureStep(.04)
	if item.Wait != 256./25 {
		t.Fatal("both at limit")
	}
	p := &s.Players[7]
	p.X = item.X
	p.Z = item.Z
	p.Stun = 0
	p.Action = 0
	item.Wait = 0
	s.featureStep(.04)
	if s.Credits[0] != 2100 || item.Wait <= 0 {
		t.Fatal("visible coins remain collectible")
	}
}
func TestTrainingCashLimit(t *testing.T) {
	s := initial()
	s.Training = true
	s.initFeatures()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	if s.CashLimits != [2]int{10000, 10000} {
		t.Fatal("practice limit")
	}
	item := &s.Pickups[2]
	s.Credits = [2]int{9900, 20000}
	item.Wait = .04
	s.featureStep(.04)
	if item.Wait != 0 {
		t.Fatal("human below limit")
	}
	s.Credits = [2]int{10000, 0}
	item.Wait = .04
	s.featureStep(.04)
	if item.Wait != 256./25 {
		t.Fatal("human at limit")
	}
}
