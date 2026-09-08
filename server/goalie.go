package main

import "math"

// Unselected keeper positioning: base_goalie_set_intercept_position, 0xfb30.
func (s *State) goalieTarget(i int) (float64, float64) {
	side := i / 9
	if s.Period == 2 {
		side ^= 1
	}
	loose := s.Ball.Owner < 0
	x, y := s.Ball.X, s.Ball.Z
	mx, mz := s.Ball.VX, s.Ball.VZ
	fx, fz := s.Ball.DirX, s.Ball.DirZ
	throwing := false
	if !loose {
		q := s.Players[s.Ball.Owner]
		x, y = q.X, q.Z
		mx, mz = q.moveX, q.moveZ
		fx, fz = q.FX, q.FZ
		throwing = q.Action == 3
	}
	tx, ty := int(math.Round(y/(22.4/576)+320)), int(math.Round(576-x/(22.4/576)))
	vx, vy := int(math.Round(mz/(22.4/576)/25)), -int(math.Round(mx/(22.4/576)/25))
	shift := max(0, min(2, (s.Players[i].Stats[7]-100)/50))
	ymin, ymax := 960, 1104
	if side != 0 {
		ymin, ymax = 48, 192
	}
	for shift > 0 {
		next := ty + vy*(1<<shift)
		if (side != 0 || next <= ymax) && next >= ymin {
			break
		}
		shift--
	}
	tx += vx * (1 << shift)
	ty += vy * (1 << shift)
	line := ymax
	if side != 0 {
		line = ymin
	}
	spread := int(math.Abs(float64(line - ty)))
	plus, minus := tx+spread, tx-spread
	dir := (int(math.Round(math.Atan2(fz, fx)/(math.Pi/4))) + 8) % 8
	kind, intercept := -1, 0
	if tx < 272 {
		intercept = plus
		if plus > 352 {
			intercept = 320
		} else {
			intercept = max(256, plus)
		}
		kind = 2
	} else if tx > 368 {
		intercept = minus
		if minus < 288 {
			intercept = 320
		} else {
			intercept = min(384, minus)
		}
		kind = 2
	} else {
		mode := 0
		straight, right, left := 4, 3, 5
		if side != 0 {
			straight, right, left = 0, 1, 7
		}
		if (side == 0 && ty < 1024) || (side != 0 && ty > 128) {
			kind = 1
		} else if dir == straight {
			mode = 1
		} else if dir == right {
			mode = 2
		} else if dir == left {
			mode = 3
		}
		if mode == 1 && (loose || throwing) {
			kind = 1
		} else if mode == 2 || mode == 3 {
			intercept = plus
			if mode == 3 {
				intercept = minus
			}
			if mode == 2 && intercept > 352 {
				intercept = minus
				kind = 1
				if intercept >= 288 {
					kind = 3
				}
			}
			if mode == 3 && intercept < 288 {
				intercept = plus
				kind = 1
				if intercept <= 352 {
					kind = 3
				}
			}
			if kind < 0 {
				kind = 3
				if loose || throwing {
					kind = 2
				}
			}
		}
		if kind < 0 {
			intercept = minus
			if intercept < 288 {
				intercept = plus
				kind = 3
				if intercept > 352 {
					kind = 1
				}
			} else {
				intercept = plus
				kind = 1
				if intercept > 352 {
					intercept = minus
					kind = 3
				}
			}
		}
	}
	if kind == 3 {
		intercept = (intercept + tx) / 2
	}
	if kind >= 2 {
		tx = intercept
	}
	return float64(576-line) * (22.4 / 576), float64(max(160, min(480, tx))-320) * (22.4 / 576)
}
