package main

// active_player_ai, check_collectibles, find_route_left/right_first.
// Called after hardware targeting; nil means enter the role's pass/shot branch.
func (s *State) carrierMove(i, random int, distances *[18]int) *passPlan {
	if i%9 == 0 {
		return nil
	}
	const unit = 22.4 / 576
	p := &s.Players[i]
	j := s.Controlled[1-p.Team]
	if j >= 0 && s.Players[j].Stun <= 0 && s.Players[j].Health > 0 && distances[j] <= 64 {
		return nil
	}
	blocked := s.opponentDirections(i, distances)
	clear := func(x, z float64) bool { key := passDirection(p, x, z); return key != blocked[0] && key != blocked[1] }
	intelligence := p.Stats[7]
	if i%9 >= 6 {
		intelligence /= 2
	}
	if intelligence > random {
		for _, slot := range []int{0, 1, 6, 2, 3, 4, 5} {
			item := s.Pickups[slot]
			if item.Kind != 0 && item.Wait <= 0 && s.worldInViewport(item.X, item.Z, 0) && clear(item.X, item.Z) {
				return &passPlan{x: item.X, z: item.Z}
			}
		}
	}
	side := p.Team
	if s.Period == 2 {
		side ^= 1
	}
	zone := supportZones[side][i%9]
	xmin, xmax, ymin, ymax := zone[0], zone[1], zone[2], zone[3]
	cy := ((ymin + ymax) / 2) &^ 1
	x, y := supportTerrain(*p)
	if side == 0 && y <= cy || side == 1 && y >= cy {
		return nil
	}
	forwardX := max(xmin, min(xmax, x))
	if forwardX <= 96 {
		forwardX = 56
	} else if forwardX >= 544 {
		forwardX = 584
	}
	forwardX = max(xmin, min(xmax, forwardX))
	frontEdge, backEdge := ymin, ymax
	if side != 0 {
		frontEdge, backEdge = ymax, ymin
	}
	front := (y + frontEdge) / 2
	lateral := [2]int{xmax, xmin}
	if random&8 != 0 {
		lateral = [2]int{xmin, xmax}
	}
	candidates := [][2]int{{forwardX, front}}
	for _, targetY := range []int{front, (y + cy) / 2, (y + backEdge) / 2} {
		for _, edge := range lateral {
			candidates = append(candidates, [2]int{(x + edge) / 2, targetY})
		}
	}
	for _, point := range candidates {
		x, z := float64(576-point[1])*unit, float64(point[0]-320)*unit
		if clear(x, z) {
			return &passPlan{x: x, z: z}
		}
	}
	return nil
}
