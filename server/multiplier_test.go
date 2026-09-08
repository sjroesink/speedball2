package main

import "testing"

func multiplierFixture(left, up bool) *State {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	x, z, dx := 32., 265., 1.
	if left {
		x, z = -32, -265
	}
	if !up {
		dx = -1
	}
	s.Ball = Ball{Owner: -1, LastTouch: 7, X: x * terrainUnit, Z: z * terrainUnit, H: .75, DirX: dx, VX: dx * 8 * velocityUnit}
	return &s
}
func TestMultiplierRoutesAndAwardTiming(t *testing.T) {
	for _, left := range []bool{true, false} {
		for _, up := range []bool{true, false} {
			s := multiplierFixture(left, up)
			if !enterMultiplier(&s.Ball) {
				t.Fatal("entry", left, up)
			}
			s.runMultiplier(0)
			s.runMultiplier(20. / 25)
			if s.Multiplier != 0 {
				t.Fatal("early award")
			}
			s.runMultiplier(1. / 25)
			if s.Multiplier != 1 || s.Event.Kind != 9 {
				t.Fatal("step 22 award")
			}
			s.runMultiplier(27. / 25)
			if s.Ball.MultiplierIndex != 49 || s.Ball.MultiplierPath == 0 {
				t.Fatal("path duration")
			}
			s.runMultiplier(1. / 25)
			expected := -8 * velocityUnit
			if up {
				expected = 8 * velocityUnit
			}
			if s.Ball.MultiplierPath != 0 || s.Ball.VX != expected || s.Ball.SpeedTimer != 50 {
				t.Fatal("exit restores speed and sustain")
			}
		}
	}
}
func TestMultiplierEntryAndHostRate(t *testing.T) {
	for _, change := range []func(*Ball){func(b *Ball) { b.H = 2 }, func(b *Ball) { b.DirZ = 1 }, func(b *Ball) { b.Owner = 7 }, func(b *Ball) { b.X = 3 }, func(b *Ball) { b.Z = 0 }} {
		s := multiplierFixture(true, true)
		change(&s.Ball)
		if enterMultiplier(&s.Ball) {
			t.Fatal("invalid entry")
		}
	}
	a, b := multiplierFixture(true, true), multiplierFixture(true, true)
	a.step(1./25, [2]Input{})
	b.step(1./60, [2]Input{})
	for i := 0; i < 24; i++ {
		a.step(1./25, [2]Input{})
	}
	for i := 0; i < 58; i++ {
		b.step(1./60, [2]Input{})
	}
	if a.Ball.MultiplierIndex != b.Ball.MultiplierIndex || a.Ball.X != b.Ball.X || a.Ball.Z != b.Ball.Z || a.Multiplier != 1 {
		t.Fatal("host rate changed path")
	}
}
