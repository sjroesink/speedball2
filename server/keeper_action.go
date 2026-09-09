package main

import "math"

// active_goalie_no_ball_ai, Amiga 0xfcf4–0xfd60: immediate actions.
func (s *State) keeperAction(i, distance, random int) (*interaction, float64, float64) {
	const unit = 22.4 / 576
	p, b := &s.Players[i], &s.Ball
	if b.Owner >= 0 && s.Players[b.Owner].Team == p.Team {
		return nil, 0, 0
	}
	qx, qz, vx, vz := b.X, b.Z, b.VX, b.VZ
	if b.Owner >= 0 {
		q := s.Players[b.Owner]
		qx, qz, vx, vz = q.X, q.Z, q.moveX, q.moveZ
	}
	side := p.Team
	if s.Period == 2 {
		side ^= 1
	}
	ymin, ymax := 960, 1104
	if side != 0 {
		ymin, ymax = 48, 192
	}
	x, y := int(math.Round(qz/unit+320)), int(math.Round(576-qx/unit))
	attack := s.worldInViewport(p.X, p.Z, 0) && distance <= 8*actionSustain(p.Stats[3])
	if attack {
		shift := max(0, min(2, (p.Stats[7]-100)/50))
		dx, dy := int(math.Round(vz/unit/25)), -int(math.Round(vx/unit/25))
		for shift > 0 {
			next := y + dy*(1<<shift)
			if (side != 0 || next <= ymax) && next >= ymin {
				break
			}
			shift--
		}
		x += dx * (1 << shift)
		y += dy * (1 << shift)
	} else {
		if vx != 0 || vz != 0 || p.Stats[0]/2 <= random {
			return nil, 0, 0
		}
		x = max(160, min(480, x))
		y = max(ymin, min(ymax, y))
	}
	tx, tz := float64(576-y)*unit, float64(x-320)*unit
	dx, dz := int(math.Round(tx/unit)-math.Round(p.X/unit)), int(math.Round(tz/unit)-math.Round(p.Z/unit))
	a := &interaction{attack: attack}
	if absInt(dx) > absInt(dz)/2 {
		a.x = math.Copysign(1, float64(dx))
	}
	if absInt(dz) > absInt(dx)/2 {
		a.z = math.Copysign(1, float64(dz))
	}
	return a, tx, tz
}
