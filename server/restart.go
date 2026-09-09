package main

import "math"

func (s *State) beginRestart(pause float64) {
	s.RestartPhase, s.RestartTicks = 1, 0
	s.Pause = pause
	s.Charge = [2]float64{}
	s.Ball = Ball{H: .25, Owner: -1, LastTouch: -1}
}

// prepare_ball_launch waits for formation; deck frame 19 plus ball frame 21.
func (s *State) restartStep(dt float64) bool {
	return s.formationAndLaunchStep(dt, false)
}

func (s *State) formationAndLaunchStep(dt float64, medicalFormation bool) bool {
	if s.RestartPhase == 0 && !medicalFormation {
		return false
	}
	if s.RestartPhase == 1 || medicalFormation {
		// step_prepare_ball_launch clears temporary powers before formation.
		if !medicalFormation && s.Effect.Kind != 0 {
			s.restorePower()
			s.Effect = Effect{Team: -1}
		}
		ready := true
		for slot := 0; slot < 9; slot++ {
			for _, team := range []int{1, 0} {
				i := team*9 + slot
				p := &s.Players[i]
				if medicalFormation && s.Medical.Player == i {
					continue
				}
				p.ActionTime = math.Max(0, p.ActionTime-dt)
				p.Stun = math.Max(0, p.Stun-dt)
				p.aiWait = math.Max(0, p.aiWait-dt)
				if p.Health <= 0 {
					if !medicalFormation && s.startInjury(i) {
						return true
					}
					ready = false
					continue
				}
				if p.ActionTime > 1e-9 || p.aiWait > 1e-9 {
					ready = false
					advancePhysicalPose(p, i, s.Period, dt)
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
				advancePhysicalPose(p, i, s.Period, dt)
			}
		}
		if ready && !medicalFormation {
			s.event(22, -1, -1, 0, 0, .1)
			s.RestartPhase = 2
			s.RestartTicks = 0
		}
	} else {
		previous := s.RestartTicks
		s.RestartTicks += dt * 25
		if s.RestartTicks >= 19 {
			if previous < 19 {
				s.event(23, -1, -1, 0, 0, .25)
			}
			if s.Ball.FlightKind != 3 {
				s.Ball.FlightKind, s.Ball.FlightIndex, s.Ball.FlightStage = 3, -1, 0
				s.Ball.FlightFraction, s.Ball.VH = 0, 0
			}
			flightStep(&s.Ball, (s.RestartTicks-math.Max(19, previous))/25)
		}
		if s.RestartTicks >= 40-1e-9 {
			s.RestartPhase = 0
		}
	}
	return true
}
