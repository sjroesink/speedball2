package main

import "math"

type passPlan struct {
	receiver int
	x, z     float64
	high     bool
	key      int
	steer    float64
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
	return &passPlan{receiver: receiver, x: x, z: z, high: !(role(i) != 0 || role(receiver) == 1) || p.Stats[4]*2 <= distance, key: key}
}

// Amiga do_throw_punt_ai / set_goal_throw_location, normal match mode.
func (s *State) defensivePunt(i, random int) *passPlan {
	const unit = 22.4 / 576
	p := &s.Players[i]
	key := func(x, z float64) int {
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
		return fx*3 + fz
	}
	lateral := int(math.Round(p.Z / unit))
	z := -48. * unit
	if lateral > 0 {
		z = -16 * unit
	} else if lateral < 0 {
		z = 16 * unit
	} else if random&64 != 0 {
		z = 48 * unit
	}
	x := s.direction(p.Team) * 576 * unit
	steer := 0.
	if p.Stats[7]/2 > random {
		steer = 1
		if z < p.Z {
			steer = -1
		}
	}
	blocked := 0
	if j := s.Controlled[1-p.Team]; j >= 0 && s.Players[j].Stun <= 0 && s.Players[j].Health > 0 {
		q := &s.Players[j]
		qx, qz := predictedTarget(q.X, q.Z, q.moveX, q.moveZ, p.Stats[7])
		blocked = key(qx, qz)
	}
	// Reloaded from opponent_directions even for an electroball.
	if key(x, z) == blocked {
		z = -288 * unit
		if random&16 != 0 {
			z = 288 * unit
		}
		x = p.X + s.direction(p.Team)*math.Abs(z-p.Z)
	}
	return &passPlan{receiver: -1, x: x, z: z, key: key(x, z), high: true, steer: steer}
}
