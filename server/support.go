package main

import "math"

func supportRole(i int) int { return [9]int{0, 1, 1, 2, 2, 2, 4, 4, 3}[i%9] }
func supportTerrain(p Player) (int, int) {
	return int(math.Round(p.Z/(22.4/576) + 320)), int(math.Round(576 - p.X/(22.4/576)))
}
func supportPredicted(p Player) (int, int) {
	x, y := supportTerrain(p)
	return x + int(math.Round(p.moveZ/(22.4/576)/25)), y - int(math.Round(p.moveX/(22.4/576)/25))
}

// Positional branch of base_player_ai, including forward support lookup tables.
func (s *State) supportTarget(i int) (float64, float64) {
	team := i / 9
	side := team
	if s.Period == 2 {
		side ^= 1
	}
	zone := supportZones[side][i%9]
	xmin, xmax, ymin, ymax := zone[0], zone[1], zone[2], zone[3]
	cx, cy := ((xmin+xmax)/2)&^1, ((ymin+ymax)/2)&^1
	r := supportRole(i)
	selected := s.Controlled[team]
	if r == 1 && supportRole(selected) >= 2 {
		selected = team * 9
	}
	q := s.Players[selected]
	qr := min(3, supportRole(selected))
	x, y := supportPredicted(q)
	qx, _ := supportTerrain(q)
	bound := func(v, a, b int) int { return max(a, min(b, v)) }
	abs := func(v int) int {
		if v < 0 {
			return -v
		}
		return v
	}
	adjust := func() {
		x = bound((x+cx)/2, xmin, xmax)
		delta := abs(x - qx)
		diagonal := false
		if qr <= r {
			if side == 0 {
				diagonal = y >= cy
				if diagonal {
					delta = -delta
				}
			} else {
				diagonal = y <= cy
			}
		} else {
			if side == 0 {
				diagonal = y <= cy
			} else {
				diagonal = y >= cy
				if diagonal {
					delta = -delta
				}
			}
		}
		if diagonal {
			y += delta
			constrained := bound(y, ymin, ymax)
			excess := abs(y - constrained)
			y = constrained
			if x <= cx {
				x += excess
			} else {
				x -= excess
			}
			x = bound(x, xmin, xmax)
		} else {
			_, y = supportPredicted(q)
			y = bound(y, ymin, ymax)
		}
	}
	if supportRole(selected) >= 3 && r >= 3 {
		mx, my := x, y
		if mx >= 320 {
			mx = 639 - mx
		}
		if side != 0 {
			my = 1151 - my
		}
		if my >= 32 && my < 208 && mx >= 32 && mx < 320 {
			index := (my-32)/32*9 + (mx-32)/32
			table := 0
			if r == 4 {
				table = 1
			}
			target := forwardTargets[table][index]
			x, y = target[0], target[1]
			if qx >= 320 {
				x = 639 - x
			}
			if side != 0 {
				y = 1151 - y
			}
			x = bound(x, xmin, xmax)
		} else {
			adjust()
		}
	} else if r != 1 && x > xmin && x < xmax {
		anchor := cy
		if qr > r {
			if side == 0 && y >= cy {
				anchor = ymax
			}
			if side != 0 && y <= cy {
				anchor = ymin
			}
		} else {
			if side == 0 && y <= cy {
				anchor = ymin
			}
			if side != 0 && y >= cy {
				anchor = ymax
			}
		}
		y = bound((y+anchor)/2, ymin, ymax)
	} else {
		adjust()
	}
	return float64(576-y) * (22.4 / 576), float64(x-320) * (22.4 / 576)
}
