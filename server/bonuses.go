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
	if b.LastTouch < 0 || b.H > 1.7 {
		return
	}
	t := s.Players[b.LastTouch].Team
	if math.Abs(b.X) < 1.3 {
		change := 1
		if t == 1 {
			change = -1
		}
		s.Multiplier = int(clamp(float64(s.Multiplier+change), -2, 2))
		s.event(9, t, s.Multiplier, b.X, b.Z, b.H)
		return
	}
	group := 0
	if b.Z > 0 {
		group = 1
	}
	sign := 1.
	if group == 1 {
		sign = -1
	}
	index := int(math.Round((b.X*sign - 5) / 2))
	if index < 0 || index > 4 || math.Abs(b.X*sign-(5+float64(index)*2)) > .7 {
		return
	}
	owner := group
	if s.Period == 2 {
		owner = 1 - group
	}
	mask := uint8(1 << index)
	if t == owner && s.Stars[group]&mask == 0 {
		s.Stars[group] |= mask
		points := s.points(t, 2)
		if s.Stars[group] == 31 {
			points += s.points(t, 10)
		}
		s.Score[t] += points
		s.event(8, t, points, b.X, b.Z, 1)
	} else if t != owner && s.Stars[group]&mask != 0 {
		s.Stars[group] &= ^mask
		points := s.points(owner, 2)
		s.Score[owner] = max(0, s.Score[owner]-points)
		s.event(10, owner, points, b.X, b.Z, 1)
	}
}
func (s *State) domeBounce() {
	b := &s.Ball
	if b.H > 1.4 {
		return
	}
	for _, z := range []float64{-4, 4} {
		dx, dz := b.X, b.Z-z
		d := math.Hypot(dx, dz)
		if d > .001 && d < 1.1 && b.VX*dx+b.VZ*dz < 0 {
			nx, nz := dx/d, dz/d
			dot := b.VX*nx + b.VZ*nz
			b.VX -= 2 * dot * nx
			b.VZ -= 2 * dot * nz
			b.X = nx * 1.12
			b.Z = z + nz*1.12
			if b.LastTouch >= 0 {
				t := s.Players[b.LastTouch].Team
				points := s.points(t, 2)
				s.Score[t] += points
				s.event(8, t, points, b.X, b.Z, b.H)
			}
		}
	}
}
