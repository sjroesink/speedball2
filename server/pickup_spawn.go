package main

// Amiga powerup_fns (0x4616), translated to our public effect identifiers.
var powerKinds = [...]int{10, 1, 3, 4, 5, 6, 7, 8, 2, 9, 11, 12}

func (s *State) spawnPickup(slot int) {
	const unit = 22.4 / 576
	item := &s.Pickups[slot]
	random := func() uint32 { s.randomByte(); return s.RNG[0] }
	if slot == 6 {
		x, y := 72+int(random()&0x1f0), 72+int(random()&0x3f0)
		value := random()
		*item = Pickup{Kind: 14 + int(((value>>16)+1)&7), X: float64(576-y) * unit, Z: float64(x-320) * unit, Wait: float64(value&255) / 25}
		s.ArmourPickupsLeft = 2
		return
	}
	coin := slot >= 2
	quadrant := slot - 2
	mask := uint32(0x1f0)
	if coin {
		mask = 0xf0
	}
	x := 72 + int(random()&mask)
	if coin && quadrant%2 != 0 {
		x += 256
	}
	y := 72 + int(random()&0x1f0)
	if coin && quadrant >= 2 || !coin && slot == 1 {
		y += 512
	}
	item.X, item.Z = float64(576-y)*unit, float64(x-320)*unit
	if coin {
		item.Kind = 13
		item.Wait = float64((random()&31)+32) / 25
	} else {
		for {
			value := random()
			kind := (value >> 16) & 15
			if kind >= 12 || (s.Training && kind == 1) {
				continue
			}
			item.Kind = powerKinds[kind]
			item.Wait = float64((value&255)|128) / 25
			break
		}
	}
	item.Life = 0
}
