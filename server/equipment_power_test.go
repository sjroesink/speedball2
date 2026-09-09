package main

import "testing"

func TestEquipmentAcquiredDuringPower(t *testing.T) {
	for _, kind := range []int{3, 4, 5, 6} {
		for gear := 14; gear <= 21; gear++ {
			for _, expireFirst := range []bool{false, true} {
				s := initial()
				p := &s.Players[7]
				attribute := gear - 14
				for i := range p.Stats {
					p.Stats[i] = 173
				}
				collector := 7
				if kind == 3 || kind == 6 {
					collector = 16
				}
				s.pickup(collector, kind)
				powered := kind != 6 || attribute == 3
				powerValue := 250
				if kind == 3 || kind == 6 {
					powerValue = 100
				}
				s.pickup(7, gear)
				if p.Stats[attribute] != 250 {
					t.Fatal("equipment boost missing")
				}
				if expireFirst {
					s.restorePower()
				}
				if p.Stats[attribute] != 250 {
					t.Fatal("expiry removed held equipment")
				}
				if !s.damage(16, 7) {
					t.Fatal("impact did not occur")
				}
				want := 173
				if !expireFirst && powered {
					want = powerValue
				}
				if p.Gear != 0 || p.Stats[attribute] != want {
					t.Fatalf("power %d gear %d expireFirst %v: got %d want %d", kind, gear, expireFirst, p.Stats[attribute], want)
				}
				s.restorePower()
				if p.Stats[attribute] != 173 || p.StatBackup[attribute] != 0 {
					t.Fatal("underlying attribute not restored")
				}
			}
		}
	}
}

func TestPowerAppliedAfterEquipment(t *testing.T) {
	for _, kind := range []int{3, 4, 5, 6} {
		for gear := 14; gear <= 21; gear++ {
			s := initial()
			p := &s.Players[7]
			a := gear - 14
			for i := range p.Stats {
				p.Stats[i] = 173
			}
			s.pickup(7, gear)
			collector := 7
			if kind == 3 || kind == 6 {
				collector = 16
			}
			s.pickup(collector, kind)
			if !s.damage(16, 7) {
				t.Fatal("missing impact")
			}
			want := 173
			if kind != 6 || a == 3 {
				want = 250
				if kind == 3 || kind == 6 {
					want = 100
				}
			}
			if p.Stats[a] != want {
				t.Fatalf("power %d gear %d: got %d want %d", kind, gear, p.Stats[a], want)
			}
			s.restorePower()
			if p.Stats[a] != 173 {
				t.Fatal("underlying value lost")
			}
		}
	}
}
