package main

import "testing"

func TestZapLogicalViewRange(t *testing.T) {
	for _, view := range [][2]int{{0, 0}, {160, 484}, {320, 968}} {
		for _, c := range []struct {
			x, y int
			hit  bool
		}{{0, 0, true}, {320, 184, true}, {-1, 92, false}, {321, 92, false}, {160, -1, false}, {160, 185, false}} {
			s := initial()
			s.logicalView = view
			p := &s.Players[16]
			p.X = float64(576-view[1]-c.y) * terrainUnit
			p.Z = float64(view[0]+c.x-320) * terrainUnit
			s.Ball.Owner = 16
			s.pickup(7, 12)
			owner := 16
			if c.hit {
				owner = -1
			}
			if (p.Health < 100) != c.hit || s.Ball.Owner != owner {
				t.Fatal(c, p.Health, s.Ball.Owner)
			}
		}
	}
}
