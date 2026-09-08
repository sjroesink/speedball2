package main

import "math"

const (
	pitchX     = 21.
	pitchZ     = 11.2
	goalWidth  = 1.85
	goalHeight = 2.
	gravity    = 18.
)

// Actions are replicated, including misses: 1 slide, 2 jump, 3 throw, 4 hit.
type Player struct {
	Stats, StatBackup           [8]int
	GearBackup, GearPowerBackup int
	X, Z                        float64
	Team                        int
	FX, FZ                      float64
	Stun, ActionTime, Cooldown  float64
	Action                      int
	lowThrow                    bool
	tackleResolved              bool
	Health, Injury              float64
	Gear                        int
}
type Ball struct {
	DomeFraction                         float64
	MultiplierPath, MultiplierIndex      int
	MultiplierFraction                   float64
	FlightKind, FlightIndex, FlightStage int
	FlightFraction                       float64
	DirX, DirZ                           float64
	SpeedTimer, NextSlowdown             int
	SlowFraction                         float64
	X, Z, H, VX, VZ, VH                  float64
	Owner, LastTouch                     int
	Lock, After                          float64
	Electric                             int
}
type Event struct {
	ID            uint32
	Kind          int
	X, Z, H       float64
	Actor, Target int
}
type State struct {
	ClockPhase        float64
	RNG               [2]uint32
	Players           [18]Player
	Ball              Ball
	Score             [2]int
	Time              float64
	Tick              uint64
	Over              bool
	Period            int
	Pause             float64
	Controlled        [2]int
	Charge            [2]float64
	Event             Event
	previous          [2]Input
	Stars             [2]uint8
	Multiplier        int
	Effect            Effect
	Pickups           [7]Pickup
	Credits, Reserves [2]int
	PickupSerial      int
}
type Input struct {
	Fire     uint32  `json:"fire"`
	TackleID uint32  `json:"tackleId"`
	LobID    uint32  `json:"lobId"`
	X        float64 `json:"x"`
	Z        float64 `json:"z"`
	Shoot    bool    `json:"shoot"`
	Tackle   bool    `json:"tackle"`
	Lob      bool    `json:"lob"`
	Seq      int64   `json:"seq"`
}

var formation = [9][2]float64{{-19, 0}, {-14, -6}, {-14, 0}, {-14, 6}, {-8, -7}, {-8, 0}, {-8, 7}, {-3, -4}, {-3, 4}}

