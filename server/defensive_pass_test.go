package main

import "testing"

func defensivePassFixture() (State, [18]int) {
	const u = 22.4 / 576
	s := initial()
	var d [18]int
	for i := range s.Players {
		s.Players[i].Stun = 100
		d[i] = 1000
	}
	s.Players[0].X, s.Players[0].Z, s.Players[0].Stun = 0, 0, 0
	s.Players[1].X, s.Players[1].Z, s.Players[1].Stun = 20*u, 0, 0
	s.Players[3].X, s.Players[3].Z, s.Players[3].Stun = 100*u, 0, 0
	d[1], d[3] = 20, 100
	s.Ball.Owner = 0
	return s, d
}
func TestDefensivePassRolesAndRange(t *testing.T) {
	s, d := defensivePassFixture()
	p := s.defensivePass(0, &d)
	if p == nil || p.receiver != 3 || !p.high {
		t.Fatal("role priority", p)
	}
	s.Players[3].Stun = 1
	p = s.defensivePass(0, &d)
	if p == nil || p.receiver != 1 || p.high {
		t.Fatal("defender fallback", p)
	}
	d[1] = 200
	p = s.defensivePass(0, &d)
	if p == nil || !p.high {
		t.Fatal("strict throw range")
	}
	d[1] = 201
	if s.defensivePass(0, &d) != nil {
		t.Fatal("intelligence range")
	}
}
func TestDefensivePassBlockedDirections(t *testing.T) {
	const u = 22.4 / 576
	s, d := defensivePassFixture()
	s.Players[16].X, s.Players[16].Z, s.Players[16].Stun = 50*u, 0, 0
	d[16] = 50
	if s.defensivePass(0, &d) != nil {
		t.Fatal("blocked lane")
	}
	s.Ball.Charged = true
	if p := s.defensivePass(0, &d); p == nil || p.receiver != 3 {
		t.Fatal("charged ball")
	}
	s.Players[4].X, s.Players[4].Z, s.Players[4].Stun = 100*u, 0, 0
	d[4] = 100
	if p := s.defensivePass(0, &d); p == nil || p.receiver != 4 {
		t.Fatal("equal-distance roster tie")
	}
}

func TestDefensivePunt(t *testing.T) {
	const u = 22.4 / 576
	s, _ := defensivePassFixture()
	p := s.defensivePunt(0, 0)
	if p.key != 3 || p.z != -48*u || p.steer != -1 || !p.high {
		t.Fatal("goal punt", p)
	}
	if s.defensivePunt(0, 50).steer != 0 || s.defensivePunt(0, 64).z != 48*u {
		t.Fatal("random bit or strict threshold")
	}
	s.Players[16].Stun, s.Players[16].Z = 0, 0
	for _, charged := range []bool{false, true} {
		s.Ball.Charged = charged
		for _, period := range []int{1, 2} {
			s.Period = period
			d := s.direction(0)
			s.Players[16].X = d * 50 * u
			for _, random := range []int{0, 16} {
				p = s.defensivePunt(0, random)
				lateral := -1.
				if random != 0 {
					lateral = 1
				}
				if p.z != lateral*288*u || p.x != d*288*u || p.key != int(d*3+lateral) {
					t.Fatal("wall route", charged, period, random, p)
				}
			}
		}
	}
}

func TestKeeperPuntRelease(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 100
	}
	p := &s.Players[0]
	p.X, p.Z, p.Stun, p.aiWait = 0, 0, 0, 0
	s.Ball.X, s.Ball.Z, s.Ball.Owner = 0, 0, 0
	s.simulate(simulationStep, [2]Input{}, [2]bool{})
	if p.throwMode != 3 || s.Ball.Owner != 0 {
		t.Fatal("missing high punt windup")
	}
	steer := p.throwSteer
	for n := 0; n < 4; n++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{})
	}
	if s.Ball.Owner != -1 || s.Ball.FlightKind != 2 || s.Ball.VZ != steer*4*velocityUnit {
		t.Fatal("punt release", s.Ball)
	}
}
