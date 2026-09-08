import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, step } from "./game.js";
import { enterMultiplier, runMultiplier } from "./multiplier.js";
import { velocityUnit } from "./attributes.js";
import { readFileSync } from "node:fs";
import { multiplierPaths } from "./multiplier-paths.js";
const unit = 22.4 / 576;
function setup(left = true, up = true) {
  const s = initial();
  s.players.forEach((p) => (p.stun = 100));
  Object.assign(s.ball, {
    owner: -1,
    lastTouch: 7,
    x: (left ? -32 : 32) * unit,
    z: (left ? -265 : 265) * unit,
    h: 0.75,
    dirX: up ? 1 : -1,
    dirZ: 0,
    vx: (up ? 1 : -1) * 8 * velocityUnit,
    vz: 0,
  });
  return s;
}
test("all four multiplier routes award on step 22 and exit after 49 positions", () => {
  for (const left of [true, false])
    for (const up of [true, false]) {
      const s = setup(left, up),
        b = s.ball;
      assert.equal(enterMultiplier(b), true);
      assert.equal(b.multiplierPath, left ? (up ? 1 : 2) : up ? 4 : 3);
      runMultiplier(s, 0);
      runMultiplier(s, 20 / 25);
      assert.equal(s.multiplier, 0);
      runMultiplier(s, 1 / 25);
      assert.equal(s.multiplier, 1);
      assert.equal(s.event.kind, 9);
      const checkpoint = [
        [14, 24],
        [10, 36],
        [-14, 40],
        [-10, 28],
      ][b.multiplierPath - 1];
      assert.equal(b.x, (576 - (left ? 576 : 512) - checkpoint[1]) * unit);
      assert.equal(b.z, ((left ? 0 : 640) + checkpoint[0] - 320) * unit);
      runMultiplier(s, 27 / 25);
      assert.equal(b.multiplierIndex, 49);
      assert.ok(b.multiplierPath);
      runMultiplier(s, 1 / 25);
      assert.equal(b.multiplierPath, 0);
      assert.equal(b.vx, (up ? 1 : -1) * 8 * velocityUnit);
      assert.equal(b.speedTimer, 50);
    }
});

test("Blender groove data matches every simulation motion point", () => {
  const assetPaths = JSON.parse(
    readFileSync(
      new URL("../assets/multiplier-paths.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(multiplierPaths, assetPaths);
});
test("entry rejects high, diagonal, carried and out-of-band balls", () => {
  for (const change of [
    { h: 2 },
    { dirZ: 1 },
    { owner: 7 },
    { x: 3 },
    { z: 0 },
  ]) {
    const s = setup();
    Object.assign(s.ball, change);
    assert.equal(enterMultiplier(s.ball), false);
  }
  const s = setup();
  Object.assign(s.ball, { dirZ: 0, vz: 4 * velocityUnit });
  assert.equal(
    enterMultiplier(s.ball),
    true,
    "release drift does not alter nominal entry direction",
  );
});
test("multiplier travel is independent of host rate and suppresses normal ball physics", () => {
  const a = setup(),
    b = setup();
  step(a, 1 / 25);
  step(b, 1 / 60);
  for (let i = 0; i < 24; i++) step(a, 1 / 25);
  for (let i = 0; i < 58; i++) step(b, 1 / 60);
  assert.equal(a.ball.multiplierIndex, b.ball.multiplierIndex);
  assert.equal(a.ball.x, b.ball.x);
  assert.equal(a.ball.z, b.ball.z);
  assert.equal(a.ball.owner, -1);
  assert.equal(a.multiplier, 1);
});
test("opponent trips remove one level before building their own multiplier", () => {
  const s = setup();
  s.multiplier = 2;
  s.ball.lastTouch = 16;
  for (const expected of [1, 0, -1, -2, -2]) {
    const fresh = setup();
    s.ball = fresh.ball;
    s.ball.lastTouch = 16;
    enterMultiplier(s.ball);
    runMultiplier(s, 21 / 25);
    assert.equal(s.multiplier, expected);
  }
});

test("exiting a loop resumes travel without recapturing the ball on its edge", () => {
  const s = setup();
  for (let i = 0; i < 125; i++) step(s, 1 / 60);
  assert.equal(s.ball.multiplierPath, 0);
  assert.equal(s.multiplier, 1);
  assert.ok(s.ball.x > 0);
});

test("diagonal entry bounces off the side using the original two-velocity test", () => {
  const s = setup();
  Object.assign(s.ball, {
    z: (60 - 320) * unit,
    dirZ: -1,
    vz: -8 * velocityUnit,
  });
  assert.equal(enterMultiplier(s.ball), false);
  assert.equal(s.ball.vz, 8 * velocityUnit);
  assert.equal(s.ball.dirZ, 1);
  assert.equal(s.multiplier, 0);
});
