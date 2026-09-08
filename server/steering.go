package main

import "math"

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
