import { test } from "node:test";
import assert from "node:assert/strict";
import { actionDuration, canJumpAtBall, velocityUnit } from "./attributes.js";
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

test("carried ball rises with a jumping player and shares carrier velocity", () => {
  const s = initial();
  for (const q of s.players) q.stun = 100;
  const p = s.players[7];
  Object.assign(p, {
    x: 0,
    z: 0,
    fx: 1,
    fz: 0,
    stun: 0,
    action: 2,
    jumping: true,
    actionTime: 12 / 25,
  });
  s.ball.owner = 7;
  step(s, simulationStep, {});
  assert.ok(s.ball.h > 1);
  assert.equal(s.ball.vx, 4 * velocityUnit);
  assert.equal(s.ball.vz, 0);
  for (let tick = 1; tick < 5; tick++) step(s, simulationStep, {});
  assert.ok(s.ball.h > 2.7);
  for (let tick = 5; tick < 10; tick++) step(s, simulationStep, {});
  assert.ok(Math.abs(s.ball.h - 1) < 1e-9);
  assert.equal(s.ball.owner, 7);
  for (let tick = 10; tick < 12; tick++) step(s, simulationStep, {});
  assert.equal(s.ball.vx, 0);
  assert.equal(s.ball.h, 1);
});

test("human jumping keeps launch running speed across stat changes", () => {
  for (const [speed, level] of [
    [100, 5],
    [140, 5],
    [141, 6],
    [170, 6],
    [171, 6],
    [200, 6],
    [201, 7],
    [250, 7],
  ]) {
    const s = initial();
    for (const q of s.players) q.stun = 100;
    const p = s.players[7];
    Object.assign(p, { x: 0, z: 0, stun: 0 });
    p.stats[3] = speed;
    Object.assign(s.ball, { x: 1, z: 0, h: 4, owner: -1 });
    step(s, simulationStep, { shoot: true, x: 1 });
    assert.equal(p.action, 2);
    assert.equal(p.moveX, level * velocityUnit);
    p.stats[3] = speed === 100 ? 250 : 100;
    s.ball.x = 8;
    step(s, simulationStep, { x: -1 });
    assert.equal(p.moveX, level * velocityUnit);
  }
});

test("jump without movement input stays in place until recovery", () => {
  const s = initial();
  for (const q of s.players) q.stun = 100;
  const p = s.players[7];
  Object.assign(p, { x: 0, z: 0, fx: 0, fz: -1, stun: 0 });
  Object.assign(s.ball, { x: 1, z: 0, h: 4, owner: -1 });
  step(s, simulationStep, { shoot: true });
  assert.equal(p.action, 2);
  assert.equal(p.stationaryJump, true);
  s.ball.x = 8;
  for (let tick = 1; tick < 12; tick++) {
    step(s, simulationStep, { x: 1 });
    assert.equal(p.x, 0);
    assert.equal(p.z, 0);
    assert.equal(p.fz, -1);
  }
  step(s, simulationStep, { x: 1 });
  assert.ok(p.x > 0);
});
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
      assert.equal(p.action, i === frames - 1 ? 0 : 1, `speed ${speed}, frame ${i}`);
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

test("lob shortcut cannot cancel a busy action after obtaining possession", () => {
  for (const action of [1, 2, 3]) {
    const s = initial();
    s.logicalView = [160, 380];
    for (const q of s.players) q.stun = 10;
    const p = s.players[7];
    Object.assign(p, {
      x: 4,
      z: 0,
      fx: 1,
      fz: 0,
      stun: 0,
      action,
      jumping: action === 2,
      actionTime: 3 / 25,
    });
    Object.assign(s.ball, { owner: 7, x: 4, z: 0, h: 1 });
    step(s, simulationStep, { lobId: 1 });
    assert.equal(s.ball.owner, 7);
    assert.equal(p.action, action);
    assert.equal(s.charge[0], 0);
    step(s, simulationStep, { lobId: 1 });
    step(s, simulationStep, { lobId: 1 });
    assert.equal(p.action, 0);
    assert.equal(s.ball.owner, 7, "blocked pulse must not be queued");
    step(s, simulationStep, { lobId: 2 });
    assert.equal(s.ball.owner, 7);
    for (let n = 0; n < 4; n++) step(s, simulationStep, { lobId: 2 });
    assert.equal(s.ball.owner, -1);
    assert.equal(s.ball.flightKind, 2);
  }
});

test('changing speed mid-jump does not move the player vertically without a tick',()=>{
 const s=initial();for(const p of s.players) Object.assign(p,{x:20,z:10,stun:100});
 const p=s.players[7];Object.assign(p,{x:0,z:0,stun:0});
 Object.assign(s.ball,{x:1,z:0,h:4,owner:-1});
 step(s,.04,{shoot:true});for(let n=0;n<3;n++)step(s,.04,{});
 const height=jumpHeight(p);p.stats[3]=250;
 assert.equal(jumpHeight(p),height);
});
