import test from "node:test";
import assert from "node:assert/strict";
import { steerToTarget, predictedTarget, advanceSteering } from "./steering.js";

test("live steering waits for the retained physical animation cursor", () => {
  const p={x:0,z:0,physicalPoseValid:true,poseCursor:3};
  advanceSteering(p,200*u,100*u,true);
  p.x=40*u;
  p.steerFrame=0;
  assert.deepEqual(advanceSteering(p,200*u,100*u),[1,0]);
  p.poseCursor=0; p.steerFrame=5;
  assert.deepEqual(advanceSteering(p,200*u,100*u),[1,1]);
});
const u = 22.4 / 576;
test("prediction uses the original intelligence bands in 25 Hz steps", () => {
  for (const [intelligence, expected] of [
    [100, 8],
    [149, 8],
    [150, 16],
    [199, 16],
    [200, 32],
    [255, 32],
  ]) {
    const [x, z] = predictedTarget(0, 0, 8 * u * 25, -3 * u * 25, intelligence);
    assert.ok(Math.abs(x / u - expected) < 1e-9);
    assert.ok(Math.abs(z / u + (expected * 3) / 8) < 1e-9);
  }
});
test("prediction reflects side, end and simultaneous corner bounces", () => {
  for (const sign of [-1, 1]) {
    const [x, z] = predictedTarget(
      sign * 540 * u,
      sign * 284 * u,
      sign * 8 * u * 25,
      sign * 8 * u * 25,
      200,
    );
    assert.ok(Math.abs(x / u - sign * 516) < 1e-9);
    assert.ok(Math.abs(z / u - sign * 260) < 1e-9);
    const [wallX, wallZ] = predictedTarget(
      sign * 544 * u,
      sign * 288 * u,
      0,
      0,
      100,
    );
    assert.ok(Math.abs(wallX / u - sign * 544) < 1e-9);
    assert.ok(Math.abs(wallZ / u - sign * 288) < 1e-9);
  }
});
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

test("distant diagonal steering holds direction instead of alternating every tick", () => {
  const p = { x: 0, z: 0 },
    target = [200 * u, 100 * u],
    headings = [];
  for (let tick = 0; tick < 16; tick++) {
    const [x, z] = advanceSteering(p, ...target, tick === 0);
    headings.push([x, z]);
    p.x += x * 5 * u;
    p.z += z * 5 * u;
  }
  for (let i = 1; i < 8; i++) assert.deepEqual(headings[i], headings[0]);
  assert.deepEqual(headings[0], [1, 0]);
  assert.deepEqual(headings[8], [1, 1]);
  for (let i = 9; i < 16; i++) assert.deepEqual(headings[i], headings[8]);
  // A changed destination must take effect immediately, without waiting a cycle.
  assert.deepEqual(advanceSteering(p, -200 * u, 0), [-1, 0]);
});
