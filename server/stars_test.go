package main

import "testing"

func TestOriginalStarCells(t *testing.T) {
	for group := 0; group < 2; group++ {
		start, z := 384, -288
		if group == 1 {
			start, z = 608, 288
		}
		for index := 0; index < 5; index++ {
			for _, offset := range []int{0, 16, 31} {
				s := initial()
				s.Ball = Ball{Owner: -1, LastTouch: group*9 + 7, X: float64(576-start-index*32-offset) * terrainUnit, Z: float64(z) * terrainUnit, H: 4}
				s.wallBonus()
				if s.Stars[group] != 1<<index || s.Score[group] != 2 {
					t.Fatal("star cell", group, index, offset)
				}
			}
		}
		for _, y := range []int{start - 1, start + 160} {
			s := initial()
			s.Ball = Ball{Owner: -1, LastTouch: group*9 + 7, X: float64(576-y) * terrainUnit, Z: float64(z) * terrainUnit}
			s.wallBonus()
			if s.Score[group] != 0 {
				t.Fatal("outside bank scored")
			}
		}
	}
}
