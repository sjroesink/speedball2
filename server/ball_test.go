package main

import (
	"math"
	"reflect"
	"testing"
)

func TestOriginalSlowdownFrames(t *testing.T) {
	b := Ball{Owner: -1, H: .25, VX: 8 * velocityUnit, VZ: -8 * velocityUnit}
	setBallSpeed(&b, 100)
	frames := []int{}
	for frame := 1; frame <= 50; frame++ {
		before := b.VX
		slowBallFrame(&b)
		if b.VX != before {
			frames = append(frames, frame)
		}
		if math.Abs(b.VX+b.VZ) > 1e-9 {
			t.Fatal("diagonal asymmetry")
		}
	}
	if !reflect.DeepEqual(frames, []int{9, 21, 30, 36, 40, 43, 46, 48}) || b.VX != 0 {
		t.Fatal("slowdown trace", frames, b)
	}
}
func TestThrowSustainNotLaunchBoost(t *testing.T) {
	for _, lob := range []bool{false, true} {
		for _, attribute := range []int{100, 250} {
			s := initial()
			s.Players[7].Stats[4] = attribute
			s.throw(7, lob)
			if s.Ball.VX != 8*velocityUnit || s.Ball.SpeedTimer != attribute/2 {
				t.Fatal("launch/sustain")
			}
		}
	}
	b := Ball{Owner: -1, H: .25, VX: 8 * velocityUnit}
	setBallSpeed(&b, 250)
	for n := 0; n < 18; n++ {
		slowBallFrame(&b)
	}
	if b.VX != 8*velocityUnit || b.NextSlowdown != 108 {
		t.Fatal("premature slowdown")
	}
	slowBallFrame(&b)
	if math.Abs(b.VX-7*velocityUnit) > 1e-9 {
		t.Fatal("missing slowdown")
	}
}
func TestSlowdownClockAndGuards(t *testing.T) {
	a := Ball{Owner: -1, H: .25, VX: 8 * velocityUnit}
	setBallSpeed(&a, 100)
	b := a
	for n := 0; n < 48; n++ {
		slowBall(&a, 1./60)
	}
	for n := 0; n < 20; n++ {
		slowBall(&b, 1./25)
	}
	if a.VX != b.VX || a.SpeedTimer != b.SpeedTimer {
		t.Fatal("host tick rate changed slowdown")
	}
	b = Ball{Owner: -1, H: 1, VX: velocityUnit}
	slowBallFrame(&b)
	if b.VX != velocityUnit {
		t.Fatal("airborne stop")
	}
	b.H = .25
	slowBallFrame(&b)
	if b.VX != 0 {
		t.Fatal("grounded non-stop")
	}
	b = Ball{Owner: -1, H: .25, VX: 8 * velocityUnit, X: 21}
	setBallSpeed(&b, 100)
	slowBallFrame(&b)
	if b.SpeedTimer != 50 {
		t.Fatal("end-zone guard")
	}
	b.X = 0
	b.Owner = 7
	slowBallFrame(&b)
	if b.SpeedTimer != 50 {
		t.Fatal("owner guard")
	}
}

func TestWallAndWarpVelocityRules(t *testing.T) {
	b := Ball{VX: 12, VZ: -7, DirX: 1, DirZ: -1, SpeedTimer: 43, NextSlowdown: 31}
	reflectBall(&b, false)
	if b.VZ != 7 || b.DirZ != 1 || b.SpeedTimer != 43 {
		t.Fatal("side wall")
	}
	reflectBall(&b, true)
	if b.VX != -12 || b.DirX != -1 || b.SpeedTimer != 22 || b.NextSlowdown != 31 {
		t.Fatal("end wall")
	}
	for _, side := range []float64{-1, 1} {
		b = Ball{Z: side * 11.4, VX: 2, VZ: side * 3, DirX: 1, DirZ: side, H: 1}
		warpBall(&b, 250)
		if b.Z != -side*11.2 || b.VX != 8*velocityUnit || b.VZ != side*8*velocityUnit || b.H != 1 || b.SpeedTimer != 125 || b.NextSlowdown != 108 {
			t.Fatal("warp", b)
		}
	}
	b = Ball{Z: 11.3, VX: 2, VZ: .8, DirX: -1, DirZ: 0, H: 1}
	warpBall(&b, 100)
	if b.VX != -8*velocityUnit || b.VZ != .8 {
		t.Fatal("axial drift")
	}
}

func TestReleaseSteering(t *testing.T) {
	for _, lob := range []bool{false, true} {
		for _, sign := range []float64{-1, 1} {
			s := initial()
			s.Players[7].FX = sign
			s.Players[7].FZ = 0
			s.throw(7, lob, Input{Z: -sign})
			if s.Ball.VX != sign*8*velocityUnit || s.Ball.VZ != -sign*4*velocityUnit || s.Ball.DirZ != 0 {
				t.Fatal("upfield steering")
			}
			s.Players[7].FX = 0
			s.Players[7].FZ = sign
			s.throw(7, lob, Input{X: -sign})
			if s.Ball.VX != -sign*4*velocityUnit || s.Ball.VZ != sign*8*velocityUnit {
				t.Fatal("transverse steering")
			}
			s.Players[7].FX = sign
			s.throw(7, lob, Input{X: -sign, Z: -sign})
			if s.Ball.VX != sign*8*velocityUnit || s.Ball.VZ != sign*8*velocityUnit {
				t.Fatal("diagonal steering")
			}
		}
	}
	s := isolated()
	s.Players[7].X = 4
	s.logicalView = [2]int{160, 380}
	s.Ball.Owner = 7
	s.step(dt, [2]Input{{X: 1, Shoot: true}, {}})
	for n := 1; n < 11; n++ {
		s.step(dt, [2]Input{{Z: 1}, {}})
	}
	if s.Ball.Owner != -1 || s.Ball.VZ != 4*velocityUnit {
		t.Fatal("release input not sampled")
	}
	vx, vz := s.Ball.VX, s.Ball.VZ
	s.step(dt, [2]Input{{X: -1, Z: -1}, {}})
	if s.Ball.VX != vx || s.Ball.VZ != vz {
		t.Fatal("continued flight steering")
	}
}

