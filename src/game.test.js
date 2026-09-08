import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  step,
  throwBall,
  wallBonus,
  domeBounce,
  passTarget,
} from "./game.js";
const dt = 1 / 60;

test("a key pulse between simulation ticks still starts an action", () => {
  const s = isolated();
  s.ball.x = s.ball.z = 8;
  step(s, dt, { tackleId: 1 });
  assert.equal(s.players[7].action, 1);
});
function isolated() {
  const s = initial();
  s.players.forEach((p) => (p.stun = 10));
  Object.assign(s.players[7], { x: 0, z: 0, fx: 1, fz: 0, stun: 0 });
  return s;
}
test("missed tackle animates, moves, and cannot repeat while held", () => {
  const s = isolated();
  s.ball.x = s.ball.z = 9;
  step(s, dt, { tackle: true });
  assert.equal(s.players[7].action, 1);
  assert.ok(s.players[7].x > 0.2);
  for (let i = 0; i < 65; i++) step(s, dt, { tackle: true });
  assert.notEqual(s.players[7].action, 1);
});
test("tap and hold throw in facing direction with different heights", () => {
  for (const high of [false, true]) {
    const s = isolated();
    s.players[7].x = 4; // Clear throwing lane beside the central dome.
    s.ball.owner = 7;
    step(s, dt, { z: 1, shoot: true });
    assert.equal(s.ball.owner, 7, "ball stays in hand during wind-up");
    assert.equal(s.players[7].action, 3);
    for (let i = 1; i < 10; i++) step(s, dt, { z: 1, shoot: high });
    assert.equal(s.ball.owner, -1);
    assert.ok(s.ball.vz > 15);
    assert.ok(Math.abs(s.ball.vx) < 1);
    assert.ok(high ? s.ball.vh > 9 : s.ball.vh < 3);
  }
});
test("high ball clears standing player, can be caught while jumping", () => {
  const s = isolated();
  Object.assign(s.ball, { x: 0, z: 0, h: 3, owner: -1 });
  step(s, dt, {});
  assert.equal(s.ball.owner, -1);
  Object.assign(s.players[7], { action: 2, actionTime: 0.35 });
  s.ball.h = 2.7;
  s.ball.vh = 0;
  step(s, dt, {});
  assert.equal(s.ball.owner, 7);
});
test("a high throw at the goal rebounds above the crossbar", () => {
  const s = isolated();
  Object.assign(s.ball, { x: 20.9, z: 0, h: 3, vx: 24, owner: -1 });
  step(s, dt, {});
  assert.equal(s.score[0], 0);
  assert.ok(s.ball.vx < 0);
});
test("five stars bonus, enemy extinguish, and dome score", () => {
  const s = isolated();
  s.stars[0] = 15;
  Object.assign(s.ball, { x: 13, z: -11.1, h: 1, lastTouch: 7 });
  wallBonus(s);
  assert.equal(s.score[0], 12);
  s.ball.lastTouch = 16;
  wallBonus(s);
  assert.equal(s.score[0], 10);
  Object.assign(s.ball, { x: 1, z: 4, h: 0.5, vx: -12, vz: 0, lastTouch: 7 });
  domeBounce(s);
  assert.equal(s.score[0], 12);
  assert.ok(s.ball.vx > 0);
});
test("halftime swaps ends and resets targets", () => {
  const s = initial();
  s.time = dt / 2;
  s.stars = [31, 31];
  step(s, dt);
  assert.equal(s.period, 2);
  assert.ok(s.players[0].x > 0);
  assert.deepEqual(s.stars, [0, 0]);
});

test("a held button launches automatically and cannot charge indefinitely", () => {
  const s = isolated();
  s.players[7].x = 4;
  s.ball.owner = 7;
  for (let i = 0; i < 12; i++) step(s, dt, { shoot: true });
  assert.equal(s.ball.owner, -1);
  assert.ok(s.ball.vh > 9);
  assert.equal(s.charge[0], 0);
});
test("movement uses eight directions and has equal diagonal speed", () => {
  const a = isolated(),
    b = isolated();
  a.ball.x = b.ball.x = 8;
  a.ball.z = b.ball.z = 8;
  step(a, dt, { x: 1 });
  step(b, dt, { x: 1, z: 0.7 });
  assert.ok(
    Math.abs(Math.hypot(b.players[7].x, b.players[7].z) - a.players[7].x) <
      1e-8,
  );
  assert.ok(Math.abs(b.players[7].x - b.players[7].z) < 1e-8);
});

test("AI outlet chooses an unmarked forward teammate, never a stunned one", () => {
  const s = isolated();
  Object.assign(s.players[6], { x: 6, z: 3, stun: 0 });
  assert.equal(passTarget(s, 7), 6);
  Object.assign(s.players[16], { x: 6, z: 3, stun: 0 });
  assert.equal(passTarget(s, 7), -1);
  s.players[16].stun = 10;
  s.players[6].stun = 1;
  assert.equal(passTarget(s, 7), -1);
});

test('shots outside the original-width goal rebound off the end wall',()=>{
 const s=isolated();Object.assign(s.ball,{x:20.9,z:2.2,h:1,vx:24,owner:-1});
 step(s,dt,{});assert.equal(s.score[0],0);assert.ok(s.ball.vx<0);
});
