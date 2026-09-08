package main

import "math"

// Amiga order: aggression, attack, defense, speed, throw, power, stamina, intelligence.
func defaultStats() [8]int { return [8]int{100, 100, 100, 100, 100, 100, 100, 100} }
func ensureStats(p *Player) {
	if p.Stats[0] == 0 {
		p.Stats = defaultStats()
	}
}
func (s *State) restorePower() {
	for j := range s.Players {
		p := &s.Players[j]
		ensureStats(p)
		for i, v := range p.StatBackup {
			if v != 0 {
				p.Stats[i] = v
			}
		}
		p.StatBackup = [8]int{}
	}
}
func (s *State) applyPowerStats(kind, team int) {
	for j := range s.Players {
		p := &s.Players[j]
		ensureStats(p)
		if !((kind == 3 || kind == 6) && p.Team != team || kind == 4 && p.Team == team || kind == 5) {
			continue
		}
		for i := range p.Stats {
			if kind == 6 && i != 3 {
				continue
			}
			p.StatBackup[i] = p.Stats[i]
			p.Stats[i] = 250
			if kind == 3 || kind == 6 {
				p.Stats[i] = 100
			}
		}
	}
}
func equip(p *Player, kind int) {
	ensureStats(p)
	i := kind - 14
	p.Gear = kind
	p.GearBackup = p.Stats[i]
	if p.StatBackup[i] != 0 {
		p.GearBackup = p.StatBackup[i]
		p.GearPowerBackup = p.Stats[i]
		p.StatBackup[i] = 250
	}
	p.Stats[i] = 250
}
func unequip(p *Player) {
	if p.Gear == 0 {
		return
	}
	ensureStats(p)
	i := p.Gear - 14
	backup := p.GearBackup
	if backup == 0 {
		backup = 100
	}
	if p.StatBackup[i] != 0 {
		p.Stats[i] = p.GearPowerBackup
		if p.Stats[i] == 0 {
			p.Stats[i] = 100
		}
		p.StatBackup[i] = backup
	} else {
		p.Stats[i] = backup
	}
	p.Gear = 0
	p.GearBackup = 0
}
func hitDamage(p, q *Player) int {
	ensureStats(p)
	ensureStats(q)
	return max(1, (p.Stats[5]+150-q.Stats[6])>>4)
}
func deteriorate(p *Player, hit int) {
	ensureStats(p)
	loss := max(1, hit>>1)
	for i, v := range p.Stats {
		p.Stats[i] = max(100, v-loss)
	}
	unequip(p)
}
func tackleThreshold(p, q *Player, keeper bool) int {
	ensureStats(p)
	ensureStats(q)
	defense := q.Stats[2]
	if keeper {
		defense = min(255, defense+(defense>>2))
	}
	dir := func(p *Player) int { return int(math.Floor(math.Atan2(p.FZ, p.FX)/(math.Pi/4) + .5)) }
	defense -= [8]int{32, 24, 16, 8, 0, 8, 16, 24}[(dir(q)-dir(p)+8)&7]
	if p.Action == 1 {
		defense -= 16
	}
	if q.Action == 2 {
		defense -= 32
	}
	return ((p.Stats[1] + 256 - (defense & 255)) >> 1) & 255
}
func (s *State) randomByte() int {
	a, b := s.RNG[0], s.RNG[1]
	doubled := (a & 65535) * 2
	lo := (doubled & 65535) + (b & 65535) + (doubled >> 16)
	hi := (a >> 16) + (b >> 16) + (lo >> 16)
	s.RNG = [2]uint32{((hi & 65535) << 16) | (lo & 65535), (a & 0xffff0000) | (doubled & 65535)}
	return int(s.RNG[0] & 255)
}

// Terrain width 576 maps to 22.4 world units; PAL match logic runs at 25 Hz.
const velocityUnit = 25. * 22.4 / 576

func movementSpeed(p *Player, carrying, keeperBlock bool) float64 {
	ensureStats(p)
	speed := p.Stats[3]
	level := 4
	if speed > 140 {
		level++
	}
	if speed > 200 {
		level++
	}
	if !carrying {
		level++
	}
	if p.Action == 1 || p.Action == 2 {
		level = 4
		if p.Action == 1 {
			level++
		}
		if speed > 140 {
			level++
		}
		if speed > 170 {
			level++
		}
		if speed > 200 {
			level++
		}
	}
	if p.Action == 1 && keeperBlock {
		level = 8
	}
	if p.Action == 3 {
		level = 0
	}
	return float64(level) * velocityUnit
}

func referenceDistance(dx, dz float64) int {
	a, b := int(math.Round(math.Abs(dx)*576/22.4)), int(math.Round(math.Abs(dz)*576/22.4))
	if a < b {
		a, b = b, a
	}
	distance, quarter := a+(b>>1), b>>2
	if distance >= b*2 {
		if distance >= b*4 {
			quarter += quarter >> 1
		}
	} else {
		quarter >>= 1
	}
	return distance - quarter
}
