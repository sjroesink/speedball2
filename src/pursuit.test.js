import { test } from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { pursuit } from "./pursuit.js";
const u = 22.4 / 576;

test("pickup pursuit uses source slot priority, visibility and first-candidate distance", () => {
  const s = initial(),
    d = Array(18).fill(32);
  Object.assign(s.players[7], { x: -32 * u, z: 0 });
  Object.assign(s.ball, { x: 0, z: 0, vx: 0, vz: 0, owner: -1 });
  for (const item of s.pickups) item.wait = 100;
  Object.assign(s.pickups[2], { x: 8 * u, z: 0, wait: 0 });
  Object.assign(s.pickups[6], { x: 24 * u, z: 0, wait: 0 });
  assert.equal(pursuit(s, 7, 255, d, false).tx, 24 * u);
  Object.assign(s.pickups[0], { x: 16 * u, z: 0, wait: 0 });
  assert.equal(pursuit(s, 7, 255, d, false).tx, 16 * u);
  s.pickups[0].x = 64 * u;
  assert.equal(pursuit(s, 7, 255, d, false).tx, 0);
  s.pickups[0].x = 200 * u;
  assert.equal(pursuit(s, 7, 255, d, false).tx, 24 * u);
  s.players[7].x = 200 * u;
  const chase = pursuit(s, 7, 0, d, false);
  assert.equal(chase.tx, 0);
  assert.equal(chase.attack, false);
});

test("selected pursuit chooses opponent or ball using strict aggression and distance", () => {
  const s = initial(),
    d = Array(18).fill(100);
  Object.assign(s.players[7], { x: 0, z: 0 });
  Object.assign(s.players[16], { x: 128 * u, z: 0, moveX: 0, moveZ: 0 });
  Object.assign(s.ball, { x: -128 * u, z: 0, vx: 0, vz: 0, owner: -1 });
  d[16] = 50;
  let a = pursuit(s, 7, 49, d, false);
  assert.equal(a.tx, 128 * u);
  assert.equal(a.attack, true);
  a = pursuit(s, 7, 50, d, false);
  assert.equal(a.tx, -128 * u);
  assert.equal(a.attack, false);
  d[16] = 100;
  assert.equal(pursuit(s, 7, 49, d, false).tx, -128 * u);
  d[16] = 50;
  s.players[16].stun = 1;
  assert.equal(pursuit(s, 7, 49, d, false).tx, -128 * u);
  assert.equal(pursuit(s, 7, 255, d, true).tx, 128 * u);
  s.ball.owner = 16;
  assert.equal(pursuit(s, 7, 255, d, false).tx, 128 * u);
});
