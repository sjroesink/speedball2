package main

import "testing"

func TestHumanControlBeyondOldViewport(t *testing.T) {
	const u = 22.4 / 576
	for _, distance := range []int{76, 77, 300} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 100
		}
		p := &s.Players[7]
		p.X, p.Z, p.Stun = float64(distance)*u, 0, 0
		s.Ball.X, s.Ball.Z, s.Ball.H, s.Ball.Owner = 0, 0, 4, -1
		before := p.X
		s.simulate(simulationStep, [2]Input{{X: 1}, {}}, [2]bool{true, false})
		if p.X <= before {
			t.Fatal("human movement lost", distance, p.X)
		}
	}
}

func TestOffscreenHumanThrowRelease(t *testing.T) {
	for _, high := range []bool{false, true} {
		s := initial()
		for i := range s.Players {
			s.Players[i].Stun = 100
		}
		p := &s.Players[7]
		p.X, p.Z, p.FX, p.FZ, p.Stun = 4, 0, 1, 0, 0
		p.Action, p.ActionTime, p.throwMode = 3, 5./25, 1
		s.Ball.Owner = 7
		s.simulate(simulationStep, [2]Input{{Shoot: high, Z: 1}, {}}, [2]bool{true, false})
		kind := 1
		if high {
			kind = 2
		}
		if s.Ball.Owner != -1 || s.Ball.FlightKind != kind || s.Ball.VZ != 4*velocityUnit {
			t.Fatal("release input lost", s.Ball)
		}
	}
}

func TestOriginalViewport(t *testing.T) {
	for _, c := range []struct {
		view         [2]int
		x, y         int
		presentation bool
		want         [2]int
	}{
		{[2]int{160, 484}, 327, 583, false, [2]int{160, 485}},
		{[2]int{160, 484}, 328, 584, false, [2]int{162, 486}},
		{[2]int{160, 484}, 327, 583, true, [2]int{161, 485}},
		{[2]int{160, 484}, 640, 1152, false, [2]int{176, 500}},
		{[2]int{0, 0}, 0, 0, false, [2]int{0, 0}},
		{[2]int{320, 968}, 640, 1152, false, [2]int{320, 968}},
	} {
		if got := scrollViewport(c.view, c.x, c.y, c.presentation); got != c.want {
			t.Fatal(c, got)
		}
	}
	v := [2]int{160, 484}
	for _, c := range []struct {
		x, y, margin int
		want         bool
	}{{160, 484, 0, true}, {480, 668, 0, true}, {481, 668, 0, false}, {480, 669, 0, false}, {176, 500, 16, true}, {464, 652, 16, true}, {175, 500, 16, false}} {
		if inViewport(v, c.x, c.y, c.margin) != c.want {
			t.Fatal(c)
		}
	}
}
