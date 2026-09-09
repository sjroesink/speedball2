import { test } from "node:test";
import assert from "node:assert/strict";
import { actionDuration, canJumpAtBall } from "./attributes.js";
test("jump selection uses speed reach, free possession and original flight stage", () => {
  const p = { stats: [100, 100, 100, 100, 100, 100, 100, 100] };
  const b = { owner: -1, flightKind: 2, flightStage: 3, h: 5 };
  assert.equal(canJumpAtBall(p, b, 48, false), true);
  assert.equal(canJumpAtBall(p, b, 49, false), false);
  p.stats[3] = 250;
  assert.equal(canJumpAtBall(p, b, 72, false), true);
  assert.equal(canJumpAtBall(p, b, 73, false), false);
  assert.equal(canJumpAtBall(p, b, 0, true), false);
  b.owner = 9;
  assert.equal(canJumpAtBall(p, b, 0, false), false);
  b.owner = -1;
  b.flightStage = 2;
  assert.equal(canJumpAtBall(p, b, 0, false), false);
});

import { initial, step, simulationStep, jumpHeight } from "./game.js";
test("slide releases control on original sustain frame without extra cooldown", () => {
  for (const [speed, frames] of [
    [100, 8],
    [120, 9],
    [160, 10],
    [200, 11],
    [240, 12],
  ]) {
    const s = initial();
    for (const q of s.players) q.stun = 10;
    const p = s.players[7];
    Object.assign(p, { x: 0, z: 0, fx: 1, fz: 0, stun: 0 });
    p.stats[3] = speed;
    Object.assign(s.ball, { x: 8, z: 8, owner: -1 });
    step(s, simulationStep, { tackleId: 1, x: 1 });
    assert.equal(p.actionTime, frames / 25);
    for (let i = 1; i < frames; i++) {
      step(s, simulationStep, { tackleId: 1, x: 1 });
      assert.equal(p.action, 1, `speed ${speed}, frame ${i}`);
    }
    step(s, simulationStep, { tackleId: 1, x: 1 });
    assert.equal(p.action, 0);
    assert.ok(p.cooldown < 1e-9);
  }
});
test("jump has two landing frames and retains direction while busy", () => {
  for (const speed of [100, 250]) {
    assert.equal(actionDuration(2, speed), speed === 100 ? 12 / 25 : 16 / 25);
    const s = initial();
    for (const q of s.players) q.stun = 10;
    const p = s.players[7];
    Object.assign(p, {
      x: 0,
      z: 0,
      fx: 1,
      fz: 0,
      stun: 0,
      action: 2,
      actionTime: actionDuration(2, speed),
    });
    p.stats[3] = speed;
    Object.assign(s.ball, { x: 8, z: 8, owner: -1 });
    step(s, simulationStep, { x: -1, z: 1 });
    assert.ok(p.x > 0);
    assert.equal(p.z, 0);
    assert.equal(p.fx, 1);
    p.actionTime = 2 / 25;
    assert.ok(Math.abs(jumpHeight(p)) < 1e-9);
  }
});

test("landing clears airborne privileges after that tick's catch check", () => {
  for (const [firstDistance, stage, expectedOwner] of [
    [0, 3, 7],
    [8, 3, -1],
    [8, 2, 7],
  ]) {
    const s = initial();
    for (const q of s.players) q.stun = 10;
    const p = s.players[7];
    Object.assign(p, {
      x: 0,
      z: 0,
      fx: 1,
      fz: 0,
      stun: 0,
      action: 2,
      jumping: true,
      actionTime: 3 / 25,
    });
    Object.assign(s.ball, {
      owner: -1,
      x: firstDistance,
      z: 0,
      flightKind: 2,
      flightStage: 3,
      h: 3,
    });
    step(s, simulationStep, {});
    assert.equal(p.jumping, false);
    assert.equal(p.action, 2);
    if (firstDistance === 0) assert.equal(s.ball.owner, expectedOwner);
    else {
      Object.assign(s.ball, {
        owner: -1,
        x: p.x,
        z: p.z,
        flightKind: 2,
        flightStage: stage,
        h: 3,
      });
      step(s, simulationStep, {});
      assert.equal(s.ball.owner, expectedOwner);
    }
  }
});
