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
	deteriorate(q, hit)
	q.Stun = 1.35
	q.Action = 4
	q.ActionTime = 1.35
	s.Charge[q.Team] = 0
	if s.Ball.Owner == j {
		s.Ball = Ball{X: q.X, Z: q.Z, H: .5, VX: p.FX * 5, VZ: p.FZ * 5, VH: 3, Owner: -1, LastTouch: i, Lock: .12}
	}
	s.event(4, i, j, q.X, q.Z, .5)
	if q.Health <= 0 {
		q.Injury = 6
		q.Stun = 6
		q.ActionTime = 6
		t := 1 - q.Team
		s.Score[t] += s.points(t, 10)
		s.event(14, j, t, q.X, q.Z, .5)
	}
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
func (s *State) medicalStep(dt float64) bool {
	stopped := false
	for i := range s.Players {
		p := &s.Players[i]
		if p.Injury > 0 {
			stopped = true
			p.Injury = math.Max(0, p.Injury-dt)
			p.Stun = p.Injury
			p.ActionTime = p.Injury
			if p.Injury == 0 {
				if s.Reserves[p.Team] > 0 {
					s.Reserves[p.Team]--
					p.Health = 100
					p.Stats = defaultStats()
					p.StatBackup = [8]int{}
					p.Stun = 0
					p.Action = 0
					p.Gear = 0
					p.Z = math.Copysign(10, p.Z)
					s.event(15, i, s.Reserves[p.Team], p.X, p.Z, .5)
				} else {
					p.Stun = 10
					p.Action = 4
				}
				s.Ball.Electric = 0
			}
		} else if p.Health <= 0 {
			p.Stun = 10
		}
	}
	return stopped
}
func (s *State) featureStep(dt float64) {
	for slot := range s.Pickups {
		item := &s.Pickups[slot]
		if item.Wait > 0 {
			item.Wait = math.Max(0, item.Wait-dt)
			continue
		}
		item.Life -= dt
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
			if math.Hypot(p.X-item.X, p.Z-item.Z) <= .85 {
				who = i
				break
			}
		}
		if who >= 0 {
			s.pickup(who, item.Kind)
		}
		if who >= 0 || item.Life <= 0 {
			s.PickupSerial++
			n := s.PickupSerial + slot
			item.X = []float64{-12, -5, 5, 12}[n%4]
			item.Z = []float64{-7, -3, 3, 7}[(n/4)%4]
			item.Wait = 2
			if who >= 0 {
				item.Wait = 8
			}
			item.Life = 14
			if slot < 2 {
				item.Kind = 1 + (item.Kind+1)%12
			} else if slot == 6 {
				item.Kind = 14 + (item.Kind-13)%8
			}
		}
	}
}
func (s *State) sideFeature() bool {
	b := &s.Ball
	if b.H > 1.4 {
		return false
	}
	if math.Abs(math.Abs(b.X)-8) < .55 {
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
	if math.Abs(b.X-16*math.Copysign(1, b.Z)) < .7 && b.LastTouch >= 0 {
		t := s.Players[b.LastTouch].Team
		b.Electric = 1
		if (t == 0 && s.Multiplier > 0) || (t == 1 && s.Multiplier < 0) {
			b.Electric += int(math.Abs(float64(s.Multiplier)))
		}
		s.event(13, b.LastTouch, b.Electric, b.X, b.Z, b.H)
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
