package main

import "math"

// Amiga use_court_hardware_ai (0xf3a8), before carrier movement/pass choices.
func (s *State) hardwareThrow(i, random int, distances *[18]int) *passPlan {
	if i%9 == 0 {
		return nil
	}
	const unit = 22.4 / 576
	p := &s.Players[i]
	x, y := int(math.Round(320+p.Z/unit)), int(math.Round(576-p.X/unit))
	blocked := s.opponentDirections(i, distances)
	plan := func(tx, ty int, high bool) *passPlan {
		x, z := float64(576-ty)*unit, float64(tx-320)*unit
		return &passPlan{receiver: -1, x: x, z: z, high: high, key: passDirection(p, x, z)}
	}
	clear := func(p *passPlan) bool { return s.Ball.Charged || p.key != blocked[0] && p.key != blocked[1] }
	maximum := 2
	if p.Team == 1 {
		maximum = -2
	}
	if s.Multiplier != maximum && (x >= 48 && x <= 64 && (y < 576 || y > 640) || x >= 576 && x <= 592 && (y < 512 || y > 576)) {
		target := plan(x, 576, false)
		if clear(target) {
			return target
		}
	}
	if x <= 213 || x > 426 {
		target := plan(32, 464, true)
		if x > 426 {
			target = plan(608, 688, true)
		}
		d := int(s.direction(p.Team))
		if clear(target) && (target.key == d*3-1 || target.key == d*3+1) {
			return target
		}
	}
	if !s.Ball.Charged && p.Stats[0]/2 > random {
		for _, point := range [][2]int{{20, 880}, {620, 272}} {
			if absInt(point[0]-x) > 106 || absInt(point[1]-y) > 106 {
				continue
			}
			target := plan(point[0], point[1], false)
			if target.key != blocked[0] && target.key != blocked[1] && target.key != 3 && target.key != -3 {
				return target
			}
		}
	}
	return nil
}
