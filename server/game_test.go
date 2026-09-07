package main

import (
	"math"
	"strings"
	"testing"
)

const dt = 1.0 / 60

func TestInputPulseSurvivesShortTap(t *testing.T) {
	s := isolated()
	s.Ball.X = 8
	s.Ball.Z = 8
	s.step(dt, [2]Input{{TackleID: 1}, {}})
	if s.Players[7].Action != 1 {
		t.Fatal("a short tap between ticks was lost")
	}
	s = isolated()
	s.Players[7].X = 4
	s.Ball.Owner = 7
	s.step(dt, [2]Input{{Fire: 1}, {}})
	if s.Ball.Owner != -1 {
		t.Fatal("short throw tap was lost")
	}
}

func isolated() State {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 10
	}
	s.Players[7] = Player{X: 0, Z: 0, Team: 0, FX: 1}
	s.Controlled = [2]int{7, 16}
	return s
}
func TestVisibleTackleMissAndCooldown(t *testing.T) {
	s := isolated()
	s.Ball.X = 9
	s.Ball.Z = 9
	s.step(dt, [2]Input{{Tackle: true}, {}})
	p := s.Players[7]
	if p.Action != 1 || p.ActionTime <= 0 || p.X < .2 || p.Cooldown <= 0 {
		t.Fatal("tackle without contact must slide visibly")
	}
	for i := 0; i < 65; i++ {
		s.step(dt, [2]Input{{Tackle: true}, {}})
	}
	if s.Players[7].Action == 1 {
		t.Fatal("holding tackle must not retrigger")
	}
}
func TestTackleKnockdownAndLooseBall(t *testing.T) {
	s := isolated()
	s.Players[16] = Player{X: 1.3, Team: 1, FX: -1}
	s.Ball = Ball{X: 1.3, H: 1, Owner: 16}
	s.step(dt, [2]Input{{Tackle: true}, {}})
	if s.Players[16].Stun < 1 || s.Players[16].Action != 4 || s.Ball.Owner >= 0 {
		t.Fatalf("no knockdown / ball release: %+v", s.Ball)
	}
}
func TestDirectionalLowAndHighThrow(t *testing.T) {
	for _, lob := range []bool{false, true} {
		s := isolated()
		s.Players[7].X = 4 // Keep the throw lane clear of the central dome.
		s.Ball.Owner = 7
		n := 1
		if lob {
			n = 20
		}
		for i := 0; i < n; i++ {
			s.step(dt, [2]Input{{Z: 1, Shoot: true}, {}})
		}
		s.step(dt, [2]Input{{Z: 1}, {}})
		if s.Ball.Owner != -1 || s.Ball.VZ < 15 || math.Abs(s.Ball.VX) > 1 {
			t.Fatal("throw must follow facing, not autoaim at goal")
		}
		if lob && s.Ball.VH < 9 {
			t.Fatal("held throw must be a lob")
		}
		if !lob && s.Ball.VH > 3 {
			t.Fatal("tap must be a low throw")
		}
	}
}
func TestLobPassesOverStandingPlayer(t *testing.T) {
	s := isolated()
	s.Ball = Ball{X: 0, Z: 0, H: 3, Owner: -1, LastTouch: 16}
	s.step(dt, [2]Input{})
	if s.Ball.Owner >= 0 {
		t.Fatal("ground player intercepted high ball")
	}
	s.Players[7].Action = 2
	s.Players[7].ActionTime = .35
	s.Ball.H = 2.7
	s.Ball.VH = 0
	s.step(dt, [2]Input{})
	if s.Ball.Owner != 7 {
		t.Fatal("jump did not catch reachable high ball")
	}
}
func TestWallsGoalsAndHighGoalMiss(t *testing.T) {
	s := isolated()
	s.Ball = Ball{X: 4, Z: 11.1, H: 1, VZ: 24, Owner: -1, LastTouch: 7}
	s.step(dt, [2]Input{})
	if s.Ball.VZ >= 0 || s.Ball.Z > pitchZ {
		t.Fatal("side wall reflection failed")
	}
	for _, h := range []float64{1, 3} {
		s = isolated()
		s.Ball = Ball{X: 20.9, H: h, VX: 24, Owner: -1, LastTouch: 7}
		s.step(dt, [2]Input{})
		if h < 2 && s.Score[0] != 10 {
			t.Fatal("goal not counted")
		}
		if h > 2 && (s.Score[0] != 0 || s.Ball.VX >= 0) {
			t.Fatal("lob above crossbar must rebound, not score")
		}
	}
}
func TestStarBonusExtinguishAndMultiplier(t *testing.T) {
	s := isolated()
	s.Stars[0] = 15
	s.Ball = Ball{X: 13, Z: -11.1, H: 1, VZ: -24, Owner: -1, LastTouch: 7}
	s.step(dt, [2]Input{})
	if s.Score[0] != 12 || s.Stars[0] != 31 {
		t.Fatal("five stars bonus")
	}
	s.Ball = Ball{X: 13, Z: -11.1, H: 1, VZ: -24, Owner: -1, LastTouch: 16}
	s.step(dt, [2]Input{})
	if s.Score[0] != 10 || s.Stars[0] != 15 {
		t.Fatal("opponent must extinguish star and deduct points")
	}
	s.Ball = Ball{X: 0, Z: 11.1, H: 1, VZ: 24, Owner: -1, LastTouch: 7}
	s.step(dt, [2]Input{})
	if s.Multiplier != 1 || s.points(0, 2) != 3 || s.points(1, 10) != 10 {
		t.Fatal("multiplier ownership")
	}
	s.Ball = Ball{X: 0, Z: 11.1, H: 1, VZ: 24, Owner: -1, LastTouch: 7}
	s.step(dt, [2]Input{})
	if s.points(0, 10) != 20 {
		t.Fatal("double multiplier")
	}
}
func TestCentralDomePointsAndBounce(t *testing.T) {
	s := isolated()
	s.Ball = Ball{X: 1.2, Z: 4, H: .6, VX: -12, Owner: -1, LastTouch: 7}
	s.step(dt, [2]Input{})
	if s.Score[0] != 2 || s.Ball.VX <= 0 {
		t.Fatal("dome must reflect and award two points")
	}
}
func TestHalftimeAndMatchEnd(t *testing.T) {
	s := isolated()
	s.Time = dt / 2
	s.Stars = [2]uint8{31, 31}
	s.Multiplier = 2
	s.Score = [2]int{25, 18}
	s.step(dt, [2]Input{})
	if s.Period != 2 || s.Players[0].X < 0 || s.Stars[0] != 0 || s.Score[0] != 25 {
		t.Fatal("halftime must swap ends and clear targets, preserve score")
	}
	s.Pause = 0
	s.Time = dt / 2
	s.step(dt, [2]Input{})
	if !s.Over {
		t.Fatal("match end")
	}
}
func TestFullMatchAndWireBudget(t *testing.T) {
	s := initial()
	for i := 0; i < 15000 && !s.Over; i++ {
		s.simulate(dt, [2]Input{}, [2]bool{false, false})
		for _, p := range s.Players {
			if math.IsNaN(p.X) || math.Abs(p.X) > 20.501 || math.Abs(p.Z) > 10.701 {
				t.Fatal("invalid body position")
			}
		}
	}
	if !s.Over {
		t.Fatal("match stalled")
	}
	b := encodeSnapshot(Snapshot{State: s, Names: [2]string{strings.Repeat("界", 20), strings.Repeat("界", 20)}, Room: "ABCDEF"})
	if len(b) > 1150 {
		t.Fatalf("datagram exceeds MTU: %d", len(b))
	}
	t.Logf("18-player snapshot: %d bytes", len(b))
}
