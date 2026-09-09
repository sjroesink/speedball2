package main

import "math"

func (s *State) worldInViewport(x, z float64, margin int) bool {
	return inViewport(s.logicalView, int(math.Round(z*576/22.4+320)), int(math.Round(576-x*576/22.4)), margin)
}
func (s *State) advanceViewport() {
	x, z := s.Ball.X, s.Ball.Z
	if s.Ball.Owner >= 0 {
		x, z = s.Players[s.Ball.Owner].X, s.Players[s.Ball.Owner].Z
	}
	s.logicalView = scrollViewport(s.logicalView, int(math.Round(z*576/22.4+320)), int(math.Round(576-x*576/22.4)), false)
}

// Original logical viewport: WIP Match.CenterScreenOnEntity.
func scrollViewport(view [2]int, x, y int, presentation bool) [2]int {
	advance := func(current, target, limit int, horizontal bool) int {
		distance := absInt(target - current)
		speed := min(16, (distance>>3)+1)
		if horizontal && !presentation && speed < 2 {
			return current
		}
		movement := min(speed, distance)
		if target < current {
			movement = -movement
		}
		return max(0, min(limit, current+movement))
	}
	return [2]int{advance(view[0], x-160, 320, true), advance(view[1], y-92, 968, false)}
}

func inViewport(view [2]int, x, y, margin int) bool {
	return x-view[0] >= margin && x-view[0] <= 320-margin && y-view[1] >= margin && y-view[1] <= 184-margin
}