func initial() State {
	s := State{RNG: [2]uint32{0x31415926, 0x53589793}, Time: 90, Period: 1, Controlled: [2]int{7, 16}}
	s.resetPitch()
	s.initFeatures()
	return s
}
func (s *State) direction(team int) float64 {
	d := 1.
	if team == 1 {
		d = -1
	}
	if s.Period == 2 {
		d = -d
	}
	return d
}
func (s *State) resetPitch() {
	for i := range s.Players {
		t := i / 9
		d := s.direction(t)
		old := s.Players[i]
		s.Players[i] = Player{Stats: defaultStats(), Health: 100, X: formation[i%9][0] * d, Z: formation[i%9][1], Team: t, FX: d}
		if s.Tick > 0 {
			s.Players[i].Health = old.Health
			s.Players[i].Gear = old.Gear
			s.Players[i].Stats = old.Stats
			s.Players[i].StatBackup = old.StatBackup
			s.Players[i].GearBackup = old.GearBackup
			s.Players[i].GearPowerBackup = old.GearPowerBackup
			if old.Health <= 0 {
				s.Players[i].Stun = 10
			}
		}
	}
	s.Ball = Ball{H: 3, Owner: -1, LastTouch: -1}
	s.Charge = [2]float64{}
}
func clamp(x, lo, hi float64) float64 { return math.Max(lo, math.Min(hi, x)) }
func normalized(x, z float64) (float64, float64) {
	d := math.Hypot(x, z)
	if d < .001 {
		return 0, 0
	}
	return x / d, z / d
}
func eightWay(x, z float64) (float64, float64) {
	if math.Hypot(x, z) < .01 {
		return 0, 0
	}
	a := math.Round(math.Atan2(z, x)/(math.Pi/4)) * (math.Pi / 4)
	return math.Round(math.Cos(a)), math.Round(math.Sin(a))
}
func (s *State) event(kind, actor, target int, x, z, h float64) {
	s.Event = Event{s.Event.ID + 1, kind, x, z, h, actor, target}
}
func jumpHeight(p Player) float64 {
	if p.Action == 2 && p.ActionTime > 0 {
		return math.Sin((.7-p.ActionTime)/.7*math.Pi) * 1.8
	}
	return 0
}
func (s *State) selectPlayers() {
	for t := 0; t < 2; t++ {
		if s.Ball.Owner >= 0 && s.Players[s.Ball.Owner].Team == t {
			s.Controlled[t] = s.Ball.Owner
			continue
		}
		best := -1
		distance := math.MaxFloat64
		for i, p := range s.Players {
			if p.Team != t || p.Stun > 0 {
				continue
			}
			d := float64(referenceDistance(p.X-s.Ball.X, p.Z-s.Ball.Z))
			if d <= distance {
				best = i
				distance = d
			}
		}
		if best >= 0 {
			s.Controlled[t] = best
		}
	}
}
func (s *State) throw(i int, lob bool, release ...Input) {
	p := &s.Players[i]
	b := &s.Ball
	ensureStats(p)
	speed, vh := 8*velocityUnit, 2.
	if lob {
		vh = 11
	}
	fx, fz := eightWay(p.FX, p.FZ)
	*b = Ball{X: p.X + p.FX*.9, Z: p.Z + p.FZ*.9, H: 1, DirX: fx, DirZ: fz, VX: fx * speed, VZ: fz * speed, VH: vh, Owner: -1, LastTouch: i, Lock: .18, After: 0}
	if len(release) > 0 {
		steerRelease(b, release[0])
	}
	setBallSpeed(b, p.Stats[4])
	startFlight(b, lob)
	p.Action = 3
	p.ActionTime = .32
	s.event(3, i, -1, b.X, b.Z, b.H)
}
func (s *State) passTarget(i int) int {
	p := s.Players[i]
	d := s.direction(p.Team)
	best := -1
	value := math.Inf(-1)
	for j, q := range s.Players {
		advance := (q.X - p.X) * d
		distance := math.Hypot(q.X-p.X, q.Z-p.Z)
		if j == i || q.Team != p.Team || q.Stun > 0 || advance < 2 || distance > 15 {
			continue
		}
		space := 10.
		for _, r := range s.Players {
			if r.Team != p.Team && r.Stun <= 0 {
				space = math.Min(space, math.Hypot(r.X-q.X, r.Z-q.Z))
			}
		}
		score := space*2 + advance - distance*.4
		if space > 2.5 && score > value {
			value = score
			best = j
		}
	}
	return best
}
func (s *State) step(dt float64, inputs [2]Input) { s.simulate(dt, inputs, [2]bool{true, true}) }
func (s *State) simulate(dt float64, inputs [2]Input, humans [2]bool) {
	s.Tick++
	if s.Over {
		return
	}
	s.matchClock(dt)
	if s.medicalStep(dt) {
		s.previous = inputs
		return
	}
	if s.Pause > 0 {
		s.Pause = math.Max(0, s.Pause-dt)
		s.previous = inputs
		return
	}
	s.featureStep(dt)
	if s.hasInjury() {
		s.previous = inputs
		return
	}
	if s.Time == 0 {
		if s.Period == 1 {
			s.Period = 2
			s.Time = 90
			s.Stars = [2]uint8{}
			s.Multiplier = 0
			s.Pause = 3
			s.resetPitch()
			s.event(6, -1, -1, 0, 0, 0)
		} else {
			s.Over = true
		}
		return
	}
	b := &s.Ball
	b.Lock = math.Max(0, b.Lock-dt)
	b.After = math.Max(0, b.After-dt)
	for i := range s.Players {
		p := &s.Players[i]
		p.Stun = math.Max(0, p.Stun-dt)
		p.ActionTime = math.Max(0, p.ActionTime-dt)
		p.Cooldown = math.Max(0, p.Cooldown-dt)
		if p.ActionTime == 0 {
			p.Action = 0
		}
	}
	s.selectPlayers()
	for i := range s.Players {
		p := &s.Players[i]
		if p.Stun > 0 {
			continue
		}
		t := p.Team
		human := humans[t] && s.Controlled[t] == i
		u := inputs[t]
		dx, dz := u.X, u.Z
		if human && s.active(2, 1-t) {
			dx = -dx
			dz = -dz
		}
		if s.active(1, 1-t) {
			continue
		}
		if !human {
			d := s.direction(t)
			tx, tz := formation[i%9][0]*d, formation[i%9][1]
			if b.Owner == i {
				tx = d * 22
				tz = clamp(p.Z*.4, -2, 2)
			} else if i%9 == 0 {
				tx = -d * 19.5
				tz = clamp(b.Z, -1.55, 1.55)
			} else if s.Controlled[t] == i {
				lead := .15
				if p.Gear == 21 {
					lead = .3
				}
				tx = b.X + b.VX*lead
				tz = b.Z + b.VZ*lead
			} else {
				tx += clamp(b.X*.35, -6, 6)
				if b.Owner >= 0 && s.Players[b.Owner].Team == t {
					tx += d * 5
				}
				tz += b.Z * .18
			}
			dx, dz = normalized(tx-p.X, tz-p.Z)
			if math.Hypot(tx-p.X, tz-p.Z) < .3 {
				dx = 0
				dz = 0
			}
			u = Input{}
			if p.Cooldown <= 0 && math.Hypot(b.X-p.X, b.Z-p.Z) < gearRange(p.Gear, 14, 3, 4) && b.Owner != i {
				if b.H > 1.4 {
					u.Shoot = true
				} else if (b.Owner >= 0 && s.Players[b.Owner].Team != t) || (i%9 == 0 && b.Owner < 0 && math.Hypot(b.VX, b.VZ) > 4) {
					u.Tackle = true
				}
			}
			if b.Owner == i {
				danger := false
				for _, q := range s.Players {
					if q.Team != t && math.Hypot(q.X-p.X, q.Z-p.Z) < 3 {
						danger = true
					}
				}
				if p.X*d > 12 || danger || i%9 == 0 {
					receiver := -1
					if p.X*d < 10 {
						receiver = s.passTarget(i)
					}
					tx, tz := d*23, 0.
					if receiver >= 0 {
						tx = s.Players[receiver].X
						tz = s.Players[receiver].Z
					}
					p.FX, p.FZ = normalized(tx-p.X, tz-p.Z)
					s.throw(i, receiver < 0 && danger && p.X*d < 10)
				}
			}
		}
		if human {
			dx, dz = eightWay(dx, dz)
		}
		if p.Action != 1 && p.Action != 3 && math.Hypot(dx, dz) > .01 {
			p.FX, p.FZ = normalized(dx, dz)
		}
		pressed := (u.Shoot && !s.previous[t].Shoot) || (u.Tackle && !s.previous[t].Tackle) || u.Fire > s.previous[t].Fire || u.TackleID > s.previous[t].TackleID
		if !human {
			pressed = u.Shoot || u.Tackle
		}
		if human && b.Owner == i {
			if (u.Lob && !s.previous[t].Lob) || u.LobID > s.previous[t].LobID {
				s.throw(i, true, u)
				s.Charge[t] = 0
			} else {
				fire := (u.Shoot && !s.previous[t].Shoot) || u.Fire > s.previous[t].Fire
				if fire && s.Charge[t] == 0 && p.ActionTime <= 0 {
					s.Charge[t] = dt
					p.Action = 3
					p.ActionTime = .32
					p.lowThrow = !u.Shoot
				} else if s.Charge[t] > 0 {
					s.Charge[t] += dt
				}
				if s.Charge[t] > 0 {
					p.lowThrow = p.lowThrow || !u.Shoot
					if s.Charge[t] >= .16 {
						s.throw(i, !p.lowThrow, u)
						s.Charge[t] = 0
					}
				}
			}
		} else if human {
			s.Charge[t] = 0
		}
		if pressed && b.Owner != i && p.Cooldown <= 0 && p.ActionTime <= 0 {
			if b.H > 1.5 && math.Hypot(b.X-p.X, b.Z-p.Z) < 4 && !u.Tackle {
				p.Action = 2
				p.ActionTime = .7
				p.Cooldown = .85
				s.event(2, i, -1, p.X, p.Z, 0)
			} else {
				p.Action = 1
				p.tackleResolved = false
				p.ActionTime = .38
				p.Cooldown = .85
				s.event(1, i, -1, p.X, p.Z, 0)
			}
		}
		if p.Action == 1 {
			dx, dz = p.FX, p.FZ
		}
		dx, dz = eightWay(dx, dz)
		keeperBlock := i%9 == 0 && b.Owner < 0 && math.Hypot(b.VX, b.VZ) > 0 && math.Abs(p.FZ) > .1
		speed := movementSpeed(p, b.Owner == i, keeperBlock)
		if s.active(1, 1-t) {
			speed = 0
		}
		p.X = clamp(p.X+dx*speed*dt, -20.5, 20.5)
		p.Z = clamp(p.Z+dz*speed*dt, -10.7, 10.7)
		if i%9 == 0 {
			d := s.direction(t)
			p.X = d * clamp(p.X*d, -20.5, -15)
		}
	}
	// Resolve contacts in alternating order so equal teams get equal priority.
	for offset := range s.Players {
		i := offset
		if s.Tick%2 == 0 {
			i = 17 - offset
		}
		p := &s.Players[i]
		if p.Stun > 0 {
			continue
		}
		if p.Action == 1 && !p.tackleResolved {
			for j := range s.Players {
				q := &s.Players[j]
				if q.Team == p.Team || q.Stun > 0 || q.Health <= 0 || s.active(10, q.Team) {
					continue
				}
				dx, dz := q.X-p.X, q.Z-p.Z
				if math.Hypot(dx, dz) < 1.15 {
					// sub_ED92 switches out of contact checks at the first eligible opponent.
					p.tackleResolved = true
					if s.randomByte() > tackleThreshold(p, q, j%9 == 0) {
						break
					}
					hadBall := s.Ball.Owner == j
					if s.damage(i, j) {
						if hadBall {
							s.giveBall(i)
						}
						q.X = clamp(q.X+p.FX*.7, -20.5, 20.5)
						q.Z = clamp(q.Z+p.FZ*.7, -10.7, 10.7)
					}
					break
				}
			}
		}
	}
	for i := range s.Players {
		p := &s.Players[i]
		for j := i + 1; j < len(s.Players); j++ {
			q := &s.Players[j]
			if p.Stun > 0 || q.Stun > 0 || p.Action == 1 || q.Action == 1 {
				continue
			}
			dx, dz := q.X-p.X, q.Z-p.Z
			d := math.Hypot(dx, dz)
			if d > .001 && d < .85 {
				push := (.85 - d) * .5
				p.X = clamp(p.X-dx/d*push, -20.5, 20.5)
				p.Z = clamp(p.Z-dz/d*push, -10.7, 10.7)
				q.X = clamp(q.X+dx/d*push, -20.5, 20.5)
				q.Z = clamp(q.Z+dz/d*push, -10.7, 10.7)
			}
		}
	}
	if s.hasInjury() {
		s.previous = inputs
		return
	}
	if b.Owner >= 0 {
		b.MultiplierPath = 0
		p := s.Players[b.Owner]
		b.X = p.X + p.FX*.5
		b.Z = p.Z + p.FZ*.5
		b.H = 1
		b.VX = 0
		b.VZ = 0
		b.VH = 0
	} else if s.multiplierStep(dt) {
		// The original multiplier animation owns the ball position while inside.
	} else {
		slowBall(b, dt)
		b.X += b.VX * dt
		b.Z += b.VZ * dt
		if !flightStep(b, dt) {
			b.H += b.VH * dt
			b.VH -= gravity * dt
			if b.H < .25 {
				b.H = .25
				if b.VH < -2 {
					b.VH = -b.VH * .5
				} else {
					b.VH = 0
				}
			}
		}
		if math.Abs(b.Z) > pitchZ && !s.sideFeature() {
			s.event(5, b.LastTouch, -1, b.X, b.Z, b.H)
			s.wallBonus()
			b.Z = math.Copysign(2*pitchZ-math.Abs(b.Z), b.Z)
			reflectBall(b, false)
		} else {
			s.wallBonus()
		}
		if math.Abs(b.X) > pitchX {
			if math.Abs(b.Z) < goalWidth && (b.FlightKind > 0 && b.FlightStage <= 2 || b.FlightKind == 0 && b.H < goalHeight) && !s.goalBlocked(b.X) {
				scorer := 0
				if b.X*s.direction(0) < 0 {
					scorer = 1
				}
				s.Score[scorer] += s.points(scorer, 10)
				s.event(7, scorer, -1, b.X, b.Z, b.H)
				s.resetPitch()
				s.Pause = 1.4
				s.previous = inputs
				return
			} else {
				b.X = math.Copysign(2*pitchX-math.Abs(b.X), b.X)
				reflectBall(b, true)
				s.event(5, b.LastTouch, -1, b.X, b.Z, b.H)
			}
		}
		b.DomeFraction += dt * 25
		if b.DomeFraction >= 1-1e-9 {
			b.DomeFraction = math.Max(0, b.DomeFraction-math.Floor(b.DomeFraction+1e-9))
			s.domeBounce()
		}
		if b.Lock <= 0 {
			best := -1
			distance := .8
			for i, p := range s.Players {
				if p.Stun > 0 {
					continue
				}
				reach := 1.25 + jumpHeight(p)
				if b.FlightKind > 0 && b.FlightStage > 2 && p.Action != 2 || b.FlightKind == 0 && b.H > reach {
					continue
				}
				d := math.Hypot(p.X-b.X, p.Z-b.Z)
				if d < .8 && b.Electric > 0 && b.LastTouch >= 0 && p.Team != s.Players[b.LastTouch].Team && !s.active(10, p.Team) {
					if s.damage(b.LastTouch, i) {
						b.Electric--
						continue
					}
				}
				if d < distance {
					best = i
					distance = d
				}
			}
			if best >= 0 {
				b.Electric = 0
				s.Charge[s.Players[best].Team] = 0
				b.FlightKind = 0
				b.Owner = best
				b.LastTouch = best
				b.After = 0
				s.Controlled[s.Players[best].Team] = best
				s.event(16, best, -1, b.X, b.Z, b.H)
			}
		}
	}
	s.previous = inputs
}
