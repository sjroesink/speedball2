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
	near := !fresh && absInt(dx+physicalPoseData.Origins[p.physicalSprite][1]) <= 32 && az <= 32
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

// sub_EC0C: hold distant heading through the run cycle; correct near arrival.
func advanceSteering(p *Player, x, z float64, fresh bool) (float64, float64) {
	const unit = 22.4 / 576
	dx := math.Abs(math.Round(x/unit) - math.Round(p.X/unit) + float64(physicalPoseData.Origins[p.physicalSprite][1]))
	dz := math.Abs(math.Round(z/unit) - math.Round(p.Z/unit))
	changed := !p.steerValid || p.steerTargetX != x || p.steerTargetZ != z
	frame := p.steerFrame
	if p.physicalPoseValid {
		frame = int(p.poseCursor)
	}
	update := fresh || changed || frame == 0 || (dx <= 32 && dz <= 32)
	p.steerFrame = (p.steerFrame + 1) & 7
	if update {
		p.steerX, p.steerZ = steerToTarget(p, x, z, fresh)
		p.steerTargetX, p.steerTargetZ = x, z
		p.steerValid = true
	}
	return p.steerX, p.steerZ
}
