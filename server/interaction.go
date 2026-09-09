package main

import "math"

type interaction struct {
	attack bool
	x, z   float64
}

func (s *State) localInteraction(i int, distances *[18]int, random int) *interaction {
	p := &s.Players[i]
	const unit = 22.4 / 576
	for j, q := range s.Players {
		if q.Team == p.Team || q.Stun > 0 || q.Health <= 0 || distances[j] > 30 {
			continue
		}
		dx := int(math.Round(q.X/unit) - math.Round(p.X/unit))
		dz := int(math.Round(q.Z/unit) - math.Round(p.Z/unit))
		x, z := 0., 0.
		if absInt(dx) > absInt(dz)/2 {
			x = math.Copysign(1, float64(dx))
		}
		if absInt(dz) > absInt(dx)/2 {
			z = math.Copysign(1, float64(dz))
		}
		if x == 0 && z == 0 {
			x = s.direction(p.Team)
		}
		attack := s.Ball.Owner != i && (i%9 == 0 || s.Ball.Owner == j || p.Stats[0] > random)
		if !attack {
			x = -x
			z = -z
		}
		return &interaction{attack, x, z}
	}
	return nil
}
