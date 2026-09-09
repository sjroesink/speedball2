package main

import "math"

func (s *State) points(team, base int) int {
	level := s.Multiplier
	if (team == 0 && level > 0) || (team == 1 && level < 0) {
		return base + base*int(math.Abs(float64(level)))/2
	}
	return base
}
func (s *State) wallBonus() {
	b := &s.Ball
	if b.LastTouch < 0 {
		return
	}
	t := s.Players[b.LastTouch].Team
	if b.Owner >= 0 && s.Players[b.Owner].Action != 3 {
		return
	}
	terrainX, terrainY := int(math.Round(320+b.Z/terrainUnit)), int(math.Round(576-b.X/terrainUnit))
	group := -1
	if terrainX <= 32 {
		group = 0
	} else if terrainX >= 608 {
		group = 1
	}
	if group < 0 {
		return
	}
	start := 384
	if group == 1 {
		start = 608
	}
	if terrainY < start || terrainY >= start+160 {
		return
	}
	index := (terrainY - start) >> 5
	owner := group
	if s.Period == 2 {
		owner = 1 - group
	}
	mask := uint8(1 << index)
	if t == owner && s.Stars[group]&mask == 0 {
		s.Stars[group] |= mask
		points := s.points(t, 2)
		s.Score[t] += points
		s.event(8, t, points, b.X, b.Z, 1)
	} else if t != owner && s.Stars[group]&mask != 0 {
		s.Stars[group] &= ^mask
		points := 2
		s.Score[owner] = max(0, s.Score[owner]-points)
		s.event(10, owner, points, b.X, b.Z, 1)
	}
}
func (s *State) domeBounce() {
	b := &s.Ball
	if b.Owner >= 0 || b.FlightKind != 0 && b.FlightStage > 2 || b.FlightKind == 0 && b.H > 1.25 {
		return
	}
	for _, center := range []float64{256 * terrainUnit, -256 * terrainUnit} {
		dx, dz := int(math.Round((b.X-center)/terrainUnit)), int(math.Round(b.Z/terrainUnit))
		ax, az := int(math.Abs(float64(dx))), int(math.Abs(float64(dz)))
		if ax > 16 || az > 16 || referenceDistance(float64(dx)*terrainUnit, float64(dz)*terrainUnit) > 16 {
			continue
		}
		fx, fz := 0., 0.
		if ax > az>>1 {
			fx = math.Copysign(1, float64(dx))
		}
		if az > ax>>1 {
			fz = math.Copysign(1, float64(dz))
		}
		if fx == 0 && fz == 0 {
			continue
		}
		b.DirX, b.DirZ = fx, fz
		b.VX, b.VZ = fx*8*velocityUnit, fz*8*velocityUnit
		if b.FlightKind != 0 {
			startFlight(b, b.FlightKind == 2)
		}
		attribute := 100
		if b.LastTouch >= 0 {
			ensureStats(&s.Players[b.LastTouch])
			attribute = s.Players[b.LastTouch].Stats[4]
		}
		setBallSpeed(b, attribute)
		if b.LastTouch >= 0 {
			team := s.Players[b.LastTouch].Team
			points := s.points(team, 2)
			s.Score[team] += points
			s.event(8, team, points, b.X, b.Z, b.H)
		}
	}
}

// update_match_time calls check_all_stars_lit every 25 game ticks (two PAL video frames each).
func (s *State) matchClock(dt float64) {
	s.ClockPhase += dt
	for s.ClockPhase >= 1-1e-9 {
		s.ClockPhase = math.Max(0, s.ClockPhase-1)
		for group, bits := range s.Stars {
			if bits != 31 {
				continue
			}
			s.Stars[group] = 0
			owner := group
			if s.Period == 2 {
				owner = 1 - group
			}
			points := s.points(owner, 10)
			s.Score[owner] += points
			s.event(8, owner, points, 0, 0, 1)
		}
		if s.RestartPhase == 0 && s.Pause <= 0 && !s.hasInjury() {
			s.Time = math.Max(0, s.Time-1)
		}
		if s.Effect.Kind != 0 {
			s.Effect.Time = math.Max(0, s.Effect.Time-1)
			if s.Effect.Time == 0 {
				s.restorePower()
				s.Effect.Kind = 0
			}
		}

	}
}
