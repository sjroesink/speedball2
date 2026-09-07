package main

import "math"

const (
	pitchX     = 21.
	pitchZ     = 11.2
	goalWidth  = 3.8
	goalHeight = 2.
	gravity    = 18.
)

// Actions are replicated, including misses: 1 slide, 2 jump, 3 throw, 4 hit.
type Player struct {
	X, Z                       float64
	Team                       int
	FX, FZ                     float64
	Stun, ActionTime, Cooldown float64
	Action                     int
}
type Ball struct {
	X, Z, H, VX, VZ, VH float64
	Owner, LastTouch    int
	Lock, After         float64
}
type Event struct {
	ID            uint32
	Kind          int
	X, Z, H       float64
	Actor, Target int
}
type State struct {
	Players    [18]Player
	Ball       Ball
	Score      [2]int
	Time       float64
	Tick       uint64
	Over       bool
	Period     int
	Pause      float64
	Controlled [2]int
	Charge     [2]float64
	Event      Event
	previous   [2]Input
	Stars      [2]uint8
	Multiplier int
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
	s := State{Time: 90, Period: 1, Controlled: [2]int{7, 16}}
	s.resetPitch()
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
		s.Players[i] = Player{X: formation[i%9][0] * d, Z: formation[i%9][1], Team: t, FX: d}
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
		cur := s.Controlled[t]
		if s.Players[cur].ActionTime > 0 && s.Players[cur].Stun <= 0 {
			continue
		}
		best := -1
		distance := math.MaxFloat64
		for i, p := range s.Players {
			if p.Team != t || p.Stun > 0 {
				continue
			}
			d := math.Hypot(p.X-s.Ball.X, p.Z-s.Ball.Z)
			if i%9 == 0 && math.Abs(s.Ball.X) > 15 {
				d -= 1
			}
			if i == cur {
				d -= .7
			}
			if d < distance {
				best = i
				distance = d
			}
		}
		if best >= 0 {
			s.Controlled[t] = best
		}
	}
}
func (s *State) throw(i int, lob bool) {
	p := &s.Players[i]
	b := &s.Ball
	speed, vh := 24., 2.
	if lob {
		speed = 16
		vh = 11
	}
	*b = Ball{X: p.X + p.FX*.9, Z: p.Z + p.FZ*.9, H: 1, VX: p.FX * speed, VZ: p.FZ * speed, VH: vh, Owner: -1, LastTouch: i, Lock: .18, After: .45}
	p.Action = 3
	p.ActionTime = .32
	s.event(3, i, -1, b.X, b.Z, b.H)
}
func (s *State) step(dt float64, inputs [2]Input) { s.simulate(dt, inputs, [2]bool{true, true}) }
func (s *State) simulate(dt float64, inputs [2]Input, humans [2]bool) {
	s.Tick++
	if s.Over {
		return
	}
	if s.Pause > 0 {
		s.Pause = math.Max(0, s.Pause-dt)
		s.previous = inputs
		return
	}
	s.Time = math.Max(0, s.Time-dt)
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
		if !human {
			d := s.direction(t)
			tx, tz := formation[i%9][0]*d, formation[i%9][1]
			if b.Owner == i {
				tx = d * 22
				tz = clamp(p.Z*.4, -2, 2)
			} else if i%9 == 0 {
				tx = -d * 19.5
				tz = clamp(b.Z, -3.3, 3.3)
			} else if s.Controlled[t] == i {
				tx = b.X + b.VX*.15
				tz = b.Z + b.VZ*.15
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
			if p.Cooldown <= 0 && math.Hypot(b.X-p.X, b.Z-p.Z) < 3 && b.Owner != i {
				if b.H > 1.4 {
					u.Shoot = true
				} else if b.Owner >= 0 && s.Players[b.Owner].Team != t {
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
					p.FX, p.FZ = normalized(d*23-p.X, -p.Z)
					s.throw(i, danger && p.X*d < 10)
				}
			}
		}
		if p.Action != 1 && math.Hypot(dx, dz) > .01 {
			p.FX, p.FZ = normalized(dx, dz)
		}
		pressed := (u.Shoot && !s.previous[t].Shoot) || (u.Tackle && !s.previous[t].Tackle) || u.Fire > s.previous[t].Fire || u.TackleID > s.previous[t].TackleID
		if !human {
			pressed = u.Shoot || u.Tackle
		}
		if human && b.Owner == i {
			if (u.Lob && !s.previous[t].Lob) || u.LobID > s.previous[t].LobID {
				s.throw(i, true)
				s.Charge[t] = 0
			} else if u.Fire > s.previous[t].Fire && !u.Shoot {
				s.throw(i, false)
				s.Charge[t] = 0
			} else if u.Shoot {
				s.Charge[t] = math.Min(1, s.Charge[t]+dt)
			} else if s.Charge[t] > 0 {
				s.throw(i, s.Charge[t] >= .24)
				s.Charge[t] = 0
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
				p.ActionTime = .38
				p.Cooldown = .85
				s.event(1, i, -1, p.X, p.Z, 0)
			}
		}
		speed := 6.8
		if b.Owner == i {
			speed = 6.2
		}
		if p.Action == 1 {
			dx = p.FX
			dz = p.FZ
			speed = 14
		}
		if p.Action == 2 {
			speed = 4.5
		}
		n := math.Max(1, math.Hypot(dx, dz))
		p.X = clamp(p.X+dx/n*speed*dt, -20.5, 20.5)
		p.Z = clamp(p.Z+dz/n*speed*dt, -10.7, 10.7)
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
		if p.Action == 1 {
			for j := range s.Players {
				q := &s.Players[j]
				if q.Team == p.Team || q.Stun > 0 {
					continue
				}
				dx, dz := q.X-p.X, q.Z-p.Z
				if math.Hypot(dx, dz) < 1.15 && dx*p.FX+dz*p.FZ > -.3 {
					q.Stun = 1.35
					q.Action = 4
					q.ActionTime = 1.35
					q.X = clamp(q.X+p.FX*.7, -20.5, 20.5)
					q.Z = clamp(q.Z+p.FZ*.7, -10.7, 10.7)
					if b.Owner == j {
						*b = Ball{X: q.X, Z: q.Z, H: .5, VX: p.FX * 5, VZ: p.FZ * 5, VH: 3, Owner: -1, LastTouch: i, Lock: .08}
					}
					s.event(4, i, j, q.X, q.Z, .5)
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
	if b.Owner >= 0 {
		p := s.Players[b.Owner]
		b.X = p.X + p.FX*.5
		b.Z = p.Z + p.FZ*.5
		b.H = 1
		b.VX = 0
		b.VZ = 0
		b.VH = 0
	} else {
		if b.After > 0 && b.LastTouch >= 0 {
			t := s.Players[b.LastTouch].Team
			if humans[t] {
				b.VX += inputs[t].X * 5 * dt
				b.VZ += inputs[t].Z * 5 * dt
			}
		}
		b.X += b.VX * dt
		b.Z += b.VZ * dt
		b.H += b.VH * dt
		b.VH -= gravity * dt
		if b.H < .25 {
			b.H = .25
			if b.VH < -2 {
				b.VH = -b.VH * .5
			} else {
				b.VH = 0
			}
			drag := math.Pow(.993, dt*60)
			b.VX *= drag
			b.VZ *= drag
		}
		if math.Abs(b.Z) > pitchZ {
			b.Z = math.Copysign(2*pitchZ-math.Abs(b.Z), b.Z)
			b.VZ *= -.92
			s.event(5, b.LastTouch, -1, b.X, b.Z, b.H)
			s.wallBonus()
		}
		if math.Abs(b.X) > pitchX {
			if math.Abs(b.Z) < goalWidth && b.H < goalHeight {
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
				b.VX *= -.92
				s.event(5, b.LastTouch, -1, b.X, b.Z, b.H)
			}
		}
		s.domeBounce()
		if b.Lock <= 0 {
			best := -1
			distance := .8
			for i, p := range s.Players {
				if p.Stun > 0 {
					continue
				}
				reach := 1.25 + jumpHeight(p)
				if b.H > reach {
					continue
				}
				d := math.Hypot(p.X-b.X, p.Z-b.Z)
				if d < distance {
					best = i
					distance = d
				}
			}
			if best >= 0 {
				b.Owner = best
				b.LastTouch = best
				b.After = 0
				s.Controlled[s.Players[best].Team] = best
			}
		}
	}
	s.previous = inputs
}
