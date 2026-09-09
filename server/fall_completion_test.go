package main

import "testing"

func TestFallCompletionFrames(t *testing.T) {
	for _, fatal := range []bool{false, true} {
		for _, restart := range []bool{false, true} {
			s := initial()
			for i := range s.Players {
				s.Players[i].Stun = 100
			}
			for i := range s.Pickups {
				s.Pickups[i].Wait = 100
			}
			p := &s.Players[16]
			p.X, p.Z, p.Stun = 0, 0, 0
			if fatal {
				p.Health = 1
			}
			if !s.damage(7, 16) {
				t.Fatal("fixture damage")
			}
			if restart {
				s.beginRestart(0)
			}
			for frame := 0; frame < 26; frame++ {
				s.simulate(simulationStep, [2]Input{}, [2]bool{true, true})
				if p.physicalFrame != frame {
					t.Fatal("frame", fatal, restart, frame, p.physicalFrame)
				}
				if frame < 25 && (p.Action != 4 || p.Injury != 0 || p.Stun <= 0) {
					t.Fatal("early completion", fatal, restart, frame)
				}
			}
			if fatal {
				if p.Injury != 1 || s.Score[0] != 10 {
					t.Fatal("fatal completion")
				}
			} else if p.Action != 0 || p.poseCursor != 0 || p.Stun != 0 || p.moveX != 0 || p.moveZ != 0 {
				t.Fatal("healthy completion")
			}
		}
	}
}
