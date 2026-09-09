package main

import "testing"

func TestSelectionSwitchesDuringActionsAndBreaksTiesByRosterOrder(t *testing.T) {
	s := initial()
	for i := range s.Players {
		s.Players[i].Stun = 10
	}
	s.Ball.Owner = -1
	s.Ball.X, s.Ball.Z = 0, 0
	p := &s.Players[7]
	p.X, p.Z, p.Stun, p.Action, p.ActionTime = 2, 0, 0, 1, 0.3
	s.Players[0].X, s.Players[0].Z, s.Players[0].Stun = 2.5, 0, 0
	s.Players[8].X, s.Players[8].Z, s.Players[8].Stun = 1.5, 0, 0
	s.Controlled[0] = 7
	s.selectPlayers()
	if s.Controlled[0] != 8 {
		t.Fatal("action or goalkeeper bias prevented switching")
	}
	p.X = 1.5
	s.Controlled[0] = 7
	s.selectPlayers()
	if s.Controlled[0] != 8 {
		t.Fatal("equal distance should favor later roster index")
	}
	s.Ball.Owner = 7
	s.selectPlayers()
	if s.Controlled[0] != 7 {
		t.Fatal("ball owner must remain controlled")
	}
}

func TestAmigaTackleAndDamageRules(t *testing.T) {
	s := initial()
	p, q := &s.Players[7], &s.Players[16]
	p.Action = 1
	q.FX = -1
	if tackleThreshold(p, q, false) != 136 || tackleThreshold(p, q, true) != 123 {
		t.Fatal("front or goalkeeper threshold")
	}
	q.Action = 2
	q.jumping = true
	if tackleThreshold(p, q, true) != 139 {
		t.Fatal("jump penalty")
	}
	q.jumping = false
	if tackleThreshold(p, q, true) != 123 {
		t.Fatal("landing retains jump penalty")
	}
	q.Action = 0
	q.FX = 1
	if tackleThreshold(p, q, false) != 152 {
		t.Fatal("rear penalty")
	}
	if hitDamage(p, q) != 9 {
		t.Fatal("base damage")
	}
	p.Stats[5] = 250
	for i := range q.Stats {
		q.Stats[i] = 200
	}
	if hitDamage(p, q) != 12 {
		t.Fatal("power/stamina damage")
	}
	s.damage(7, 16)
	if q.Health != 100-12.*100/128 {
		t.Fatal("energy scaling")
	}
	for _, v := range q.Stats {
		if v != 194 {
			t.Fatal("attribute deterioration")
		}
	}
}
func TestAmigaRandomTrace(t *testing.T) {
	s := initial()
	for _, expected := range []uint32{2224703967, 3051111946, 980885458, 4032023480, 717936405, 454968731, 1172912480, 1627913718} {
		if s.randomByte() != int(expected&255) || s.RNG[0] != expected {
			t.Fatal("word-register trace", expected, s.RNG)
		}
	}
}
func TestFailedTackleDoesNotReroll(t *testing.T) {
	s := isolated()
	s.Players[16] = Player{Stats: defaultStats(), Health: 100, Team: 1, X: .7, FX: -1, Cooldown: 10}
	s.Ball = Ball{Owner: 16, X: .7, H: 1}
	s.step(dt, [2]Input{{Tackle: true, X: 1}, {}})
	s.step(dt, [2]Input{})
	if s.Ball.Owner != 16 || s.Players[16].Health != 100 {
		t.Fatal("failed roll took possession")
	}
	rng := s.RNG
	for n := 0; n < 4; n++ {
		s.Players[16].X = s.Players[7].X + .3
		s.Players[16].Z = s.Players[7].Z
		s.step(dt, [2]Input{})
	}
	if s.RNG != rng || s.Players[16].Health != 100 {
		t.Fatal("tackle retried")
	}
}
func TestPowerArmourRestoration(t *testing.T) {
	s := initial()
	p := &s.Players[7]
	for i := range p.Stats {
		p.Stats[i] = 180
	}
	s.pickup(7, 4)
	s.pickup(7, 15)
	s.damage(16, 7)
	if p.Gear != 0 || p.Stats[1] != 250 {
		t.Fatal("armour restoration under power")
	}
	s.matchClock(6)
	for _, v := range p.Stats {
		if v != 180 {
			t.Fatal("power restoration")
		}
	}
	s.pickup(7, 19)
	s.Tick = 1
	s.resetPitch()
	if s.Players[7].Stats[5] != 250 {
		t.Fatal("goal lost attributes")
	}
	s.pickup(7, 11)
	if s.Players[7].Stats != defaultStats() || s.Players[7].Gear != 0 {
		t.Fatal("full energy reset")
	}
}

func TestMovementTableBoundaries(t *testing.T) {
	s := initial()
	p := &s.Players[7]
	for _, c := range [][4]int{{100, 4, 5, 4}, {140, 4, 5, 4}, {141, 5, 6, 5}, {170, 5, 6, 5}, {171, 5, 7, 6}, {200, 5, 7, 6}, {201, 6, 8, 7}, {250, 6, 8, 7}} {
		p.Stats[3] = c[0]
		p.Action = 0
		if movementSpeed(p, true, false) != float64(c[1])*velocityUnit || movementSpeed(p, false, false) != float64(c[1]+1)*velocityUnit {
			t.Fatal("run/carry boundary", c)
		}
		p.Action = 1
		if movementSpeed(p, false, false) != float64(c[2])*velocityUnit || movementSpeed(p, false, true) != 8*velocityUnit {
			t.Fatal("slide boundary", c)
		}
		p.Action = 2
		if movementSpeed(p, false, false) != float64(c[3])*velocityUnit {
			t.Fatal("jump boundary", c)
		}
	}
	p.Action = 0
	p.Stats[3] = 250
	s.pickup(16, 6)
	if movementSpeed(p, false, false) != 5*velocityUnit {
		t.Fatal("slow baseline")
	}
	s.matchClock(6)
	if movementSpeed(p, false, false) != 7*velocityUnit {
		t.Fatal("slow restoration")
	}
}

func TestSharedMatchClock(t *testing.T) {
	s := initial()
	s.pickup(7, 4)
	s.matchClock(.99)
	if s.Time != 90 || s.Effect.Time != 6 {
		t.Fatal("early pulse")
	}
	s.matchClock(.01)
	if s.Time != 89 || s.Effect.Time != 5 {
		t.Fatal("shared pulse")
	}
	s.Players[16].Injury = 6
	s.matchClock(5)
	if s.Time != 89 || s.Effect.Kind != 0 || s.Players[7].Stats != defaultStats() {
		t.Fatal("medical pause power expiry")
	}
	s.Players[16].Injury = 0
	s.Pause = 2
	s.pickup(7, 10)
	s.matchClock(1)
	if s.Time != 89 || s.Effect.Time != 5 {
		t.Fatal("goal pause")
	}
}
