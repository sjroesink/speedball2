package main

import "math"

func contactDistances(players *[18]Player) [18][18]int {
	var distances [18][18]int
	for i, p := range players {
		for j, q := range players {
			distances[i][j] = referenceDistance(q.X-p.X, q.Z-p.Z)
		}
	}
	return distances
}

// sub_D448/sub_D4AC: compensate before ordinary movement, retaining velocity.
func blockPlayerMovement(players *[18]Player, i int, distances *[18]int, dt float64) {
	p := &players[i]
	const unit = 22.4 / 576
	for j, q := range players {
		if q.Team == p.Team || q.Stun > 0 || q.Health <= 0 || distances[j] > 30 {
			continue
		}
		dx := int(math.Round(q.X/unit) - math.Round(p.X/unit))
		dz := int(math.Round(q.Z/unit) - math.Round(p.Z/unit))
		if absInt(dx) > absInt(dz)/2 && float64(dx)*p.moveX > 0 {
			p.X -= p.moveX * dt
		}
		if absInt(dz) > absInt(dx)/2 && float64(dz)*p.moveZ > 0 {
			p.Z -= p.moveZ * dt
		}
	}
}
func absInt(v int) int {
	if v < 0 {
		return -v
	}
	return v
}
