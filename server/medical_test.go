package main

import "testing"

func TestMedicalPhasesAndMirror(t *testing.T) {
	a, b := createMedical(7, 100, 500), createMedical(16, 540, 652)
	phases := map[int]bool{0: true}
	done := false
	for tick := 0; tick < 1000 && !done; tick++ {
		done = advanceMedical(a, 1./25)
		if advanceMedical(b, 1./25) != done || a.Phase != b.Phase {
			t.Fatal("mirror phase")
		}
		phases[a.Phase] = true
		for i := 0; i < 2; i++ {
			if a.Medics[i][0]+b.Medics[i][0] != 640 || a.Medics[i][1]+b.Medics[i][1] != 1152 {
				t.Fatal("mirror position")
			}
		}
	}
	if !done || len(phases) != 4 || a.Medics[0][0] <= 688 || b.Medics[0][0] >= -48 {
		t.Fatal("incomplete route", a, b)
	}
}

func TestMedicalFrameRateAndSnapshotOwnership(t *testing.T) {
	a, b := createMedical(7, 100, 500), createMedical(7, 100, 500)
	for i := 0; i < 300; i++ {
		advanceMedical(a, 1./25)
	}
	for i := 0; i < 1440; i++ {
		advanceMedical(b, 1./120)
	}
	if a.Medics != b.Medics || a.Patient != b.Patient || a.Phase != b.Phase {
		t.Fatal("frame rate changes transport")
	}
	s := initial()
	s.Medical = createMedical(7, 100, 500)
	old := s
	expected := *old.Medical
	s.medicalStep(1. / 25)
	if *old.Medical != expected {
		t.Fatal("old snapshot changed")
	}
}
