package main

import "math"

type Effect struct {
	Kind, Team int
	Time       float64
}
type Pickup struct {
	Kind             int
	X, Z, Wait, Life float64
}

func (s *State) initFeatures() {
	s.Effect = Effect{Team: -1}
	s.Reserves = [2]int{3, 3}
	for team := range s.Bench {
		for i := range s.Bench[team] {
			s.Bench[team][i] = defaultStats()
		}
	}
	for i := range s.Pickups {
		k := 13
		if i < 2 {
			k = i + 1
		}
		if i == 6 {
			k = 14
		}
		x := 5.
		if i%2 == 1 {
			x = -5
		}
		s.Pickups[i] = Pickup{k, x, float64(i%3-1) * 6, 2 + float64(i)*1.5, 14}
	}
	for _, slot := range []int{2, 3, 4, 5} {
		s.spawnPickup(slot)
	}
	for _, slot := range []int{3, 4, 5} {
		s.Pickups[slot].Wait = s.Pickups[2].Wait
	}
	for _, slot := range []int{0, 1, 6} {
		s.spawnPickup(slot)
	}
}
func (s *State) active(k, t int) bool {
	return s.Effect.Time > 0 && s.Effect.Kind == k && (t < 0 || s.Effect.Team == t)
}
func (s *State) goalBlocked(x float64) bool {
	defender := 0
	if x*s.direction(0) > 0 {
		defender = 1
	}
	return s.active(9, defender)
}
func (s *State) damage(i, j int) bool {
	p := s.Players[i]
	q := &s.Players[j]
	if q.Health <= 0 || q.Stun > 0 || s.active(10, q.Team) {
		return false
	}
	hit := hitDamage(&s.Players[i], q)
	// The renderer exposes energy as a percentage; original full energy is 128.
	q.Health = math.Max(0, q.Health-float64(hit)*100/128)
	gear := q.Gear
	deteriorate(q, hit)
	if gear != 0 {
		const unit = 22.4 / 576
		x := (int(math.Round(320+q.Z/unit)) & 0xfe0) + 16
		y := (int(math.Round(576-q.X/unit)) & 0xfe0) + 16
		s.Pickups[6] = Pickup{Kind: gear, X: float64(576-y) * unit, Z: float64(x-320) * unit}
		if s.ArmourPickupsLeft == 0 {
			s.spawnPickup(6)
		}
	}
	q.Stun = fallDuration
	q.fallX, q.fallZ = 0, 0
	q.Action = 4
	q.ActionTime = fallDuration
	s.Charge[q.Team] = 0
	if s.Ball.Owner == j {
		s.Ball = Ball{X: q.X, Z: q.Z, H: .5, VX: p.FX * 5, VZ: p.FZ * 5, VH: 3, Owner: -1, LastTouch: i, Lock: .12}
	}
	s.event(4, i, j, q.X, q.Z, .5)
	return true
}
func (s *State) giveBall(i int) {
	p := s.Players[i]
	if p.Health <= 0 || p.Stun > 0 {
		return
	}
	s.Charge = [2]float64{}
	s.Ball = Ball{Owner: i, LastTouch: i, X: p.X, Z: p.Z, H: 1}
	s.Controlled[p.Team] = i
}
func (s *State) pickup(i, k int) {
	p := &s.Players[i]
	t := p.Team
	switch {
	case k == 13:
		s.Credits[t] += 10
	case k >= 14:
		equip(p, k)
		s.Pickups[6].Kind = 0
		s.ArmourPickupsLeft = max(0, s.ArmourPickupsLeft-1)
	case k == 7:
		s.giveBall(i)
	case k == 8:
		// Token.Init_Transport targets roster slot 8, regardless of field position.
		s.giveBall(t*9 + 8)
	case k == 11:
		p.Health = 100
		p.Stats = defaultStats()
		p.Gear = 0
	case k == 12:
		for j, q := range s.Players {
			if q.Team != t {
				s.damage(i, j)
			}
		}
	default:
		s.restorePower()
		s.applyPowerStats(k, t)
		s.Effect = Effect{k, t, 6}
		if k == 1 {
			for j := range s.Players {
				q := &s.Players[j]
				if q.Team != t && q.Health > 0 {
					q.Action = 0
					q.ActionTime = 0
					s.Charge[q.Team] = 0
				}
			}
		}
	}
	if s.Event.Kind != 14 {
		s.event(11, i, k, p.X, p.Z, .5)
	}
}

