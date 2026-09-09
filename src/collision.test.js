import { test } from "node:test";
import assert from "node:assert/strict";
import { blockPlayerMovement, contactDistances } from "./collision.js";
const unit = 22.4 / 576;
function fixture(x = 20, z = 0) {
  return [
    { x: 0, z: 0, team: 0, health: 100, moveX: 25 * unit, moveZ: 25 * unit },
    { x: x * unit, z: z * unit, team: 1, health: 100, stun: 0 },
  ];
}
test("opponents block approaching axes, with inclusive 30-unit cached reach", () => {
  for (const distance of [30, 31]) {
    const p = fixture();
    blockPlayerMovement(p, 0, [0, distance], 1 / 25);
    assert.equal(p[0].x, distance === 30 ? -unit : 0);
    assert.equal(p[0].z, 0);
    assert.equal(p[1].x, 20 * unit);
  }
  const p = fixture(20, 10);
  blockPlayerMovement(p, 0, [0, 25], 1 / 25);
  assert.equal(p[0].x, -unit);
  assert.equal(p[0].z, 0, "half-axis equality is excluded");
  const q = fixture(20, 11);
  blockPlayerMovement(q, 0, [0, 25], 1 / 25);
  assert.equal(q[0].x, -unit);
  assert.equal(q[0].z, -unit);
});
test("teammates, fallen opponents, stationary overlap and retreat are not pushed", () => {
  for (const kind of ["team", "fallen", "stationary", "retreat"]) {
    const p = fixture();
    if (kind === "team") p[1].team = 0;
    if (kind === "fallen") p[1].stun = 1;
    if (kind === "stationary") p[0].moveX = p[0].moveZ = 0;
    if (kind === "retreat") p[0].moveX = -25 * unit;
    blockPlayerMovement(p, 0, contactDistances(p)[0], 1 / 25);
    assert.equal(p[0].x, 0, kind);
    assert.equal(p[0].z, 0, kind);
  }
});

import { initial, step, simulationStep } from "./game.js";
function tackleFixture(distance) {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  Object.assign(s.players[7], {
    stun: 0,
    x: 0,
    z: 0,
    fx: 1,
    fz: 0,
    action: 1,
    actionTime: 0.3,
  });
  Object.assign(s.players[16], {
    stun: 0,
    x: distance * unit,
    z: 0,
    fx: 1,
    fz: 0,
  });
  Object.assign(s.ball, { owner: 16, x: distance * unit, z: 0 });
  return s;
}
test("tackle uses cached 30-unit distance before movement", () => {
  const near = tackleFixture(30);
  step(near, simulationStep, {}, [true, true]);
  assert.equal(near.players[7].tackleResolved, true);
  const far = tackleFixture(31);
  step(far, simulationStep, {}, [true, true]);
  assert.equal(!!far.players[7].tackleResolved, false);
  step(far, simulationStep, {}, [true, true]);
  assert.equal(far.players[7].tackleResolved, true);
});
test("simultaneous tackles use roster order independently of tick parity", () => {
  for (const tick of [0, 1]) {
    const s = tackleFixture(20);
    s.tick = tick;
    s.rng = [0, 0];
    Object.assign(s.players[16], { action: 1, actionTime: 0.3 });
    step(s, simulationStep, {}, [true, true]);
    assert.equal(s.players[16].tackleResolved, true);
    assert.equal(s.players[7].tackleResolved, true);
    assert.deepEqual(s.events.filter(e => e.kind === 4).map(e => e.actor), [16, 7]);
    assert.ok(s.players[16].stun > 0);
    assert.ok(s.players[7].stun > 0);
    assert.equal(s.players[16].poseKind, 1, "later damage cannot retroactively advance the earlier player's fall");
    assert.equal(s.players[7].poseKind, 4, "earlier damage advances during the victim's own turn");
    step(s, simulationStep, {}, [true, true]);
    assert.equal(s.players[16].poseKind, 4, "earlier victim advances the fall on the next tick");
    assert.equal(s.players[16].physicalFrame, 0, "late damage starts at the first fall frame");
  }
});

