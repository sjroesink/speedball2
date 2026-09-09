package main

import (
	"strings"
	"testing"
)

func TestEventTailRetainsOrderAndFitsDatagram(t *testing.T) {
	s := initial()
	s.Medical = createMedical(7, 100, 500)
	for i := 0; i < 40; i++ {
		s.event(4, 7, 16, 1, 2, 3)
	}
	if s.EventCount != 16 || s.Events[0].ID != 25 || s.Events[15].ID != 40 {
		t.Fatal("event tail", s.Events)
	}
	snapshot := encodeSnapshot(Snapshot{State: s, Room: strings.Repeat("R", 80), Names: [2]string{strings.Repeat("A", 80), strings.Repeat("B", 80)}})
	if len(snapshot) > 1200 {
		t.Fatal("maximum snapshot exceeds datagram", len(snapshot))
	}
	t.Log("maximum snapshot bytes", len(snapshot))
	// State snapshots own their array; later simulation must not mutate old history.
	copyState := s
	s.event(5, 7, -1, 0, 0, 0)
	if copyState.Events[0].ID != 25 {
		t.Fatal("snapshot history changed after copy")
	}
}
