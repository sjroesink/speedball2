package main

// The fall -5 terminator resolves movement and injury in the animation pass.
func (s *State) advancePlayerPose(i int, dt float64) bool {
	p := &s.Players[i]
	if !advancePhysicalPose(p, i, s.Period, dt) {
		return false
	}
	p.Stun, p.ActionTime = 0, 0
	p.moveX, p.moveZ, p.fallX, p.fallZ = 0, 0, 0, 0
	p.fallAttack, p.fallAttackTime = 0, 0
	p.fallFinishing, p.jumping = false, false
	if p.Health <= 0 {
		return s.startInjury(i)
	}
	// Healthy -5 selects anim_lying_down and resets its cursor (0x10d84).
	p.poseCursor = 0
	p.Action = 0
	return false
}
