package main

import "math"

type interaction struct {
	attack bool
	x, z   float64
}

func (s *State) localInteraction(i int, distances *[18]int, random int) *interaction {
	p := &s.Players[i]
	if !s.worldInViewport(p.X, p.Z, 0) {
		return nil
	}
	const unit = 22.4 / 576
	for j, q := range s.Players {
		if q.Team == p.Team || q.Stun > 0 || q.Health <= 0 || distances[j] > 30 || !s.worldInViewport(q.X, q.Z, 0) {
			continue
		}
		attack := s.Ball.Owner != i && (i%9 == 0 || s.Ball.Owner == j || p.Stats[0] > random)
		tx, tz := q.X, q.Z
		if attack && s.Controlled[p.Team] == i {
			tx, tz = predictedTarget(q.X, q.Z, q.moveX, q.moveZ, p.Stats[7])
		}
		dx := int(math.Round(tx/unit) - math.Round(p.X/unit))
		dz := int(math.Round(tz/unit) - math.Round(p.Z/unit))
		x, z := 0., 0.
		if absInt(dx) > absInt(dz)/2 {
			x = math.Copysign(1, float64(dx))
		}
		if absInt(dz) > absInt(dx)/2 {
			z = math.Copysign(1, float64(dz))
		}
		if x == 0 && z == 0 && !(attack && s.Controlled[p.Team] == i) {
			x = s.direction(p.Team)
		} else if !attack {
			x = -x
			z = -z
		}
		return &interaction{attack, x, z}
	}
	selected := s.Controlled[p.Team]
	q := &s.Players[selected]
	if selected != i && q.Stun <= 0 && q.Health > 0 {
		a, b := physicalPoseData.Origins[p.physicalSprite], physicalPoseData.Origins[q.physicalSprite]
		xd := q.X - float64(b[1])*unit - p.X + float64(a[1])*unit
		zd := q.Z + float64(b[0])*unit - p.Z
		if math.Abs(xd) <= 30*unit+1e-9 && math.Abs(zd) <= 30*unit+1e-9 && referenceDistance(xd, zd) <= 32 {
			dx := int(math.Round(q.X/unit) - math.Round(p.X/unit))
			dz := int(math.Round(q.Z/unit) - math.Round(p.Z/unit))
			x, z := 0., 0.
			if absInt(dx) > absInt(dz)/2 {
				x = -math.Copysign(1, float64(dx))
			}
			if absInt(dz) > absInt(dx)/2 {
				z = -math.Copysign(1, float64(dz))
			}
			if x == 0 && z == 0 {
				x = s.direction(p.Team)
			}
			return &interaction{attack: false, x: x, z: z}
		}
	}
	return nil
}
