package main

import "math"

const terrainUnit = 22.4 / 576

func enterMultiplier(b *Ball) bool {
	if b.Owner >= 0 || b.MultiplierPath != 0 {
		return false
	}
	if b.FlightKind != 0 && b.FlightStage > 2 || b.FlightKind == 0 && b.H > 1.25 {
		return false
	}
	x, y := math.Round(320+b.Z/terrainUnit), math.Round(576-b.X/terrainUnit)
	if x < 24 || x > 616 || x >= 64 && x <= 576 {
		return false
	}
	left := x < 64
	origin := 512.
	if left {
		origin = 576
	}
	if y < origin || y > origin+64 {
		return false
	}
	dx, dz := b.DirX, b.DirZ
	if dx == 0 && dz == 0 {
		if b.VX != 0 {
			dx = math.Copysign(1, b.VX)
		}
		if b.VZ != 0 {
			dz = math.Copysign(1, b.VZ)
		}
	}
	if (left && x >= 48 || !left && x <= 592) && dz == 0 && dx != 0 {
		if left {
			if dx > 0 {
				b.MultiplierPath = 1
			} else {
				b.MultiplierPath = 2
			}
		} else {
			if dx < 0 {
				b.MultiplierPath = 3
			} else {
				b.MultiplierPath = 4
			}
		}
		b.MultiplierIndex, b.MultiplierFraction = 0, 1
		b.FlightKind, b.H, b.VH = 0, .75, 0
		return true
	}
	oldX, oldY := x-2*b.VZ/velocityUnit, y+2*b.VX/velocityUnit
	if left && oldX >= 64 || !left && oldX <= 576 {
		b.VZ, b.DirZ = -b.VZ, -dz
	}
	if oldY < origin || oldY > origin+64 {
		b.VX, b.DirX = -b.VX, -dx
	}
	return false
}

func (s *State) runMultiplier(dt float64) bool {
	b := &s.Ball
	if b.MultiplierPath == 0 {
		return false
	}
	if b.Owner >= 0 {
		b.MultiplierPath = 0
		return false
	}
	b.MultiplierFraction += dt * 25
	for b.MultiplierFraction >= 1-1e-9 {
		b.MultiplierFraction = math.Max(0, b.MultiplierFraction-1)
		path := multiplierPaths[b.MultiplierPath-1]
		if b.MultiplierIndex == len(path) {
			b.MultiplierPath = 0
			positive := b.VX > 0
			b.VX = -8 * velocityUnit
			if positive {
				b.VX = 8 * velocityUnit
			}
			b.H = .25
			attribute := 100
			if b.LastTouch >= 0 {
				ensureStats(&s.Players[b.LastTouch])
				attribute = s.Players[b.LastTouch].Stats[4]
			}
			setBallSpeed(b, attribute)
			return false
		}
		left := b.MultiplierPath <= 2
		xy := path[b.MultiplierIndex]
		b.MultiplierIndex++
		originX, originY := 640, 512
		if left {
			originX, originY = 0, 576
		}
		b.X, b.Z = float64(576-originY-xy[1])*terrainUnit, float64(originX+xy[0]-320)*terrainUnit
		if b.MultiplierIndex == 22 && b.LastTouch >= 0 {
			team, delta := s.Players[b.LastTouch].Team, 1
			if team == 1 {
				delta = -1
			}
			next := max(-2, min(2, s.Multiplier+delta))
			if next != s.Multiplier {
				s.Multiplier = next
				s.event(9, team, next, b.X, b.Z, b.H)
			}
		}
	}
	return true
}

func (s *State) multiplierStep(dt float64) bool {
	if enterMultiplier(&s.Ball) {
		return s.runMultiplier(0)
	}
	return s.runMultiplier(dt)
}
