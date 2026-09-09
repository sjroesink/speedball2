package main

import "math"

// set_ball_speed (0x108e0): throw controls the time before velocity steps down.
func setBallSpeed(b *Ball, attribute int) {
	b.SpeedTimer = attribute >> 1
	b.NextSlowdown = (attribute >> 2) + (attribute >> 3) + (attribute >> 4)
	b.SlowFraction = 0
}
func slowBallFrame(b *Ball) {
	if b.Owner >= 0 || (b.VX == 0 && b.VZ == 0) {
		return
	}
	if b.VX != 0 && math.Abs(b.X) > 528*22.4/576 {
		return
	}
	if b.SpeedTimer == 0 || b.NextSlowdown > b.SpeedTimer {
		if b.SpeedTimer > 0 {
			b.NextSlowdown = (b.NextSlowdown >> 1) + (b.NextSlowdown >> 2)
		}
		for _, v := range []*float64{&b.VX, &b.VZ} {
			reduced := math.Copysign(math.Max(0, math.Abs(*v)-velocityUnit), *v)
			if math.Abs(reduced) < 1e-9 {
				reduced = 0
			}
			if reduced != 0 || b.H <= .25 {
				*v = reduced
			}
		}
	}
	if b.SpeedTimer > 0 {
		b.SpeedTimer--
	}
}
func slowBall(b *Ball, dt float64) {
	b.SlowFraction += dt * 25
	for b.SlowFraction >= 1-1e-9 {
		b.SlowFraction = math.Max(0, b.SlowFraction-1)
		slowBallFrame(b)
	}
}

func reflectBall(b *Ball, longitudinal bool) {
	if longitudinal {
		b.VX = -b.VX
		b.DirX = -b.DirX
		b.SpeedTimer -= b.SpeedTimer / 2
	} else {
		b.VZ = -b.VZ
		b.DirZ = -b.DirZ
	}
}
func warpBall(b *Ball, attribute int) {
	dx, dz := b.DirX, b.DirZ
	if dx == 0 && dz == 0 {
		dx, dz = eightWay(b.VX, b.VZ)
	}
	b.Z = -math.Copysign(11.2, b.Z)
	drift := b.VZ
	b.VX = dx * 8 * velocityUnit
	b.VZ = dz * 8 * velocityUnit
	if dz == 0 {
		b.VZ = drift
	}
	b.DirX, b.DirZ = dx, dz
	setBallSpeed(b, attribute)
}

// throwing_action_fn 0x10882: only a zero component can receive release input.
func steerRelease(b *Ball, input Input) {
	sign := func(v float64) float64 {
		if v == 0 {
			return 0
		}
		return math.Copysign(1, v)
	}
	if b.VZ == 0 {
		b.VZ = sign(input.Z) * 4 * velocityUnit
	} else if b.VX == 0 {
		b.VX = sign(input.X) * 4 * velocityUnit
	}
}

var highFlight = []int{1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 1, 1, 0}

// Amiga anim_ball_launch at 0x6d8a.
var launchFlight = []int{0, 7, 7, 8, 8, 9, 9, 10, 10, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 10, 10, 9, 9, 8, 8, 7, 7, 0}
var lowFlight = []int{1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0}

func startFlight(b *Ball, high bool) {
	b.FlightKind = 1
	if high {
		b.FlightKind = 2
	}
	b.FlightIndex = -1
	b.FlightStage = 1
	b.FlightFraction = 0
	b.H = .75
	b.VH = 0
}
func flightStep(b *Ball, dt float64) bool {
	if b.FlightKind == 0 {
		return false
	}
	frames := lowFlight
	if b.FlightKind == 3 {
		frames = launchFlight
	}
	if b.FlightKind == 2 {
		frames = highFlight
	}
	b.FlightFraction += dt * 25
	for b.FlightFraction >= 1-1e-9 {
		b.FlightFraction = math.Max(0, b.FlightFraction-1)
		b.FlightIndex = min(b.FlightIndex+1, len(frames)-1)
		b.FlightStage = frames[b.FlightIndex]
	}
	heightStage := b.FlightStage
	if b.FlightKind == 3 && heightStage >= 7 {
		heightStage -= 6
	}
	b.H = .25 + float64(heightStage)*.5
	b.VH = 0
	return true
}
