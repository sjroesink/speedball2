package main

import "math"

// active_player_ai: selected field-player targets (WIP sub_D742 / sub_D97E).
func (s *State) pursuit(i, random int, distances *[18]int, inMultiplier bool) (interaction, float64, float64) {
	const unit = 22.4 / 576
	p, b := &s.Players[i], &s.Ball
	j := s.Controlled[1-p.Team]
	visible := s.worldInViewport(p.X, p.Z, 16)
	attack := visible && p.Stats[0]/2 > random
	x, z, vx, vz := b.X, b.Z, b.VX, b.VZ
	if visible && j >= 0 && j < len(s.Players) {
		q := &s.Players[j]
		if b.Owner == j || inMultiplier || (q.Stun <= 0 && q.Health > 0 && attack && distances[i] > distances[j]) {
			x, z, vx, vz = q.X, q.Z, q.moveX, q.moveZ
		}
	}
	if visible {
		for _, slot := range []int{0, 1, 6, 2, 3, 4, 5} {
			item := s.Pickups[slot]
			if item.Kind == 0 || item.Wait > 0 || !s.worldInViewport(item.X, item.Z, 0) || referenceDistance(item.X-p.X, item.Z-p.Z) == 0 {
				continue
			}
			if referenceDistance(item.X-b.X, item.Z-b.Z) <= distances[i] {
				x, z, vx, vz = item.X, item.Z, 0, 0
			}
			break
		}
	}
	tx, tz := predictedTarget(x, z, vx, vz, p.Stats[7])
	dx, dz := int(math.Round(tx/unit)-math.Round(p.X/unit)), int(math.Round(tz/unit)-math.Round(p.Z/unit))
	a := interaction{attack: attack}
	if absInt(dx) > absInt(dz)/2 {
		a.x = math.Copysign(1, float64(dx))
	}
	if absInt(dz) > absInt(dx)/2 {
		a.z = math.Copysign(1, float64(dz))
	}
	return a, tx, tz
}
