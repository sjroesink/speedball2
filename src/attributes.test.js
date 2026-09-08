import { test } from "node:test";
import assert from "node:assert/strict";
import { matchClock, initial, step, resetPitch } from "./game.js";
import { pickup, damage, featureStep } from "./features.js";
import {
  movementSpeed,
  velocityUnit,
  tackleThreshold,
  hitDamage,
  randomByte,
} from "./attributes.js";

test("Amiga tackle thresholds cover every facing, keeper bonus and jumping", () => {
  const s = initial(),
    p = s.players[7],
    q = s.players[16];
  p.action = 1;
  for (let d = 0; d < 8; d++) {
    q.fx = Math.cos((d * Math.PI) / 4);
    q.fz = Math.sin((d * Math.PI) / 4);
    assert.equal(
      tackleThreshold(p, q, false),
      [152, 148, 144, 140, 136, 140, 144, 148][d],
    );
  }
  q.fx = -1;
  q.fz = 0;
  assert.equal(tackleThreshold(p, q, true), 123);
  q.action = 2;
  assert.equal(tackleThreshold(p, q, true), 139);
});

test("reference RNG matches word-register trace including carries", () => {
  const s = initial();
  for (const expected of [
    2224703967, 3051111946, 980885458, 4032023480, 717936405, 454968731,
    1172912480, 1627913718,
  ]) {
    assert.equal(randomByte(s), expected & 255);
    assert.equal(s.rng[0], expected);
  }
});

test("failed tackle consumes its contact without a retry on later frames", () => {
  const s = initial();
  s.players.forEach((p) => (p.stun = 10));
  Object.assign(s.players[7], { x: 0, z: 0, stun: 0, fx: 1, fz: 0 });
  Object.assign(s.players[16], {
    x: 0.7,
    z: 0,
    stun: 0,
    cooldown: 10,
    fx: -1,
    fz: 0,
  });
  Object.assign(s.ball, { owner: 16, x: 0.7, z: 0, h: 1 });
  step(s, 1 / 60, { tackle: true }, [true, true]); // First reference random byte is 223, threshold 136.
  assert.equal(s.ball.owner, 16);
  assert.equal(s.players[16].health, 100);
  const rng = [...s.rng];
  for (let n = 0; n < 4; n++) {
    Object.assign(s.players[16], {
      x: s.players[7].x + 0.3,
      z: s.players[7].z,
    });
    step(s, 1 / 60, {}, [true, true]);
  }
  assert.deepEqual(s.rng, rng);
  assert.equal(s.players[16].health, 100);
});

test("damage uses power and stamina, deteriorates all attributes, and respects the floor", () => {
  const s = initial(),
    p = s.players[7],
    q = s.players[16];
  assert.equal(hitDamage(p, q), 9);
  p.stats[5] = 250;
  q.stats.fill(200);
  assert.equal(hitDamage(p, q), 12);
  damage(s, 7, 16);
  assert.equal(q.health, 100 - (12 * 100) / 128);
  assert.deepEqual(q.stats, Array(8).fill(194));
  q.stun = 0;
  q.stats.fill(100);
  q.stats[6] = 250;
  p.stats[5] = 100;
  assert.equal(hitDamage(p, q), 1);
  damage(s, 7, 16);
  assert.equal(q.stats[0], 100);
});

test("power and armour attributes restore in reference order after a hit and expiry", () => {
  const s = initial(),
    p = s.players[7];
  p.stats.fill(180);
  pickup(s, 7, 4);
  assert.deepEqual(p.stats, Array(8).fill(250));
  pickup(s, 7, 15);
  damage(s, 16, 7);
  assert.equal(p.gear, 0);
  assert.equal(p.stats[1], 250);
  matchClock(s, 6);
  assert.deepEqual(p.stats, Array(8).fill(180));
  pickup(s, 7, 19);
  assert.equal(p.stats[5], 250);
  s.tick = 1;
  resetPitch(s);
  assert.equal(s.players[7].stats[5], 250);
  pickup(s, 7, 11);
  assert.deepEqual(s.players[7].stats, Array(8).fill(100));
  assert.equal(s.players[7].gear, 0);
});

test("movement uses strict original speed boundaries for running, carrying, sliding and jumping", () => {
  const p = initial().players[7];
  for (const [stat, run, slide, jump] of [
    [100, 4, 5, 4],
    [140, 4, 5, 4],
    [141, 5, 6, 5],
    [170, 5, 6, 5],
    [171, 5, 7, 6],
    [200, 5, 7, 6],
    [201, 6, 8, 7],
    [250, 6, 8, 7],
  ]) {
    p.stats[3] = stat;
    p.action = 0;
    assert.equal(movementSpeed(p, true), run * velocityUnit);
    assert.equal(movementSpeed(p, false), (run + 1) * velocityUnit);
    p.action = 1;
    assert.equal(movementSpeed(p, false), slide * velocityUnit);
    assert.equal(movementSpeed(p, false, true), 8 * velocityUnit);
    p.action = 2;
    assert.equal(movementSpeed(p, false), jump * velocityUnit);
  }
});
test("slow sets a fast player to the baseline speed and expiry restores it", () => {
  const s = initial(),
    p = s.players[7];
  p.stats[3] = 250;
  assert.equal(movementSpeed(p, false), 7 * velocityUnit);
  pickup(s, 16, 6);
  assert.equal(movementSpeed(p, false), 5 * velocityUnit);
  matchClock(s, 6);
  assert.equal(movementSpeed(p, false), 7 * velocityUnit);
});

test("match time and powers share second pulses; medical pauses only match time", () => {
  const s = initial();
  pickup(s, 7, 4);
  matchClock(s, 0.99);
  assert.equal(s.time, 90);
  assert.equal(s.effect.time, 6);
  matchClock(s, 0.01);
  assert.equal(s.time, 89);
  assert.equal(s.effect.time, 5);
  s.players[16].injury = 6;
  matchClock(s, 5);
  assert.equal(s.time, 89);
  assert.equal(s.effect.kind, 0);
  assert.deepEqual(s.players[7].stats, Array(8).fill(100));
  s.players[16].injury = 0;
  s.pause = 2;
  pickup(s, 7, 10);
  matchClock(s, 1);
  assert.equal(s.time, 89);
  assert.equal(s.effect.time, 5);
});
