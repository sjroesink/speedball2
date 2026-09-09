package main

import "math"

// active_player_ai: no-item, visible field-player branch (WIP sub_D742).
func (s *State) pursuit(i, random int, distances *[18]int, inMultiplier bool) (interaction, float64, float64) {
	const unit = 22.4 / 576
	p, b := &s.Players[i], &s.Ball
	j := s.Controlled[1-p.Team]
	attack := p.Stats[0]/2 > random
	x, z, vx, vz := b.X, b.Z, b.VX, b.VZ
	if j >= 0 && j < len(s.Players) {
		q := &s.Players[j]
		if b.Owner == j || inMultiplier || (q.Stun <= 0 && q.Health > 0 && attack && distances[i] > distances[j]) {
			x, z, vx, vz = q.X, q.Z, q.moveX, q.moveZ
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
