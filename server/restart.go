package main

import "math"

// prepare_ball_launch waits for formation; deck frame 19 plus ball frame 21.
func (s *State) restartStep(dt float64) bool {
	if s.RestartPhase == 0 {
		return false
	}
	if s.RestartPhase == 1 {
		ready := true
		for slot := 0; slot < 9; slot++ {
			for _, team := range []int{1, 0} {
				i := team*9 + slot
				p := &s.Players[i]
				p.ActionTime = math.Max(0, p.ActionTime-dt)
				p.Stun = math.Max(0, p.Stun-dt)
				p.aiWait = math.Max(0, p.aiWait-dt)
				if p.Health <= 0 {
					if s.startInjury(i) {
						return true
					}
					ready = false
					continue
				}
				if p.ActionTime > 1e-9 || p.aiWait > 1e-9 {
					ready = false
					continue
				}
				p.Action = 0
				p.jumping = false
				x, z := s.launchPosition(i)
				vx, vz := advanceSteering(p, x, z, false)
				speed := movementSpeed(p, false, false)
				p.moveX, p.moveZ = vx*speed, vz*speed
				p.X += vx * math.Min(math.Abs(x-p.X), speed*dt)
				p.Z += vz * math.Min(math.Abs(z-p.Z), speed*dt)
				if p.X != x || p.Z != z {
					ready = false
					p.FX, p.FZ = vx, vz
				} else {
					p.FX, p.FZ = s.direction(team), 0
					p.moveX, p.moveZ = 0, 0
				}
			}
		}
		if ready {
			s.RestartPhase = 2
			s.RestartTicks = 0
		}
	} else {
		s.RestartTicks += dt * 25
		t := clamp((s.RestartTicks-19)/21, 0, 1)
		s.Ball.H = .25 + 2.75*t + 6*math.Sin(math.Pi*t)
		if s.RestartTicks >= 40-1e-9 {
			s.RestartPhase = 0
			s.Ball.H = 3
		}
	}
	return true
}
