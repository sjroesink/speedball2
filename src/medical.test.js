import test from "node:test";
import assert from "node:assert/strict";
import { createMedical, advanceMedical } from "./medical.js";

test("medical transport visits each phase, mirrors and finishes beyond the sideline", () => {
  const left = createMedical(7, 100, 500),
    right = createMedical(16, 540, 652);
  const phases = new Set([0]);
  let done = false;
  for (let tick = 0; tick < 1000 && !done; tick++) {
    done = advanceMedical(left, 1 / 25);
    assert.equal(advanceMedical(right, 1 / 25), done);
    phases.add(left.phase);
    assert.equal(left.phase, right.phase);
    for (let i = 0; i < 2; i++) {
      assert.equal(left.medics[i][0] + right.medics[i][0], 640);
      assert.equal(left.medics[i][1] + right.medics[i][1], 1152);
    }
  }
  assert.equal(done, true);
  assert.deepEqual([...phases], [0, 1, 2, 3]);
  assert.ok(left.medics[0][0] > 688);
  assert.ok(right.medics[0][0] < -48);
});

test("medical positions are independent of presentation frame rate", () => {
  const a = createMedical(7, 100, 500),
    b = createMedical(7, 100, 500);
  for (let i = 0; i < 300; i++) advanceMedical(a, 1 / 25);
  for (let i = 0; i < 1440; i++) advanceMedical(b, 1 / 120);
  assert.deepEqual(a.medics, b.medics);
  assert.deepEqual(a.patient, b.patient);
  assert.equal(a.phase, b.phase);
});
