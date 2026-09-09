package main

import "testing"

func TestOriginalViewport(t *testing.T) {
	for _, c := range []struct {
		view         [2]int
		x, y         int
		presentation bool
		want         [2]int
	}{
		{[2]int{160, 484}, 327, 583, false, [2]int{160, 485}},
		{[2]int{160, 484}, 328, 584, false, [2]int{162, 486}},
		{[2]int{160, 484}, 327, 583, true, [2]int{161, 485}},
		{[2]int{160, 484}, 640, 1152, false, [2]int{176, 500}},
		{[2]int{0, 0}, 0, 0, false, [2]int{0, 0}},
		{[2]int{320, 968}, 640, 1152, false, [2]int{320, 968}},
	} {
		if got := scrollViewport(c.view, c.x, c.y, c.presentation); got != c.want {
			t.Fatal(c, got)
		}
	}
	v := [2]int{160, 484}
	for _, c := range []struct {
		x, y, margin int
		want         bool
	}{{160, 484, 0, true}, {480, 668, 0, true}, {481, 668, 0, false}, {480, 669, 0, false}, {176, 500, 16, true}, {464, 652, 16, true}, {175, 500, 16, false}} {
		if inViewport(v, c.x, c.y, c.margin) != c.want {
			t.Fatal(c)
		}
	}
}
