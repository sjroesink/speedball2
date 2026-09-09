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
	steerFrame                                 int
	steerValid                                 bool
	steerX, steerZ, steerTargetX, steerTargetZ float64
	aiAvoid                                    bool
	fallX, fallZ                               float64
	fallAttack                                 int
	fallAttackTime                             float64
	fallFinishing                              bool
	slideEnding                                bool
	throwMode                                  int
	throwSteer                                 float64
	jumping                                    bool
	stationaryJump                             bool
	jumpSpeed                                  float64
	aiWait, aiX, aiZ                           float64
	aiTarget                                   bool
	keeperBlock                                bool
	moveX, moveZ                               float64
	Stats, StatBackup, BaseStats               [8]int
	GearBackup, GearPowerBackup                int
	X, Z                                       float64
	Team                                       int
	FX, FZ                                     float64
	Stun, ActionTime, Cooldown                 float64
	Action                                     int
	tackleResolved                             bool
	Health, Injury                             float64
	Gear                                       int
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
	RestartPhase      int
	RestartTicks      float64
	Medical           *Medical
	logicalView       [2]int
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
	ArmourPickupsLeft int
	Training          bool
	CashLimits        [2]int
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
	s := State{logicalView: [2]int{160, 484}, RNG: [2]uint32{0x31415926, 0x53589793}, Time: 90, Period: 1, Controlled: [2]int{7, 16}}
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
	s.Medical = nil
	s.RestartPhase, s.RestartTicks = 0, 0
	for i := range s.Players {
		t := i / 9
		d := s.direction(t)
		old := s.Players[i]
		x, z := s.launchPosition(i)
		s.Players[i] = Player{Stats: defaultStats(), BaseStats: defaultStats(), Health: 100, X: x, Z: z, Team: t, FX: d}
		if s.Tick > 0 {
			s.Players[i].Health = old.Health
			s.Players[i].Gear = old.Gear
			s.Players[i].Stats = old.Stats
			s.Players[i].BaseStats = old.BaseStats
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
	p.throwSteer = 0
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
	// throwing_action_fn preserves the current carried-ball position.
	*b = Ball{X: b.X, Z: b.Z, H: 1, DirX: fx, DirZ: fz, VX: fx * speed, VZ: fz * speed, VH: vh, Owner: -1, LastTouch: i, Lock: .18, After: 0}
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
func (s *State) step(dt float64, inputs [2]Input) { s.simulate(dt, inputs, [2]bool{true, true}) }
func (s *State) simulate(dt float64, inputs [2]Input, humans [2]bool) {
	defer s.advanceViewport()
	s.Tick++
	if s.Over {
		return
	}
	s.matchClock(dt)
	if s.Medical != nil {
		s.formationAndLaunchStep(dt, true)
	}
	if s.medicalStep(dt) {
		s.previous = inputs
		return
	}
	if s.Pause > 0 {
		s.Pause = math.Max(0, s.Pause-dt)
		s.previous = inputs
		return
	}
	if s.restartStep(dt) {
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
			s.beginRestart(3)
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
		p.fallAttackTime = math.Max(0, p.fallAttackTime-dt)
		p.Cooldown = math.Max(0, p.Cooldown-dt)
		if p.Cooldown < 1e-9 {
			p.Cooldown = 0
		}
		p.aiWait = math.Max(0, p.aiWait-dt)
		if p.ActionTime < 1e-9 {
			p.ActionTime = 0
			p.Action = 0
		}
		if p.Action != 4 {
			p.fallAttack = 0
			p.fallFinishing = false
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
		if p.Health <= 0 && p.ActionTime <= 0 && s.startInjury(i) {
			s.previous = inputs
			return
		}
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
			// complete_action_fn jumps the retained fall animation to word 15.
			finishFall := p.Action == 4 && (p.fallAttack == 1 || p.fallFinishing) && p.fallAttackTime <= 1./25+1e-9
			if finishFall {
				p.Stun, p.ActionTime = 20./25, 20./25
				p.fallFinishing = false
				s.event(19, i, -1, p.X, p.Z, 0)
			}
			s.resolveTackle(i, &contacts[i])
			if finishFall {
				p.fallAttack = 0
			}
			p.moveX, p.moveZ = 0, 0
			if p.Action == 4 && p.Health > 0 {
				p.moveX, p.moveZ = p.fallX, p.fallZ
				blockPlayerMovement(&s.Players, i, &contacts[i], dt)
			}
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
			decide := p.aiWait < 1e-9 && p.ActionTime <= 0
			tx, tz := p.aiX, p.aiZ
			if !p.aiTarget {
				tx, tz = p.X, p.Z
			}
			random := 0
			var hardware, route *passPlan
			if decide {
				p.aiWait = aiReactionTime(p.Stats[7])
				p.aiAvoid = false
				random = s.randomByte()
				var nearby *interaction
				hasKeeperTarget := false
				if s.Controlled[t] != i || b.Owner != i {
					nearby = s.localInteraction(i, &contacts[i], random)
				}
				if nearby == nil && s.Controlled[t] == i && b.Owner != i && i%9 == 0 {
					var keeper *interaction
					keeper, tx, tz = s.keeperAction(i, catchDistances[i], random)
					if keeper != nil {
						hasKeeperTarget = true
						if keeper.attack {
							nearby = keeper
						}
					}
				}
				if nearby == nil && s.Controlled[t] == i && b.Owner != i && i%9 != 0 {
					var chase interaction
					chase, tx, tz = s.pursuit(i, random, &catchDistances, inMultiplier)
					if chase.attack {
						nearby = &chase
					}
				}
				if nearby != nil {
					if nearby.x != 0 || nearby.z != 0 {
						p.FX, p.FZ = nearby.x, nearby.z
					}
					if nearby.attack {
						p.Action = 7
						p.ActionTime = 4. / 25
						cue := 20
						if s.Controlled[t] == i {
							p.Action = 1
							if canJumpAtBall(p, b, catchDistances[i], inMultiplier) {
								p.Action = 2
							}
							p.ActionTime = actionDuration(p.Action, p.Stats[3])
							cue = p.Action
						}
						p.Cooldown = p.ActionTime
						p.tackleResolved = false
						p.jumping = p.Action == 2
						p.stationaryJump = p.Action == 2 && nearby.x == 0 && nearby.z == 0
						p.jumpSpeed = 0
						if p.Action == 2 {
							p.jumpSpeed = movementSpeed(p, false, false)
						}
						if p.Action == 1 && nearby.x == 0 && nearby.z == 0 {
							p.FX, p.FZ = s.direction(t), 0
						}
						p.slideEnding = false
						p.keeperBlock = p.Action == 1 && i%9 == 0 && b.Owner < 0 && (b.VX != 0 || b.VZ != 0) && math.Abs(p.FZ) > .1
						s.event(cue, i, -1, p.X, p.Z, 0)
					} else {
						p.aiAvoid = true
					}
				} else if b.Owner == i {
					hardware = s.hardwareThrow(i, random, &catchDistances)
					if hardware == nil {
						route = s.carrierMove(i, random, &catchDistances)
					}
					if hardware == nil && route == nil && i%9 >= 6 {
						decision := s.forwardDecision(i, random, &catchDistances)
						if decision.move {
							route = decision
						} else {
							hardware = decision
						}
					}
					tx, tz = p.X, p.Z
					if route != nil {
						tx, tz = route.x, route.z
					}
				} else if i%9 == 0 {
					if s.Controlled[t] != i {
						tx, tz = s.goalieTarget(i)
					} else if !hasKeeperTarget {
						tx, tz = s.goaliePosition(i, true)
					}
				} else if s.Controlled[t] == i {
					// The field-player pursuit branch above has selected the target.
				} else {
					tx, tz = s.supportTarget(i)
				}
				p.aiX, p.aiZ, p.aiTarget = tx, tz, true
			}
			if p.ActionTime > 0 || p.aiAvoid {
				dx, dz = eightWay(p.FX, p.FZ)
			} else {
				dx, dz = advanceSteering(p, tx, tz, decide)
			}
			u = Input{}
			if decide && b.Owner == i {
				if route == nil {
					plan := hardware
					if plan == nil {
						plan = s.defensivePass(i, &catchDistances)
					}
					if plan == nil {
						plan = s.defensivePunt(i, random)
					}
					p.FX = 0
					if plan.key > 1 {
						p.FX = 1
					} else if plan.key < -1 {
						p.FX = -1
					}
					p.FZ = float64(plan.key) - 3*p.FX
					mode := 2
					if plan.high {
						mode = 3
					}
					s.beginThrow(i, mode)
					p.throwSteer = plan.steer
				}
			}
		}

		if human {
			p.aiWait = 1. / 25
			dx, dz = eightWay(dx, dz)
		}
		if p.Action != 1 && p.Action != 2 && p.Action != 3 && p.Action != 6 && p.Action != 7 && math.Hypot(dx, dz) > .01 {
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
					high := p.throwMode == 3 || p.throwMode == 1 && inputs[t].Shoot
					steering := Input{Z: p.throwSteer}
					if humans[t] {
						steering = inputs[t]
					}
					s.throw(i, high, steering)
					p.throwMode = 0
					s.Charge[t] = 0
				}
			}
		}
		if pressed && b.Owner != i && p.Cooldown <= 0 && p.ActionTime <= 0 {
			if canJumpAtBall(p, b, catchDistances[i], inMultiplier) && !u.Tackle {
				runningSpeed := movementSpeed(p, false, false)
				p.Action = 2
				p.jumping = true
				p.stationaryJump = dx == 0 && dz == 0
				p.jumpSpeed = 0
				if human {
					p.jumpSpeed = runningSpeed
				} else {
					p.jumpSpeed = movementSpeed(p, false, false)
				}
				p.ActionTime = actionDuration(2, p.Stats[3])
				p.Cooldown = p.ActionTime
				s.event(2, i, -1, p.X, p.Z, 0)
			} else if math.Hypot(dx, dz) < .01 {
				p.Action = 7
				p.ActionTime = 4. / 25
				p.Cooldown = p.ActionTime
				p.tackleResolved = false
				p.keeperBlock = false
				s.event(20, i, -1, p.X, p.Z, 0)
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
		b.H = 1 + jumpHeight(p)
		b.VX = p.moveX
		b.VZ = p.moveZ
		b.VH = 0
	} else if inMultiplier {
		// The original multiplier animation owns the ball position while inside.
	} else {
		// step_sprites advances ball animation before goals and wall constraints.
		tableFlight := flightStep(b, dt)
		// constrain_sprites (0xe5f4): high stages use a 24-unit wall inset, low 32.
		inset := 32.
		if b.FlightKind != 0 && b.FlightStage > 2 || b.FlightKind == 0 && b.H > 1.25 {
			inset = 24
		}
		wallX, wallZ := (576-inset)*terrainUnit, (320-inset)*terrainUnit
		if math.Abs(b.Z) > wallZ && !specialContact {
			kind := 5
			if inset == 24 {
				kind = 26
			}
			s.event(kind, b.LastTouch, -1, b.X, b.Z, b.H)
			b.Z = math.Copysign(wallZ, b.Z)
			reflectBall(b, false)
		}
		if math.Abs(b.X) > wallX {
			if math.Abs(b.Z) <= goalWidth && b.X*b.VX > 0 && (b.FlightKind > 0 && b.FlightStage <= 2 || b.FlightKind == 0 && b.H < goalHeight) && !s.goalBlocked(b.X) {
				scorer := 0
				if b.X*s.direction(0) < 0 {
					scorer = 1
				}
				s.Score[scorer] += s.points(scorer, 10)
				s.event(7, scorer, b.LastTouch, b.X, b.Z, b.H)
				s.beginRestart(1.4)
				s.previous = inputs
				return
			} else {
				b.X = math.Copysign(wallX, b.X)
				reflectBall(b, true)
				kind := 27
				if inset == 24 {
					kind = 28
				}
				s.event(kind, b.LastTouch, -1, b.X, b.Z, b.H)
			}
		}

		b.X += b.VX * dt
		b.Z += b.VZ * dt
		if !tableFlight {
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
			distance := referenceDistance(p.X-b.X, p.Z-b.Z)
			if distances != nil {
				distance = distances[i]
			}
			if distance > 16 {
				continue
			}
			keeperBlock := p.Action == 1 && p.keeperBlock
			if b.FlightKind != 0 && b.FlightStage > 2 && (keeperBlock || !(p.Action == 2 && p.jumping)) || b.FlightKind == 0 && b.H > 1.25+jumpHeight(*p) {
				continue
			}
			if b.Charged && b.Electric > 0 && b.LastTouch >= 0 && p.Team != s.Players[b.LastTouch].Team && (keeperBlock || !s.active(10, p.Team)) {
				if s.damageWithProtection(b.LastTouch, i, keeperBlock) {
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
			// goalie_deflect_ball (0xed52) also rejects high balls and zaps keepers.
			if keeperBlock {
				s.deflectBall(i)
				s.event(17, i, -1, b.X, b.Z, b.H)
				return
			}
			wasCharged := b.Charged
			if (b.VX != 0 || b.VZ != 0) && b.LastTouch >= 0 && s.Players[b.LastTouch].Team != p.Team {
				b.Electric = 0
				b.Charged = false
			}
			if p.ActionTime <= 0 && p.moveX == 0 && p.moveZ == 0 && (b.VX != 0 || b.VZ != 0) {
				const unit = 22.4 / 576
				dx := int(math.Round(b.X/unit) - math.Round(p.X/unit))
				dz := int(math.Round(b.Z/unit) - math.Round(p.Z/unit))
				fx, fz := 0., 0.
				if absInt(dx) > absInt(dz)/2 {
					fx = math.Copysign(1, float64(dx))
				}
				if absInt(dz) > absInt(dx)/2 {
					fz = math.Copysign(1, float64(dz))
				}
				if fx != 0 || fz != 0 {
					p.FX, p.FZ = fx, fz
					p.Action = 6
					p.ActionTime = 3. / 25
				}
			}
			if !wasCharged && b.LastTouch >= 0 && s.Players[b.LastTouch].Team != p.Team {
				s.event(24+p.Team, i, b.LastTouch, b.X, b.Z, b.H)
			}
			s.Charge[team] = 0
			b.FlightKind = 0
			b.Owner = i
			b.LastTouch = i
			b.After = 0
			// get_ball (0xece4): impact sound requires horizontal ball movement.
			if b.VX != 0 || b.VZ != 0 {
				s.event(16, i, -1, b.X, b.Z, b.H)
			}
			return
		}
	}
}

// Existing slides resolve contact during thinking, before later players act.
func (s *State) resolveTackle(i int, distances *[18]int) {
	p := &s.Players[i]
	falling := p.Action == 4 && p.Stun > 0
	attack := p.Action
	if falling {
		attack = p.fallAttack
	}
	if (attack != 1 && attack != 7) || p.tackleResolved {
		return
	}
	for j := range s.Players {
		q := &s.Players[j]
		if q.Team == p.Team || q.Stun > 0 || q.Health <= 0 || s.active(10, q.Team) || distances[j] > 30 {
			continue
		}
		p.tackleResolved = true
		if falling {
			p.fallFinishing = true
		}
		// do_tackle plays contact (0x06) before the success roll.
		s.event(29, i, j, q.X, q.Z, 0)
		attacker := *p
		attacker.Action = attack
		if s.randomByte() > tackleThreshold(&attacker, q, j%9 == 0) {
			return
		}
		hadBall := s.Ball.Owner == j
		released := s.Ball
		counter, counterTime := 0, actionDuration(1, q.Stats[3])
		if !q.tackleResolved && !(q.Action == 1 && q.slideEnding) && (q.Action == 1 || q.Action == 7) {
			counter = q.Action
		}
		if s.damage(i, j) {
			q.fallAttack = counter
			if counter != 0 {
				q.fallAttackTime = counterTime
			}
			if falling && hadBall {
				s.Ball = released
				s.Ball.Owner = -1
			} else if hadBall {
				s.giveBall(i)
				kind := 24
				if p.Team == 1 {
					kind = 25
				}
				s.event(kind, i, j, q.X, q.Z, 0)
			}
			q.FX, q.FZ = eightWay(p.FX, p.FZ)
			if falling {
				q.FX, q.FZ = -q.FX, -q.FZ
			}
			speed := 3 * velocityUnit
			if attack == 1 {
				speed = 4 * velocityUnit
			}
			q.fallX, q.fallZ = q.FX*speed, q.FZ*speed
		}
		return
	}
}

// Amiga game_two_player initializes both complete rosters at 170.
func newMatch() State {
	s := initial()
	for i := range s.Players {
		for j := range s.Players[i].Stats {
			s.Players[i].Stats[j] = 170
			s.Players[i].BaseStats[j] = 170
		}
	}
	for team := range s.Bench {
		for i := range s.Bench[team] {
			for j := range s.Bench[team][i] {
				s.Bench[team][i][j] = 170
			}
		}
	}
	s.beginRestart(0)
	return s
}
