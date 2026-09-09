package main

import "math"

// target_predicted_position (0x10aaa), lookahead table 0x020a.
func predictedTarget(x, z, vx, vz float64, intelligence int) (float64, float64) {
	const unit = 22.4 / 576
	shift := max(0, min(2, (intelligence-100)/50))
	steps := float64(int(1) << shift)
	tx := math.Round(z/unit+320) + math.Round(vz/unit/25)*steps
	ty := math.Round(576-x/unit) - math.Round(vx/unit/25)*steps
	if tx <= 32 {
		tx = 64 - tx
	} else if tx >= 608 {
		tx = 1216 - tx
	}
	if ty <= 32 {
		ty = 64 - ty
	} else if ty >= 1120 {
		ty = 2240 - ty
	}
	return (576 - ty) * unit, (tx - 320) * unit
}

// Original integer target direction and separate axis arrival rules.
func steerToTarget(p *Player, x, z float64, fresh bool) (float64, float64) {
	const unit = 22.4 / 576
	dx, dz := int(math.Round(x/unit))-int(math.Round(p.X/unit)), int(math.Round(z/unit))-int(math.Round(p.Z/unit))
	ax, az := int(math.Abs(float64(dx))), int(math.Abs(float64(dz)))
	near := !fresh && ax <= 32 && az <= 32
	sign := func(v int) float64 {
		if v < 0 {
			return -1
		}
		if v > 0 {
			return 1
		}
		return 0
	}
	vx, vz := 0., 0.
	if near || ax > az/2 {
		vx = sign(dx)
	}
	if near || az > ax/2 {
		vz = sign(dz)
	}
	if ax < 4 {
		p.X = x
		vx = 0
	}
	if az < 4 {
		p.Z = z
		vz = 0
	}
	return vx, vz
}
