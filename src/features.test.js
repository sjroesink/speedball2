import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, step, resetPitch, throwBall } from "./game.js";
import {
  pickup,
  active,
  damage,
  movementFactor,
  featureStep,
  sideFeature,
  goalBlocked,
} from "./features.js";
const dt = 1 / 60;
function isolated() {
  const s = initial();
  s.players.forEach((p) => (p.stun = 100));
  Object.assign(s.players[7], { x: 4, z: 0, stun: 0, fx: 1, fz: 0 });
  s.ball.x = 4;
  s.ball.z = 0;
  s.ball.h = 4;
  return s;
}
test("all twelve powers apply their advertised effect", () => {
  for (let k = 1; k <= 12; k++) {
    const s = initial();
    s.ball.owner = 16;
    pickup(s, 7, k);
    if ([1, 2, 3, 4, 5, 6, 9, 10].includes(k)) {
      assert.equal(s.effect.kind, k);
      assert.equal(s.effect.time, 6);
      assert.equal(s.effect.team, 0);
    }
    if (k === 7) assert.equal(s.ball.owner, 7);
    if (k === 8) assert.equal(s.players[s.ball.owner].team, 0);
    if (k === 11) assert.equal(s.players[7].health, 100);
    if (k === 12) {
      assert.ok(s.players[16].stun > 0);
      assert.equal(s.ball.owner, -1);
    }
  }
});
test("freeze, reversed input, slow, boost, weaken and manic affect actual movement", () => {
  for (const [k, owner, sign, ratio] of [
    [1, 16, 0, 0],
    [2, 16, -1, 1],
    [3, 16, 1, 0.7],
    [4, 7, 1, 1.3],
    [5, 16, 1, 1.3],
    [6, 16, 1, 0.5],
  ]) {
    const s = isolated();
    pickup(s, owner, k);
    const before = s.players[7].x;
    step(s, dt, { x: 1 });
    assert.ok(
      Math.abs(s.players[7].x - before - sign * 6.8 * dt * ratio) < 1e-8,
      `power ${k}`,
    );
  }
});
test("temporary power expires, replacement removes old effect, goal reset keeps damage", () => {
  const s = initial();
  pickup(s, 7, 1);
  pickup(s, 16, 10);
  assert.ok(!active(s, 1));
  assert.ok(active(s, 10, 1));
  featureStep(s, 6.1);
  assert.equal(s.effect.kind, 0);
  s.players[7].health = 45;
  s.tick = 1;
  resetPitch(s);
  assert.equal(s.players[7].health, 45);
});
test("shield prevents tackle and zap damage; heal restores current player", () => {
  const s = initial();
  pickup(s, 16, 10);
  assert.equal(damage(s, 7, 16), false);
  pickup(s, 7, 12);
  assert.equal(s.players[16].health, 100);
  s.effect.time = 0;
  damage(s, 7, 16);
  assert.ok(s.players[16].health < 100);
  pickup(s, 16, 11);
  assert.equal(s.players[16].health, 100);
});
test("goal door blocks the correct goal before and after halftime", () => {
  for (const period of [1, 2]) {
    const s = isolated();
    s.period = period;
    pickup(s, 7, 9);
    const x = period === 1 ? -20.9 : 20.9;
    Object.assign(s.ball, { x, z: 0, h: 1, vx: Math.sign(x) * 24, owner: -1 });
    step(s, dt, {});
    assert.equal(s.score[1], 0);
    assert.ok(s.ball.vx * Math.sign(x) < 0);
    assert.ok(!goalBlocked(s, -x, period === 1 ? 1 : -1));
  }
});
test("four warp entrances preserve height and velocity; high ball rebounds normally", () => {
  for (const x of [-8, 8])
    for (const sign of [-1, 1]) {
      const s = isolated();
      Object.assign(s.ball, {
        x,
        z: 11.1 * sign,
        h: 1,
        vz: 24 * sign,
        vx: 0,
        owner: -1,
        lastTouch: 7,
      });
      step(s, dt, {});
      assert.ok(s.ball.z * sign < -10);
      assert.equal(Math.sign(s.ball.vz), sign);
      assert.equal(s.event.kind, 12);
    }
  const s = isolated();
  Object.assign(s.ball, { x: 8, z: 11.1, h: 3, vz: 24, owner: -1 });
  step(s, dt, {});
  assert.ok(s.ball.vz < 0);
  assert.ok(s.ball.z > 0);
});
test("electro-bounce gains multiplier charges and knocks an enemy down instead of catching", () => {
  const s = isolated();
  s.multiplier = 2;
  Object.assign(s.ball, { x: 16, z: 11.3, h: 1, lastTouch: 7 });
  assert.equal(sideFeature(s), false);
  assert.equal(s.ball.electric, 3);
  Object.assign(s.players[16], { x: 5, z: 2, stun: 0, health: 100 });
  Object.assign(s.ball, {
    x: 5,
    z: 2,
    vx: 0,
    vz: 0,
    vh: 0,
    owner: -1,
    lock: 0,
  });
  step(s, dt, {}, [true, true]);
  assert.equal(s.ball.owner, -1);
  assert.equal(s.ball.electric, 2);
  assert.ok(s.players[16].stun > 0);
  s.players[16].stun = 0;
  pickup(s, 16, 10);
  Object.assign(s.ball, { x: s.players[16].x, z: s.players[16].z });
  step(s, dt, {}, [true, true]);
  assert.equal(s.ball.owner, 16);
  assert.equal(s.ball.electric, 0);
});
test("injury awards points once, pauses clock, substitutes a reserve, preserves depleted reserves", () => {
  const s = initial();
  s.players[16].health = 1;
  damage(s, 7, 16);
  assert.equal(s.score[0], 10);
  assert.equal(s.players[16].injury, 6);
  const time = s.time;
  for (let i = 0; i < 361; i++) step(s, dt, {});
  assert.equal(s.time, time);
  assert.equal(s.players[16].health, 100);
  assert.equal(s.reserves[1], 2);
  s.reserves[1] = 0;
  s.players[16].health = 1;
  s.players[16].stun = 0;
  damage(s, 7, 16);
  for (let i = 0; i < 361; i++) step(s, dt, {});
  assert.equal(s.players[16].health, 0);
  assert.equal(s.reserves[1], 0);
  assert.equal(s.score[0], 20);
});
test("pickups are collected once, respawn, cycle all powers and expose equipment", () => {
  const s = isolated(),
    p = s.pickups[0];
  Object.assign(p, { x: 4, z: 0, wait: 0, kind: 13 });
  featureStep(s, dt);
  assert.equal(s.credits[0], 10);
  featureStep(s, dt);
  assert.equal(s.credits[0], 10);
  assert.ok(p.wait > 0);
  const kinds = new Set();
  for (let n = 0; n < 12; n++) {
    for (const q of s.pickups.slice(0, 2)) {
      q.wait = 0;
      q.life = 0;
    }
    featureStep(s, dt);
    for (const q of s.pickups.slice(0, 2)) kinds.add(q.kind);
  }
  assert.equal(kinds.size, 12);
  for (let k = 14; k <= 21; k++) {
    pickup(s, 7, k);
    assert.equal(s.players[7].gear, k);
  }
});
test("speed/throw equipment changes performance and equipment is lost on a hit", () => {
  const s = initial();
  pickup(s, 7, 17);
  assert.equal(movementFactor(s, s.players[7]), 1.25);
  pickup(s, 7, 18);
  throwBall(s, 7, false);
  assert.equal(s.ball.vx, 30);
  damage(s, 16, 7);
  assert.equal(s.players[7].gear, 0);
});