test("earlier tackle cancels a later player's release on the same tick", () => {
  const s = tackleFixture(20);
  s.rng = [0, 0];
  Object.assign(s.players[7], { action: 3, actionTime: 5 / 25, throwMode: 1 });
  Object.assign(s.players[16], { action: 1, actionTime: 0.3 });
  Object.assign(s.ball, { owner: 7, x: 0, z: 0 });
  step(s, simulationStep, { shoot: true }, [true, true]);
  assert.ok(s.players[7].stun > 0);
  assert.equal(s.ball.owner, 16);
  assert.equal(
    (s.events ?? []).some((e) => e.kind === 3),
    false,
  );
});

test("later player's blocking uses positions before the global movement pass", () => {
  const s = initial();
  s.logicalView = [160, 380];
  for (const p of s.players) p.stun = 100;
  Object.assign(s.players[7], { x: 4, z: unit, stun: 0, fx: 0, fz: -1 });
  Object.assign(s.players[16], { x: 4, z: 0, stun: 0, fx: 1, fz: 0 });
  Object.assign(s.ball, { owner: 16, x: 4, z: 0 });
  step(s, simulationStep, { z: -1 }, [true, true], { x: 1 });
  assert.ok(
    s.players[16].x > 4,
    "earlier player still moves during final pass",
  );
  assert.ok(
    Math.abs(s.players[7].z - unit) < 1e-9,
    "later player remains blocked by pre-movement position",
  );
});

test("physical contact is independent of the old viewport", () => {
  const p = fixture(93);
  Object.assign(p[0], {
    x: 91 * unit,
    action: 4,
    stun: 0.2,
    actionTime: 0.2,
    fallX: 25 * unit,
  });
  blockPlayerMovement(p, 0, [0, 2], 1 / 25);
  assert.equal(p[0].x, 91 * unit);
  assert.equal(p[0].stun, 8 / 25);
  assert.equal(p[0].fallX, 0);
  p[1].x = 92 * unit;
  blockPlayerMovement(p, 0, [0, 1], 1 / 25);
  assert.equal(p[0].stun, 8 / 25);
  assert.equal(p[0].fallX, 0);
  const q = fixture(91);
  q[0].x = 93 * unit;
  q[0].moveX = -25 * unit;
  blockPlayerMovement(q, 0, [0, 2], 1 / 25);
  assert.ok(Math.abs(q[0].x - 94 * unit) < 1e-12);
});

test("tackled player moves at original fall speed then stops before recovery", () => {
  const s = tackleFixture(20);
  s.rng = [0, 0];
  Object.assign(s.players[7], { action: 0, actionTime: 0 });
  Object.assign(s.players[16], { action: 1, actionTime: 0.3 });
  s.ball.owner = 7;
  step(s, simulationStep, {}, [true, true]);
  const p = s.players[7];
  assert.equal(p.stun, 26 / 25);
  assert.ok(Math.abs(p.x) < 1e-9, "near attacker blocks initial fall movement");
  s.players[16].stun = 100;
  for (let n = 1; n < 25; n++) step(s, simulationStep, {}, [true, true]);
  assert.ok(Math.abs(p.x - 96 * unit) < 1e-9);
  const x = p.x;
  step(s, simulationStep, {}, [true, true]);
  assert.equal(p.x, x, "final fall frame stops velocity");
  assert.equal(p.action, 0, "fall terminator clears the action on the last displayed frame");
  assert.equal(p.physicalFrame, 25);
  step(s, simulationStep, {}, [true, true]);
  assert.equal(p.stun, 0);
  assert.equal(p.action, 0);
});

test("late fall contact holds recovery until the standing opponent leaves", () => {
  const s = tackleFixture(20);
  const p = s.players[7];
  Object.assign(p, {
    action: 4,
    actionTime: 9 / 25,
    stun: 9 / 25,
    fallX: 4 * 25 * unit,
    fallZ: 0,
  });
  for (let n = 0; n < 4; n++) {
    step(s, simulationStep, {}, [true, true]);
    assert.equal(p.stun, 8 / 25);
    assert.equal(p.actionTime, 8 / 25);
    assert.equal(p.fallX, 0);
    assert.equal(p.x, 0);
  }
  s.players[16].x = 10;
  for (let n = 0; n < 17; n++) step(s, simulationStep, {}, [true, true]);
  assert.equal(p.stun, 0);
  assert.equal(p.action, 0);
});
