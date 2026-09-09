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
	s.step(dt, [2]Input{{TackleID: 1, X: 1}, {}})
	if s.Players[7].Action != 1 {
		t.Fatal("a short tap between ticks was lost")
	}
	s = isolated()
	s.Players[7].X = 4
	s.logicalView = [2]int{160, 380}
	s.Ball.Owner = 7
	for i := 0; i < 11; i++ {
		s.step(dt, [2]Input{{Fire: 1}, {}})
	}
	if s.Ball.Owner != -1 {
		t.Fatal("short throw tap was lost")
	}
}

func isolated() State {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 10
	}
	s.Players[7] = Player{Health: 100, X: 0, Z: 0, Team: 0, FX: 1}
	s.Controlled = [2]int{7, 16}
	return s
}
func TestVisibleTackleMissAndCooldown(t *testing.T) {
	s := isolated()
	s.Ball.X = 9
	s.Ball.Z = 9
	s.step(dt, [2]Input{{Tackle: true, X: 1}, {}})
	p := s.Players[7]
	if p.Action != 1 || p.ActionTime <= 0 || p.X < .075 || p.Cooldown <= 0 {
		t.Fatal("tackle without contact must slide visibly")
	}
	for i := 0; i < 65; i++ {
		s.step(dt, [2]Input{{Tackle: true, X: 1}, {}})
	}
	if s.Players[7].Action == 1 {
		t.Fatal("holding tackle must not retrigger")
	}
}
func TestTackleKnockdownAndPossession(t *testing.T) {
	s := isolated()
	s.RNG = [2]uint32{}
	s.Players[16] = Player{Health: 100, X: 1.1, Team: 1, FX: -1}
	s.Ball = Ball{X: 1.1, H: 1, Owner: 16}
	s.step(dt, [2]Input{{Tackle: true, X: 1}, {}})
	s.step(dt, [2]Input{})
	if s.Players[16].Stun < 1 || s.Players[16].Action != 4 || s.Ball.Owner != 7 {
		t.Fatalf("no knockdown / possession transfer: %+v", s.Ball)
	}
}
func TestDirectionalLowAndHighThrow(t *testing.T) {
	for _, lob := range []bool{false, true} {
		s := isolated()
		s.logicalView = [2]int{160, 380}
		s.Players[7].X = 4 // Keep the throw lane clear of the central dome.
		s.Ball.Owner = 7
		s.step(dt, [2]Input{{Z: 1, Shoot: true}, {}})
		if s.Ball.Owner != 7 || s.Players[7].Action != 3 {
			t.Fatal("missing throw wind-up")
		}
		for i := 1; i < 11; i++ {
			s.step(dt, [2]Input{{Z: 1, Shoot: lob}, {}})
		}

		if s.Ball.Owner != -1 || s.Ball.VZ < 7 || math.Abs(s.Ball.VX) > 1 {
			t.Fatal("throw must follow facing, not autoaim at goal")
		}
		if lob && s.Ball.FlightKind != 2 {
			t.Fatal("held throw must be a lob")
		}
		if !lob && s.Ball.FlightKind != 1 {
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
	s.Players[7].jumping = true
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
	s.step(dt, [2]Input{})
	if s.Ball.VZ >= 0 || s.Ball.Z > pitchZ {
		t.Fatal("side wall reflection failed")
	}
	for _, h := range []float64{1, 3} {
		s = isolated()
		s.Ball = Ball{X: 20.9, H: h, VX: 24, Owner: -1, LastTouch: 7}
		s.step(dt, [2]Input{})
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
	s.Ball = Ball{X: 48 * terrainUnit, Z: -11.1, H: 1, VZ: -24, Owner: -1, LastTouch: 7}
	s.step(dt, [2]Input{})
	s.step(dt, [2]Input{})
	if s.Score[0] != 2 || s.Stars[0] != 31 {
		t.Fatal("five stars bonus")
	}
	s.Ball = Ball{X: 48 * terrainUnit, Z: -11.1, H: 1, VZ: -24, Owner: -1, LastTouch: 16}
	s.step(dt, [2]Input{})
	s.step(dt, [2]Input{})
	if s.Score[0] != 0 || s.Stars[0] != 15 {
		t.Fatal("opponent must extinguish star and deduct points")
	}
	s.Ball = Ball{X: 0, Z: 11.1, H: 1, VZ: 24, Owner: -1, LastTouch: 7}
	s.step(dt, [2]Input{})
	s.step(dt, [2]Input{})
	if s.Multiplier != 0 {
		t.Fatal("wall hit must not activate a multiplier")
	}

}
func TestCentralDomePointsAndBounce(t *testing.T) {
	s := isolated()
	s.Ball = Ball{X: 256*terrainUnit + .4, Z: 0, H: .6, VX: -12, Owner: -1, LastTouch: 7}
	s.domeBounce()
	if s.Score[0] != 2 || s.Ball.VX <= 0 {
		t.Fatal("dome must reflect and award two points")
	}
}
func TestHalftimeAndMatchEnd(t *testing.T) {
	s := isolated()
	s.Time = 1
	s.ClockPhase = 1 - dt
	s.Stars = [2]uint8{31, 31}
	s.Multiplier = 2
	s.Score = [2]int{25, 18}
	s.step(dt, [2]Input{})
	if s.Period != 2 || s.Players[0].X < 0 || s.Stars[0] != 0 || s.Score[0] != 45 || s.Score[1] != 28 {
		t.Fatal("halftime must pay completed banks before swapping ends")
	}
	s.Pause = 0
	s.Time = 1
	s.ClockPhase = 1 - dt
	s.step(dt, [2]Input{})
	if !s.Over {
		t.Fatal("match end")
	}
}
func TestFullMatchAndWireBudget(t *testing.T) {
	s := initial()
	for i := 0; i < 15000 && !s.Over; i++ {
		s.simulate(simulationStep, [2]Input{}, [2]bool{false, false})
		for _, p := range s.Players {
			if math.IsNaN(p.X) || math.Abs(p.X) > playerLimitX+0.001 || math.Abs(p.Z) > playerLimitZ+0.001 {
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

func TestEightWayMovement(t *testing.T) {
	a, b := isolated(), isolated()
	a.Ball.X = 8
	a.Ball.Z = 8
	b.Ball.X = 8
	b.Ball.Z = 8
	a.step(dt, [2]Input{{X: 1}, {}})
	b.step(dt, [2]Input{{X: 1, Z: .7}, {}})
	if math.Abs(b.Players[7].X-a.Players[7].X) > 1e-8 || math.Abs(b.Players[7].X-b.Players[7].Z) > 1e-8 {
		t.Fatal("unequal eight-way movement")
	}
}

func TestAIOutlet(t *testing.T) {
	s := isolated()
	s.Players[6] = Player{Health: 100, X: 6, Z: 3, Team: 0}
	if s.passTarget(7) != 6 {
		t.Fatal("free teammate ignored")
	}
	s.Players[16] = Player{Health: 100, X: 6, Z: 3, Team: 1}
	if s.passTarget(7) != -1 {
		t.Fatal("marked teammate selected")
	}
	s.Players[16].Stun = 10
	s.Players[6].Stun = 1
	if s.passTarget(7) != -1 {
		t.Fatal("stunned teammate selected")
	}
}

func TestOriginalGoalWidth(t *testing.T) {
	s := isolated()
	s.Ball = Ball{X: 20.9, Z: 2.2, H: 1, VX: 24, Owner: -1, LastTouch: -1}
	s.step(dt, [2]Input{})
	s.step(dt, [2]Input{})
	if s.Score[0] != 0 || s.Ball.VX >= 0 {
		t.Fatal("wide shot must rebound off end wall")
	}
}

func TestTackleDirectPossessionSingleContact(t *testing.T) {
	s := isolated()
	s.RNG = [2]uint32{}
	s.Players[16].X = .7
	s.Players[16].Z = 0
	s.Players[16].Stun = 0
	s.Players[16].Cooldown = 10
	s.Players[17].X = .8
	s.Players[17].Z = 0
	s.Players[17].Stun = 0
	s.Players[17].Cooldown = 10
	s.Players[17].aiWait = 100
	s.Ball = Ball{Owner: 16, LastTouch: 16, X: .7, H: 1}
	s.step(dt, [2]Input{{Tackle: true, X: 1}, {}})
	if s.Ball.Owner != 16 {
		t.Fatal("slide hit before first thinking tick")
	}
	s.step(dt, [2]Input{})
	if s.Ball.Owner != 7 || s.Controlled[0] != 7 {
		t.Fatal("tackle must immediately transfer possession", s.Ball.Owner)
	}
	if s.Players[16].Stun <= 0 {
		t.Fatal("first opponent not tackled")
	}
	if s.Players[17].Health != 100 {
		t.Fatal("second opponent hit during same slide")
	}
	for n := 0; n < 4; n++ {
		s.Players[17].X = s.Players[7].X + .3
		s.Players[17].Z = s.Players[7].Z
		s.step(dt, [2]Input{})
	}
	if s.Players[17].Health != 100 {
		t.Fatal("slide checked contact again on a later tick")
	}
}

func TestStarBankClockAndExtinguish(t *testing.T) {
	for _, period := range []int{1, 2} {
		s := initial()
		s.Period = period
		owner := period - 1
		s.Multiplier = 2
		if owner == 1 {
			s.Multiplier = -2
		}
		s.Stars[0] = 30
		s.Ball = Ball{Owner: -1, X: 176 * terrainUnit, Z: -11.2, H: 3, LastTouch: owner*9 + 7}
		s.wallBonus()
		if s.Score[owner] != 4 || s.Stars[0] != 31 {
			t.Fatal("star hit")
		}
		s.matchClock(.99)
		if s.Score[owner] != 4 {
			t.Fatal("early bank bonus")
		}
		s.matchClock(.01)
		if s.Score[owner] != 24 || s.Stars[0] != 0 {
			t.Fatal("bank clear")
		}
		s.matchClock(1)
		if s.Score[owner] != 24 {
			t.Fatal("repeat bonus")
		}
		s.wallBonus()
		if s.Score[owner] != 28 || s.Stars[0] != 1 {
			t.Fatal("bank cannot restart")
		}
	}
	s := initial()
	s.Multiplier = 2
	s.Stars[0] = 31
	s.Score[0] = 20
	s.Ball = Ball{Owner: -1, X: 176 * terrainUnit, Z: -11.2, H: 1, LastTouch: 16}
	s.wallBonus()
	if s.Score[0] != 18 || s.Stars[0] != 30 {
		t.Fatal("extinguish penalty")
	}
	s.matchClock(1)
	if s.Score[0] != 18 {
		t.Fatal("cancelled bonus awarded")
	}
}
