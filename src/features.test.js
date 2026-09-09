import { spawnPickup } from "./pickup-spawn.js";
import { movementSpeed, velocityUnit } from "./attributes.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchClock, initial, step, resetPitch, throwBall } from "./game.js";
import {
  pickup,
  active,
  damage,
  featureStep,
  sideFeature,
  goalBlocked,
} from "./features.js";
const dt = 1 / 60;
function isolated() {
  const s = initial();
  s.logicalView = [160, 380];
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
    [3, 16, 1, 1],
    [4, 7, 1, 1.4],
    [5, 16, 1, 1.4],
    [6, 16, 1, 1],
  ]) {
    const s = isolated();
    pickup(s, owner, k);
    const before = s.players[7].x;
    step(s, dt, { x: 1 });
    assert.ok(
      Math.abs(s.players[7].x - before - sign * 5 * velocityUnit * dt * ratio) <
        1e-8,
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
  matchClock(s, 6);
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
    // Contact is evaluated on the tick after crossing the boundary.
    step(s, dt, {});
    step(s, dt, {});
    assert.equal(s.score[1], 0);
    assert.ok(s.ball.vx * Math.sign(x) < 0);
    assert.ok(!goalBlocked(s, -x, period === 1 ? 1 : -1));
  }
});
test("four warp entrances preserve height and travel direction; high ball rebounds normally", () => {
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
      // Contact is evaluated on the tick after crossing the boundary.
      step(s, dt, {});
      step(s, dt, {});
      assert.ok(s.ball.z * sign < -10);
      assert.equal(Math.sign(s.ball.vz), sign);
      assert.equal(s.event.kind, 12);
    }
  const s = isolated();
  Object.assign(s.ball, { x: 8, z: 11.1, h: 3, vz: 24, owner: -1 });
  // Contact is evaluated on the tick after crossing the boundary.
  step(s, dt, {});
  step(s, dt, {});
  assert.ok(s.ball.vz < 0);
  assert.ok(s.ball.z > 0);
});
test("electro-bounce gains multiplier charges and knocks an enemy down instead of catching", () => {
  const s = isolated();
  s.multiplier = 2;
  Object.assign(s.ball, {
    x: (304 * 22.4) / 576,
    z: 11.3,
    h: 1,
    lastTouch: 7,
    electricBudget: 3,
  });
  assert.equal(sideFeature(s), true);
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
  assert.equal(s.ball.electricBudget, 2);
  assert.ok(s.players[16].stun > 0);
  s.players[16].stun = 0;
  pickup(s, 16, 10);
  Object.assign(s.ball, { x: s.players[16].x, z: s.players[16].z });
  step(s, dt, {}, [true, true]);
  assert.equal(s.ball.owner, 16);
  // The original returns before clearing charge when the caught ball is stationary.
  assert.equal(s.ball.electric, 2);
  assert.equal(s.ball.charged, true);
});
test("fatal falls finish before medical scoring, clock pause and reserve rotation", () => {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  for (const item of s.pickups) item.wait = 100;
  for (const points of [10, 20]) {
    Object.assign(s.players[16], { health: 1, stun: 0 });
    damage(s, 7, 16);
    assert.equal(s.score[0], points - 10);
    assert.equal(s.players[16].injury, 0);
    for (let frame = 0; frame < 34; frame++)
      step(s, 1 / 25, {}, [false, false]);
    assert.equal(s.players[16].injury, 0);
    step(s, 1 / 25, {}, [false, false]);
    assert.equal(s.players[16].injury, 1);
    assert.equal(s.score[0], points);
    const time = s.time;
    for (let frame = 0; s.medical && frame < 1000; frame++)
      step(s, 1 / 25, {}, [false, false]);
    assert.equal(s.time, time);
    assert.equal(s.players[16].health, 100);
    assert.equal(s.reserves[1], 3);
  }
});
test("pickups are collected once, respawn, randomize powers and expose equipment", () => {
  const s = isolated(),
    p = s.pickups[0];
  Object.assign(p, { x: 4, z: 0, wait: 0, kind: 13 });
  featureStep(s, dt);
  assert.equal(s.credits[0], 10);
  featureStep(s, dt);
  assert.equal(s.credits[0], 10);
  assert.ok(p.wait > 0);
  const kinds = new Set();
  for (let n = 0; n < 256; n++) {
    spawnPickup(s, 0);
    kinds.add(s.pickups[0].kind);
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
  assert.equal(movementSpeed(s.players[7], false), 7 * velocityUnit);
  pickup(s, 7, 18);
  throwBall(s, 7, false);
  assert.equal(s.ball.vx, 8 * velocityUnit);
  assert.equal(s.ball.speedTimer, 125);
  damage(s, 16, 7);
  assert.equal(s.players[7].gear, 0);
});

test("transport uses roster slot eight in either half, with no fallback for a fallen target", () => {
  for (const team of [0, 1])
    for (const period of [1, 2]) {
      const s = initial();
      s.period = period;
      const target = team * 9 + 8;
      s.players[target].x = 0;
      s.players[team * 9 + 7].x = 20;
      pickup(s, team * 9 + 7, 8);
      assert.equal(s.ball.owner, target);
      s.ball.owner = 1;
      s.players[target].stun = 1;
      pickup(s, team * 9 + 7, 8);
      assert.equal(s.ball.owner, 1);
    }
});

test("floor items require the selected grounded player and use team-order priority", () => {
  for (const kind of [1, 13, 17]) {
    const s = initial();
    s.players.forEach((p) => {
      p.x = 10;
      p.z = 10;
    });
    const item = s.pickups[0];
    Object.assign(item, { kind, x: 0, z: 0, wait: 0, life: 14 });
    Object.assign(s.players[6], { x: 0, z: 0 });
    featureStep(s, dt);
    assert.equal(item.wait, 0, "unselected player cannot collect");
    Object.assign(s.players[7], { x: 0, z: 0, action: 2 });
    featureStep(s, dt);
    assert.equal(item.wait, 0, "jump cannot collect");
    s.players[7].action = 0;
    Object.assign(s.players[16], { x: 0, z: 0 });
    featureStep(s, dt);
    assert.ok(item.wait > 0);
    if (kind === 1) assert.equal(s.effect.team, 0);
    if (kind === 13) assert.deepEqual(s.credits, [10, 0]);
    if (kind === 17) assert.equal(s.players[7].gear, 17);
  }
});
