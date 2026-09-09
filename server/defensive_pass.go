package main

import "math"

type passPlan struct {
	receiver int
	x, z     float64
	high     bool
	key      int
}

func (s *State) defensivePass(i int, distances *[18]int) *passPlan {
	const unit = 22.4 / 576
	role := func(j int) int { return [9]int{0, 1, 1, 2, 2, 2, 4, 4, 3}[j%9] }
	p := &s.Players[i]
	aim := func(j int) (float64, float64, int) {
		q := &s.Players[j]
		x, z := predictedTarget(q.X, q.Z, q.moveX, q.moveZ, p.Stats[7])
		dx, dz := int(math.Round(x/unit)-math.Round(p.X/unit)), int(math.Round(z/unit)-math.Round(p.Z/unit))
		fx, fz := 0, 0
		if absInt(dx) > absInt(dz)/2 {
			fx = 1
			if dx < 0 {
				fx = -1
			}
		}
		if absInt(dz) > absInt(dx)/2 {
			fz = 1
			if dz < 0 {
				fz = -1
			}
		}
		return x, z, fx*3 + fz
	}
	selected := s.Controlled[1-p.Team]
	other, limit := -1, p.Stats[7]*2
	for j, q := range s.Players {
		if q.Team == p.Team || j == selected || q.Stun > 0 || q.Health <= 0 || distances[j] > limit {
			continue
		}
		other, limit = j, distances[j]
	}
	blocked := [2]int{}
	if !s.Ball.Charged {
		if selected >= 0 && s.Players[selected].Stun <= 0 && s.Players[selected].Health > 0 {
			_, _, blocked[0] = aim(selected)
		}
		if other >= 0 {
			_, _, blocked[1] = aim(other)
		}
	}
	receiver, distance := -1, p.Stats[7]*2
	minimum := role(i) + 1
	if role(i) == 0 {
		minimum = 2
	}
	for ; minimum > 0; minimum-- {
		for j, q := range s.Players {
			if q.Team != p.Team || j == i || q.Stun > 0 || q.Health <= 0 || role(j) < minimum || distances[j] > distance {
				continue
			}
			_, _, key := aim(j)
			if key == blocked[0] || key == blocked[1] {
				continue
			}
			receiver, distance = j, distances[j]
		}
		if receiver >= 0 || minimum < role(i) {
			break
		}
	}
	if receiver < 0 {
		return nil
	}
	x, z, key := aim(receiver)
	return &passPlan{receiver, x, z, !(role(i) != 0 || role(receiver) == 1) || p.Stats[4]*2 <= distance, key}
}
