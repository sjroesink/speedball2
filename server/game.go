package main

import "math"

const (
	simulationRate = 25
	simulationStep = 1.0 / simulationRate
	pitchX         = 544 * (22.4 / 576)
	pitchZ         = 11.2
	goalWidth      = 48 * (22.4 / 576)
	goalHeight     = 2.
	gravity        = 18.
)

// Actions are replicated, including misses: 1 slide, 2 jump, 3 throw, 4 hit.
type Player struct {
	fallX, fallZ                float64
	slideEnding                 bool
	throwMode                   int
	jumping                     bool
	aiWait, aiX, aiZ            float64
	aiTarget                    bool
	keeperBlock                 bool
	moveX, moveZ                float64
	Stats, StatBackup           [8]int
	GearBackup, GearPowerBackup int
	X, Z                        float64
	Team                        int
	FX, FZ                      float64
	Stun, ActionTime, Cooldown  float64
	Action                      int
	tackleResolved              bool
	Health, Injury              float64
	Gear                        int
}
type Ball struct {
	Charged                              bool
	ElectricBudget                       int
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
	Bench             [2][3][8]int
	Events            [16]Event
	EventCount        int
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

// Launch coordinates from the original player records (terrain X, Y).
var launchPositions = [2][9][2]float64{
	{{320, 1104}, {213, 992}, {426, 992}, {213, 768}, {426, 768}, {320, 800}, {106, 576}, {426, 576}, {320, 640}},
	{{320, 48}, {426, 160}, {213, 160}, {426, 384}, {213, 384}, {320, 352}, {533, 576}, {213, 576}, {320, 512}},
}

const playerLimitX = 528 * (22.4 / 576)
const playerLimitZ = 272 * (22.4 / 576)

func (s *State) launchPosition(i int) (float64, float64) {
	side := i / 9
	if s.Period == 2 {
		side ^= 1
	}
	p := launchPositions[side][i%9]
	return (576 - p[1]) * (22.4 / 576), (p[0] - 320) * (22.4 / 576)
}

// reset_player_timer, reaction_time_table at 0x01fa.
func aiReactionTime(intelligence int) float64 {
	index := max(0, min(15, (intelligence-100)/10))
	return float64([16]int{16, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 9, 8}[index]) / 25
}

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
		x, z := s.launchPosition(i)
		s.Players[i] = Player{Stats: defaultStats(), Health: 100, X: x, Z: z, Team: t, FX: d}
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
	if s.EventCount == len(s.Events) {
		copy(s.Events[:], s.Events[1:])
		s.EventCount--
	}
	s.Events[s.EventCount] = s.Event
	s.EventCount++
}
func jumpHeight(p Player) float64 {
	if p.Action == 2 && p.ActionTime > 0 {
		return math.Sin(clamp((actionDuration(2, p.Stats[3])-p.ActionTime)/(actionDuration(2, p.Stats[3])-2./25), 0, 1)*math.Pi) * 1.8
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

// Modes: 1 samples human input at release, 2 forces low, 3 forces high.
func (s *State) beginThrow(i, mode int) {
	p := &s.Players[i]
	p.Action = 3
	p.ActionTime = 8. / 25
	p.throwMode = mode
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
	b.ElectricBudget = 1
	if p.Team == 0 && s.Multiplier > 0 || p.Team == 1 && s.Multiplier < 0 {
		b.ElectricBudget += int(math.Abs(float64(s.Multiplier)))
	}
	if len(release) > 0 {
		steerRelease(b, release[0])
	}
	setBallSpeed(b, p.Stats[4])
	startFlight(b, lob)
	p.Action = 3
	p.ActionTime = 4. / 25
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
		if p.Stun < 1e-9 {
			p.Stun = 0
		}
		p.ActionTime = math.Max(0, p.ActionTime-dt)
		p.Cooldown = math.Max(0, p.Cooldown-dt)
		if p.Cooldown < 1e-9 {
			p.Cooldown = 0
		}
		p.aiWait = math.Max(0, p.aiWait-dt)
		if p.ActionTime < 1e-9 {
			p.ActionTime = 0
			p.Action = 0
		}
		if p.Action != 2 {
			p.jumping = false
		}
	}
	slowBall(b, dt)
	inMultiplier := b.Owner < 0 && s.multiplierStep(dt)
	specialContact := false
	if !inMultiplier {
		specialContact = s.sideFeature()
		s.wallBonus()
		b.DomeFraction += dt * 25
		if b.DomeFraction >= 1-1e-9 {
			b.DomeFraction = math.Max(0, b.DomeFraction-math.Floor(b.DomeFraction+1e-9))
			s.domeBounce()
		}
	}
	s.selectPlayers()
	contacts := contactDistances(&s.Players)
	var catchDistances [18]int
	for i, p := range s.Players {
		catchDistances[i] = referenceDistance(p.X-b.X, p.Z-b.Z)
	}
	// step_sprites interleaves the teams, starting with team two.
	for order := range s.Players {
		i := order/2 + (1-order%2)*9
		p := &s.Players[i]
		s.catchBallAt(i, &catchDistances)
		// Catching precedes jumping_action_fn clearing the airborne flag.
		if p.Action == 2 && p.jumping && p.ActionTime <= 2./25+1e-9 {
			p.jumping = false
			s.event(18, i, -1, p.X, p.Z, 0)
		}
		if p.Action == 1 && !p.slideEnding && p.ActionTime <= 1./25+1e-9 {
			p.slideEnding = true
			s.event(19, i, -1, p.X, p.Z, 0)
		}
		if p.Stun > 0 {
			p.moveX, p.moveZ = 0, 0
			continue
		}
		s.resolveTackle(i, &contacts[i])
		t := p.Team
		human := humans[t] && s.Controlled[t] == i
		u := inputs[t]
		dx, dz := u.X, u.Z
		if human && s.active(2, 1-t) {
			dx = -dx
			dz = -dz
		}
		if s.active(1, 1-t) {
			p.moveX, p.moveZ = 0, 0
			continue
		}
		if !human {
			d := s.direction(t)
			decide := p.aiWait < 1e-9 && p.ActionTime <= 0
			tx, tz := p.aiX, p.aiZ
			if !p.aiTarget {
				tx, tz = p.X, p.Z
			}
			if decide {
				p.aiWait = aiReactionTime(p.Stats[7])
				if b.Owner == i {
					tx = d * 22
					tz = clamp(p.Z*.4, -2, 2)
				} else if i%9 == 0 {
					if s.Controlled[t] != i {
						tx, tz = s.goalieTarget(i)
					} else {
						tx = -d * 19.5
						tz = clamp(b.Z, -1.55, 1.55)
					}
				} else if s.Controlled[t] == i {
					lead := .15
					if p.Gear == 21 {
						lead = .3
					}
					tx = b.X + b.VX*lead
					tz = b.Z + b.VZ*lead
				} else {
					tx, tz = s.supportTarget(i)
				}
				p.aiX, p.aiZ, p.aiTarget = tx, tz, true
			}
			if p.ActionTime > 0 {
				dx, dz = eightWay(p.FX, p.FZ)
			} else {
				dx, dz = steerToTarget(p, tx, tz, decide)
			}
			u = Input{}
			if decide && p.Cooldown <= 0 && math.Hypot(b.X-p.X, b.Z-p.Z) < gearRange(p.Gear, 14, 3, 4) && b.Owner != i {
				if b.H > 1.4 {
					u.Shoot = true
				} else if (b.Owner >= 0 && s.Players[b.Owner].Team != t) || (i%9 == 0 && b.Owner < 0 && math.Hypot(b.VX, b.VZ) > 4) {
					u.Tackle = true
				}
			}
			if decide && b.Owner == i {
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
					mode := 2
					if receiver < 0 && danger && p.X*d < 10 {
						mode = 3
					}
					s.beginThrow(i, mode)
				}
			}
		}
		if human {
			p.aiWait = 1. / 25
			dx, dz = eightWay(dx, dz)
		}
		if p.Action != 1 && p.Action != 2 && p.Action != 3 && math.Hypot(dx, dz) > .01 {
			p.FX, p.FZ = normalized(dx, dz)
		}
		pressed := (u.Shoot && !s.previous[t].Shoot) || (u.Tackle && !s.previous[t].Tackle) || u.Fire > s.previous[t].Fire || u.TackleID > s.previous[t].TackleID
		if !human {
			pressed = u.Shoot || u.Tackle
		}
		if human && b.Owner == i && p.ActionTime <= 0 {
			if (u.Lob && !s.previous[t].Lob) || u.LobID > s.previous[t].LobID {
				s.beginThrow(i, 3)
			} else if (u.Shoot && !s.previous[t].Shoot) || u.Fire > s.previous[t].Fire {
				s.beginThrow(i, 1)
			}
		}
		if p.throwMode != 0 {
			if b.Owner != i || p.Action != 3 {
				p.throwMode = 0
				s.Charge[t] = 0
			} else {
				s.Charge[t] = 8./25 - p.ActionTime + dt
				if p.ActionTime <= 4./25+1e-9 {
					high := p.throwMode == 3 || p.throwMode == 1 && u.Shoot
					steering := Input{}
					if human {
						steering = u
					}
					s.throw(i, high, steering)
					p.throwMode = 0
					s.Charge[t] = 0
				}
			}
		}
		if pressed && b.Owner != i && p.Cooldown <= 0 && p.ActionTime <= 0 {
			if canJumpAtBall(p, b, catchDistances[i], inMultiplier) && !u.Tackle {
				p.Action = 2
				p.jumping = true
				p.ActionTime = actionDuration(2, p.Stats[3])
				p.Cooldown = p.ActionTime
				s.event(2, i, -1, p.X, p.Z, 0)
			} else {
				p.Action = 1
				p.tackleResolved = false
				p.slideEnding = false
				p.keeperBlock = i%9 == 0 && b.Owner < 0 && (b.VX != 0 || b.VZ != 0) && math.Abs(p.FZ) > .1
				p.ActionTime = actionDuration(1, p.Stats[3])
				p.Cooldown = p.ActionTime
				s.event(1, i, -1, p.X, p.Z, 0)
			}
		}
		if p.Action == 1 || p.Action == 2 {
			dx, dz = p.FX, p.FZ
		}
		dx, dz = eightWay(dx, dz)
		keeperBlock := p.keeperBlock && p.Action == 1
		speed := movementSpeed(p, b.Owner == i, keeperBlock)
		if s.active(1, 1-t) {
			speed = 0
		}
		p.moveX, p.moveZ = dx*speed, dz*speed
		blockPlayerMovement(&s.Players, i, &contacts[i], dt)
	}
	// Original movement follows the complete player-thinking pass.
	for i := range s.Players {
		p := &s.Players[i]
		if p.Stun > 0 {
			p.moveX, p.moveZ = 0, 0
			if p.Action == 4 && p.Health > 0 && p.Stun > 1./25+1e-9 {
				p.moveX, p.moveZ = p.fallX, p.fallZ
			}
		}
		previousX := p.X
		p.X = clamp(p.X+p.moveX*dt, -playerLimitX, playerLimitX)
		p.Z = clamp(p.Z+p.moveZ*dt, -playerLimitZ, playerLimitZ)
		if i%9 == 0 {
			d := s.direction(p.Team)
			advance := (p.X - previousX) * d
			if advance > 0 && p.X*d > -384*(22.4/576) || advance < 0 && p.X*d < -playerLimitX {
				p.X = previousX
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
	} else if inMultiplier {
		// The original multiplier animation owns the ball position while inside.
	} else {
		if math.Abs(b.Z) > pitchZ && !specialContact {
			s.event(5, b.LastTouch, -1, b.X, b.Z, b.H)
			b.Z = math.Copysign(pitchZ, b.Z)
			reflectBall(b, false)
		}
		if math.Abs(b.X) > pitchX {
			if math.Abs(b.Z) <= goalWidth && b.X*b.VX > 0 && (b.FlightKind > 0 && b.FlightStage <= 2 || b.FlightKind == 0 && b.H < goalHeight) && !s.goalBlocked(b.X) {
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
				b.X = math.Copysign(pitchX, b.X)
				reflectBall(b, true)
				s.event(5, b.LastTouch, -1, b.X, b.Z, b.H)
			}
		}

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

	}
	s.previous = inputs
}

func (s *State) catchBall() { s.catchBallAt(-1, nil) }
func (s *State) catchBallAt(only int, distances *[18]int) {
	b := &s.Ball
	if b.Owner >= 0 || b.MultiplierPath != 0 {
		return
	}
	for roster := 0; roster < 9; roster++ {
		for _, team := range []int{1, 0} {
			i := team*9 + roster
			if only >= 0 && i != only {
				continue
			}
			p := &s.Players[i]
			if s.Controlled[team] != i || p.Stun > 0 || p.Health <= 0 || p.Action == 3 {
				continue
			}
			if b.FlightKind != 0 && b.FlightStage > 2 && !(p.Action == 2 && p.jumping) || b.FlightKind == 0 && b.H > 1.25+jumpHeight(*p) {
				continue
			}
			distance := referenceDistance(p.X-b.X, p.Z-b.Z)
			if distances != nil {
				distance = distances[i]
			}
			if distance > 16 {
				continue
			}
			if b.Charged && b.Electric > 0 && b.LastTouch >= 0 && p.Team != s.Players[b.LastTouch].Team && !s.active(10, p.Team) {
				if s.damage(b.LastTouch, i) {
					// sub_D632 uses nominal ball direction, not the thrower's facing.
					if b.DirX != 0 || b.DirZ != 0 {
						p.FX, p.FZ = eightWay(b.DirX, b.DirZ)
					} else {
						p.FX, p.FZ = eightWay(b.VX, b.VZ)
					}
					p.fallX, p.fallZ = p.FX*3*velocityUnit, p.FZ*3*velocityUnit
					b.Electric--
					b.ElectricBudget = b.Electric
					continue
				}
			}
			if p.Action == 1 && p.keeperBlock {
				s.deflectBall(i)
				s.event(17, i, -1, b.X, b.Z, b.H)
				return
			}
			if (b.VX != 0 || b.VZ != 0) && b.LastTouch >= 0 && s.Players[b.LastTouch].Team != p.Team {
				b.Electric = 0
				b.Charged = false
			}
			s.Charge[team] = 0
			b.FlightKind = 0
			b.Owner = i
			b.LastTouch = i
			b.After = 0
			s.event(16, i, -1, b.X, b.Z, b.H)
			return
		}
	}
}

// Existing slides resolve contact during thinking, before later players act.
func (s *State) resolveTackle(i int, distances *[18]int) {
	p := &s.Players[i]
	if p.Action != 1 || p.tackleResolved {
		return
	}
	for j := range s.Players {
		q := &s.Players[j]
		if q.Team == p.Team || q.Stun > 0 || q.Health <= 0 || s.active(10, q.Team) || distances[j] > 30 {
			continue
		}
		p.tackleResolved = true
		if s.randomByte() > tackleThreshold(p, q, j%9 == 0) {
			return
		}
		hadBall := s.Ball.Owner == j
		if s.damage(i, j) {
			if hadBall {
				s.giveBall(i)
			}
			q.FX, q.FZ = eightWay(p.FX, p.FZ)
			q.fallX, q.fallZ = q.FX*4*velocityUnit, q.FZ*4*velocityUnit
		}
		return
	}
}
