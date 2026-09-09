package main

// Source medical phases; physical sideline completion replaces screen clipping.
type Medical struct {
	Player, Phase   int
	Origin, Patient [2]int
	Medics          [2][2]int
	Fraction        float64
}

func createMedical(player, x, y int) *Medical {
	a, b := 560, 592
	if x > 320 {
		a, b = 80, 48
	}
	return &Medical{Player: player, Origin: [2]int{x, y}, Patient: [2]int{x, y}, Medics: [2][2]int{{a, y}, {b, y}}}
}
func advanceMedical(m *Medical, dt float64) bool {
	m.Fraction += dt * 25
	toward := func(from, to int) int {
		if to < from {
			return -min(2, from-to)
		}
		return min(2, to-from)
	}
	for m.Fraction >= 1-1e-9 {
		m.Fraction = max(0, m.Fraction-1)
		dir := 1
		if m.Origin[0] > 320 {
			dir = -1
		}
		a, b := &m.Medics[0], &m.Medics[1]
		if m.Phase == 0 && b[0] == m.Origin[0]+32*dir && b[1] == m.Origin[1] {
			m.Phase = 1
		}
		if m.Phase == 1 && b[0] == m.Origin[0]+28*dir && b[1] == m.Origin[1] {
			m.Phase = 2
		}
		if m.Phase == 2 && a[1] == m.Origin[1] {
			m.Phase = 3
		}
		if m.Phase == 3 && (a[0] < -48 || a[0] > 688) {
			return true
		}
		if m.Phase < 2 {
			offset := 28
			if m.Phase == 0 {
				offset = 32
			}
			b[0] += toward(b[0], m.Origin[0]+offset*dir)
			b[1] += toward(b[1], m.Origin[1])
			a[0] += toward(a[0], m.Patient[0]-26*dir)
			offsetY := 32
			if m.Origin[1] > 576 {
				offsetY = -32
			}
			a[1] += toward(a[1], m.Origin[1]+offsetY)
		} else {
			if m.Phase == 2 {
				a[0] += toward(a[0], m.Patient[0]-26*dir)
				a[1] += toward(a[1], m.Origin[1])
			} else {
				a[0] += 2 * dir
			}
			b[0] += 2 * dir
			m.Patient[0] += 2 * dir
		}
	}
	return false
}
