import test from "node:test";
import assert from "node:assert/strict";
import { steerToTarget } from "./steering.js";
const u = 22.4 / 576;
test("far direction uses strict integer half-axis thresholds", () => {
  for (const sign of [-1, 1]) {
    assert.deepEqual(
      steerToTarget({ x: 0, z: 0 }, 40 * u, sign * 20 * u),
      [1, 0],
    );
    assert.deepEqual(steerToTarget({ x: 0, z: 0 }, 40 * u, sign * 21 * u), [
      1,
      sign,
    ]);
    assert.deepEqual(
      steerToTarget({ x: 0, z: 0 }, sign * 20 * u, 40 * u),
      [0, 1],
    );
  }
});
test("near movement corrects both axes after the initial direction choice", () => {
  assert.deepEqual(steerToTarget({ x: 0, z: 0 }, 32 * u, 4 * u, true), [1, 0]);
  assert.deepEqual(steerToTarget({ x: 0, z: 0 }, 32 * u, 4 * u, false), [1, 1]);
  assert.deepEqual(steerToTarget({ x: 0, z: 0 }, 33 * u, 4 * u, false), [1, 0]);
});
test("arrival snaps axes independently only below four original units", () => {
  const p = { x: 0, z: 0 };
  assert.deepEqual(steerToTarget(p, 3 * u, 20 * u), [0, 1]);
  assert.equal(p.x, 3 * u);
  assert.equal(p.z, 0);
  const q = { x: 0, z: 0 };
  assert.deepEqual(steerToTarget(q, 4 * u, 4 * u), [1, 1]);
  assert.deepEqual(q, { x: 0, z: 0 });
  assert.deepEqual(steerToTarget(q, -3 * u, -3 * u), [0, 0]);
  assert.deepEqual(q, { x: -3 * u, z: -3 * u });
});