func TestFlightStageTimings(t *testing.T) {
	b := Ball{}
	startFlight(&b, true)
	transitions := [][2]int{}
	previous := -1
	for frame := 1; frame <= 60; frame++ {
		flightStep(&b, 1./25)
		if b.FlightStage != previous {
			transitions = append(transitions, [2]int{frame, b.FlightStage})
		}
		previous = b.FlightStage
	}
	expected := [][2]int{{1, 1}, {3, 2}, {6, 3}, {10, 4}, {15, 5}, {21, 6}, {28, 5}, {34, 4}, {39, 3}, {43, 2}, {46, 1}, {48, 0}}
	if !reflect.DeepEqual(transitions, expected) || b.H != .25 || b.VH != 0 {
		t.Fatal("flight trace", transitions)
	}
	startFlight(&b, false)
	for i := 0; i < 16; i++ {
		flightStep(&b, 1./25)
	}
	if b.FlightStage != 1 {
		t.Fatal("low throw early landing")
	}
	flightStep(&b, 1./25)
	if b.FlightStage != 0 {
		t.Fatal("low landing")
	}
	a := Ball{}
	startFlight(&a, true)
	startFlight(&b, true)
	for i := 0; i < 60; i++ {
		flightStep(&a, 1./60)
	}
	for i := 0; i < 25; i++ {
		flightStep(&b, 1./25)
	}
	if a.FlightStage != 6 || a.FlightIndex != b.FlightIndex {
		t.Fatal("host clock drift")
	}
}

func TestFlightStageCatchAndGoal(t *testing.T) {
	for _, jumping := range []bool{false, true} {
		s := isolated()
		s.Players[7].Stun = 10
		s.Players[16] = Player{Health: 100, Team: 1, X: 4, Cooldown: 10}
		if jumping {
			s.Players[16].Action = 2
			s.Players[16].ActionTime = .4
			s.Players[16].jumping = true
		}
		s.Ball = Ball{Owner: -1, X: 4}
		startFlight(&s.Ball, true)
		flightStep(&s.Ball, 21./25)
		s.step(dt, [2]Input{})
		expected := -1
		if jumping {
			expected = 16
		}
		if s.Ball.Owner != expected {
			t.Fatal("peak catch", jumping, s.Ball.Owner)
		}
		if jumping && s.Event.Kind == 16 {
			t.Fatal("vertical-only catch must not emit impact cue")
		}
	}
	s := isolated()
	s.Players[7].Stun = 10
	s.Ball = Ball{Owner: -1, X: 21.1, VX: 8 * velocityUnit}
	startFlight(&s.Ball, true)
	flightStep(&s.Ball, 6./25)
	s.step(dt, [2]Input{})
	s.step(dt, [2]Input{})
	if s.Score != [2]int{} || s.Ball.VX >= 0 {
		t.Fatal("stage three goal")
	}
}

func TestSlowdownTerrainBoundary(t *testing.T) {
	const u = 22.4 / 576
	for _, y := range []int{47, 48, 1104, 1105} {
		for _, error := range []float64{-1e-12, 0, 1e-12} {
			b := Ball{Owner: -1, X: float64(576-y)*u + error, VX: 8 * velocityUnit, SpeedTimer: 40, NextSlowdown: 50, H: .25}
			slowBallFrame(&b)
			timer, speed := 40, 8.
			if y >= 48 && y <= 1104 {
				timer, speed = 39, 7
			}
			if b.SpeedTimer != timer || math.Abs(b.VX-speed*velocityUnit) > 1e-9 {
				t.Fatal("terrain boundary", y, error, b)
			}
		}
	}
}

func TestThrowPreservesCarriedPosition(t *testing.T) {
	for facing := 0; facing < 8; facing++ {
		for _, lob := range []bool{false, true} {
			s := initial()
			p := &s.Players[7]
			p.FX = math.Round(math.Cos(float64(facing) * math.Pi / 4))
			p.FZ = math.Round(math.Sin(float64(facing) * math.Pi / 4))
			s.Ball.Owner = 7
			s.Ball.X = p.X + .31
			s.Ball.Z = p.Z - .27
			x, z := s.Ball.X, s.Ball.Z
			s.throw(7, lob)
			if s.Ball.X != x || s.Ball.Z != z || s.Ball.Owner != -1 || s.Event.X != x || s.Event.Z != z {
				t.Fatal("release moved ball", facing, lob)
			}
		}
	}
}