// start_injury runs when the fatal fall animation finishes, not on impact.
func (s *State) startInjury(i int) bool {
	p := &s.Players[i]
	if p.Health > 0 || p.ActionTime > 1e-9 {
		return false
	}
	for _, q := range s.Players {
		if q.Injury > 0 {
			return false
		}
	}
	const unit = 22.4 / 576
	x := max(48, min(592, int(math.Round(320+p.Z/unit))&^1))
	y := max(48, min(1104, int(math.Round(576-p.X/unit))&^1))
	p.X, p.Z = float64(576-y)*unit, float64(x-320)*unit
	p.Injury, p.Stun, p.ActionTime = 1, 1, 1
	s.Medical = createMedical(i, x, y)
	// start_injury 0x10ea6 transfers possession to a stationary injury anchor.
	b := &s.Ball
	b.Owner, b.X, b.Z, b.H = -1, p.X, p.Z, .25
	b.VX, b.VZ, b.VH, b.DirX, b.DirZ = 0, 0, 0, 0, 0
	b.FlightKind, b.FlightIndex, b.FlightStage, b.FlightFraction = 0, 0, 0, 0
	b.MultiplierPath, b.MultiplierIndex, b.MultiplierFraction = 0, 0, 0
	b.Lock, b.After = 0, 0
	s.Charge = [2]float64{}
	p.Action = 4
	p.moveX, p.moveZ, p.fallX, p.fallZ = 0, 0, 0, 0
	s.Controlled[p.Team] = i
	t := 1 - p.Team
	s.Score[t] += s.points(t, 10)
	s.event(14, i, t, p.X, p.Z, .5)
	return true
}
func (s *State) medicalStep(dt float64) bool {
	m := s.Medical
	if m == nil {
		return false
	}
	copyMedical := *m
	m = &copyMedical
	s.Medical = m
	i := m.Player
	p := &s.Players[i]
	done := advanceMedical(m, dt)
	const unit = 22.4 / 576
	p.X, p.Z = float64(576-m.Patient[1])*unit, float64(m.Patient[0]-320)*unit
	if done {
		outgoing := p.Stats
		for j := range outgoing {
			outgoing[j] = outgoing[j] / 10 * 10
		}
		bench := &s.Bench[p.Team]
		p.Stats = bench[0]
		bench[0] = bench[1]
		bench[1] = bench[2]
		bench[2] = outgoing
		s.Reserves[p.Team] = len(bench)
		p.Health = 100
		p.Injury = 0
		p.StatBackup = [8]int{}
		p.GearBackup, p.GearPowerBackup = 0, 0
		p.Stun, p.ActionTime, p.Cooldown = 0, 0, 0
		p.Action, p.Gear = 0, 0
		p.keeperBlock, p.tackleResolved = false, false
		p.X = -s.direction(p.Team) * 32 * (22.4 / 576)
		side := 1.
		if p.Z <= 0 {
			side = -1
		}
		p.Z = side * 272 * (22.4 / 576)
		p.FX, p.FZ = 0, -side
		p.aiX, p.aiZ, p.aiWait = 0, 0, 1
		p.aiTarget = true
		s.event(15, i, len(bench), p.X, p.Z, .5)
		s.Ball.Electric = 0
		s.Ball.Charged = false
		s.Medical = nil
		s.beginRestart(0)
	}
	return true
}
func (s *State) featureStep(dt float64) {
	for slot := range s.Pickups {
		item := &s.Pickups[slot]
		if item.Wait > 0 {
			item.Wait = math.Max(0, item.Wait-dt)
			if item.Wait > 1e-9 {
				continue
			}
			item.Wait = 0
		}
		if item.Kind == 0 {
			continue
		}
		who := -1
		// Entity item handlers test team 1's selected player before team 2's.
		for _, i := range s.Controlled {
			if i < 0 || i >= len(s.Players) {
				continue
			}
			p := s.Players[i]
			if p.Stun > 0 || p.Health <= 0 || p.Action == 2 {
				continue
			}
			if referenceDistance(p.X-item.X, p.Z-item.Z) <= 16 {
				who = i
				break
			}
		}
		if who >= 0 {
			s.pickup(who, item.Kind)
		}
		if slot < 6 {
			if who >= 0 {
				s.spawnPickup(slot)
			}
			continue
		}

	}
}
func (s *State) sideFeature() bool {
	b := &s.Ball
	if b.FlightKind != 0 && b.FlightStage > 2 || b.FlightKind == 0 && b.H > 1.25 {
		return false
	}
	terrainX, terrainY := int(math.Round(320+b.Z/terrainUnit)), int(math.Round(576-b.X/terrainUnit))
	if b.Owner < 0 && (terrainX < 32 || terrainX > 608) && ((terrainY >= 355 && terrainY <= 385) || (terrainY >= 767 && terrainY <= 797)) {
		attribute := 100
		if b.LastTouch >= 0 && b.LastTouch < len(s.Players) {
			p := &s.Players[b.LastTouch]
			ensureStats(p)
			attribute = p.Stats[4]
		}
		warpBall(b, attribute)
		s.event(12, b.LastTouch, -1, b.X, b.Z, b.H)
		return true
	}
	if b.Owner >= 0 && s.Players[b.Owner].Action != 3 {
		return false
	}
	for _, center := range [][2]int{{20, 880}, {620, 272}} {
		dx, dz := center[1]-terrainY, terrainX-center[0]
		ax, az := int(math.Abs(float64(dx))), int(math.Abs(float64(dz)))
		if ax > 15 || az > 15 {
			continue
		}
		fx, fz := 0., 0.
		if ax > az>>1 {
			fx = math.Copysign(1, float64(dx))
		}
		if az > ax>>1 {
			fz = math.Copysign(1, float64(dz))
		}
		if fx == 0 && fz == 0 {
			continue
		}
		b.Z = 11.2
		if terrainX <= 320 {
			b.Z = -11.2
		}
		b.DirX, b.DirZ = fx, fz
		b.VX, b.VZ = fx*8*velocityUnit, fz*8*velocityUnit
		if b.FlightKind != 0 {
			startFlight(b, b.FlightKind == 2)
		}
		attribute := 100
		if b.LastTouch >= 0 {
			p := &s.Players[b.LastTouch]
			ensureStats(p)
			attribute = p.Stats[4]
		}
		setBallSpeed(b, attribute)
		b.Electric = b.ElectricBudget
		b.Charged = true
		s.event(13, b.LastTouch, b.Electric, b.X, b.Z, b.H)
		return true
	}
	return false
}

func (s *State) hasInjury() bool {
	for _, p := range s.Players {
		if p.Injury > 0 {
			return true
		}
	}
	return false
}

func gearRange(gear, kind int, base, boost float64) float64 {
	if gear == kind {
		return boost
	}
	return base
}
