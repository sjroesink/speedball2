import { test } from "node:test";
import assert from "node:assert/strict";
import {
  setBallSpeed,
  slowBall,
  slowBallFrame,
  reflectBall,
  warpBall,
  startFlight,
  flightStep,
} from "./ball.js";
import { velocityUnit } from "./attributes.js";
import { initial, throwBall, step } from "./game.js";
const ball = () => ({
  owner: -1,
  x: 0,
  h: 0.25,
  vx: 8 * velocityUnit,
  vz: -8 * velocityUnit,
});
test("throw 100 decelerates on the original threshold frames on both axes", () => {
  const b = ball();
  setBallSpeed(b, 100);
  const changes = [];
  for (let frame = 1; frame <= 50; frame++) {
    const before = b.vx;
    slowBallFrame(b);
    if (b.vx !== before) changes.push(frame);
    assert.ok(Math.abs(b.vx + b.vz) < 1e-9);
  }
  assert.deepEqual(changes, [9, 21, 30, 36, 40, 43, 46, 48]);
  assert.equal(b.vx, 0);
  assert.equal(b.vz, 0);
});
test("throw attribute changes sustain, never launch speed or lob horizontal speed", () => {
  for (const lob of [false, true])
    for (const attribute of [100, 250]) {
      const s = initial();
      s.players[7].stats[4] = attribute;
      throwBall(s, 7, lob);
      assert.equal(s.ball.vx, 8 * velocityUnit);
      assert.equal(s.ball.speedTimer, attribute === 100 ? 50 : 125);
      assert.equal(s.ball.nextSlowdown, attribute === 100 ? 43 : 108);
    }
  const b = ball();
  setBallSpeed(b, 250);
  for (let n = 0; n < 18; n++) slowBallFrame(b);
  assert.equal(b.vx, 8 * velocityUnit);
  slowBallFrame(b);
  assert.ok(Math.abs(b.vx - 7 * velocityUnit) < 1e-9);
});
test("25 Hz slowdown is independent of host tick size", () => {
  const a = ball(),
    b = ball();
  setBallSpeed(a, 100);
  setBallSpeed(b, 100);
  for (let n = 0; n < 48; n++) slowBall(a, 1 / 60);
  for (let n = 0; n < 20; n++) slowBall(b, 1 / 25);
  assert.equal(a.vx, b.vx);
  assert.equal(a.speedTimer, b.speedTimer);
});
test("airborne ball retains its last velocity unit, with original end-zone and owner guards", () => {
  const b = ball();
  Object.assign(b, { vx: velocityUnit, vz: 0, h: 1 });
  slowBallFrame(b);
  assert.equal(b.vx, velocityUnit);
  b.h = 0.25;
  slowBallFrame(b);
  assert.equal(b.vx, 0);
  Object.assign(b, { vx: 8 * velocityUnit, x: 21 });
  setBallSpeed(b, 100);
  slowBallFrame(b);
  assert.equal(b.speedTimer, 50);
  b.x = 0;
  b.owner = 7;
  slowBallFrame(b);
  assert.equal(b.speedTimer, 50);
});

test("wall reflection preserves speed and only the end wall halves the sustain timer", () => {
  const b = {
    vx: 12,
    vz: -7,
    dirX: 1,
    dirZ: -1,
    speedTimer: 43,
    nextSlowdown: 31,
  };
  reflectBall(b, "z");
  assert.equal(b.vz, 7);
  assert.equal(b.dirZ, 1);
  assert.equal(b.speedTimer, 43);
  reflectBall(b, "x");
  assert.equal(b.vx, -12);
  assert.equal(b.dirX, -1);
  assert.equal(b.speedTimer, 22);
  assert.equal(b.nextSlowdown, 31);
});
test("warp resets launch speed and sustain at the opposite wall, preserving axial drift", () => {
  for (const side of [-1, 1]) {
    const b = {
      z: side * 11.4,
      vx: 2,
      vz: side * 3,
      dirX: 1,
      dirZ: side,
      h: 1,
    };
    warpBall(b, 250);
    assert.equal(b.z, -side * 11.2);
    assert.equal(b.vx, 8 * velocityUnit);
    assert.equal(b.vz, side * 8 * velocityUnit);
    assert.equal(b.speedTimer, 125);
    assert.equal(b.nextSlowdown, 108);
    assert.equal(b.h, 1);
  }
  const b = { z: 11.3, vx: 2, vz: 0.8, dirX: -1, dirZ: 0, h: 1 };
  warpBall(b, 100);
  assert.equal(b.vx, -8 * velocityUnit);
  assert.equal(b.vz, 0.8);
});

test("release steering adds four units only on an unused axis for high and low throws", () => {
  for (const lob of [false, true])
    for (const sign of [-1, 1]) {
      const s = initial();
      s.players[7].fx = sign;
      s.players[7].fz = 0;
      throwBall(s, 7, lob, { z: -sign });
      assert.equal(s.ball.vx, sign * 8 * velocityUnit);
      assert.equal(s.ball.vz, -sign * 4 * velocityUnit);
      assert.equal(
        s.ball.dirZ,
        0,
        "nominal direction is unchanged for warp drift handling",
      );
      s.players[7].fx = 0;
      s.players[7].fz = sign;
      throwBall(s, 7, lob, { x: -sign });
      assert.equal(s.ball.vx, -sign * 4 * velocityUnit);
      assert.equal(s.ball.vz, sign * 8 * velocityUnit);
      s.players[7].fx = sign;
      s.players[7].fz = sign;
      throwBall(s, 7, lob, { x: -sign, z: -sign });
      assert.equal(s.ball.vx, sign * 8 * velocityUnit);
      assert.equal(s.ball.vz, sign * 8 * velocityUnit);
    }
});
test("steering is sampled at wind-up release and does not continue during flight", () => {
  const s = initial();
  s.players.forEach((p) => (p.stun = 10));
  Object.assign(s.players[7], { x: 4, z: 0, stun: 0, fx: 1, fz: 0 });
  s.ball.owner = 7;
  step(s, 1 / 60, { x: 1, shoot: true }, [true, true]);
  for (let n = 1; n < 10; n++) step(s, 1 / 60, { z: 1 }, [true, true]);
  assert.equal(s.ball.owner, -1);
  assert.equal(s.ball.vz, 4 * velocityUnit);
  const vx = s.ball.vx,
    vz = s.ball.vz;
  step(s, 1 / 60, { x: -1, z: -1 }, [true, true]);
  assert.equal(s.ball.vx, vx);
  assert.equal(s.ball.vz, vz);
});

test("reference lob changes stage at the exact original frame boundaries", () => {
  const b = {};
  startFlight(b, true);
  const transitions = [];
  let previous = -1;
  for (let frame = 1; frame <= 60; frame++) {
    flightStep(b, 1 / 25);
    if (b.flightStage !== previous) transitions.push([frame, b.flightStage]);
    previous = b.flightStage;
  }
  assert.deepEqual(transitions, [
    [1, 1],
    [3, 2],
    [6, 3],
    [10, 4],
    [15, 5],
    [21, 6],
    [28, 5],
    [34, 4],
    [39, 3],
    [43, 2],
    [46, 1],
    [48, 0],
  ]);
  assert.equal(b.h, 0.25);
  assert.equal(b.vh, 0);
});
test("low flight lands on frame 17 and flight timing agrees at 25 and 60 Hz", () => {
  const a = {},
    b = {};
  startFlight(a, false);
  startFlight(b, false);
  for (let i = 0; i < 16; i++) flightStep(a, 1 / 25);
  assert.equal(a.flightStage, 1);
  flightStep(a, 1 / 25);
  assert.equal(a.flightStage, 0);
  startFlight(a, true);
  startFlight(b, true);
  for (let i = 0; i < 60; i++) flightStep(a, 1 / 60);
  for (let i = 0; i < 25; i++) flightStep(b, 1 / 25);
  assert.equal(a.flightStage, 6);
  assert.equal(a.flightIndex, b.flightIndex);
});

test("peak lob clears standing players but jumping players can catch it", () => {
  for (const jumping of [false, true]) {
    const s = initial();
    s.players.forEach((p) => (p.stun = 10));
    Object.assign(s.players[16], {
      x: 4,
      z: 0,
      stun: 0,
      action: jumping ? 2 : 0,
      actionTime: jumping ? 0.4 : 0,
      cooldown: 10,
    });
    Object.assign(s.ball, { owner: -1, x: 4, z: 0, vx: 0, vz: 0, lock: 0 });
    startFlight(s.ball, true);
    flightStep(s.ball, 21 / 25);
    step(s, 1 / 60, {}, [true, true]);
    assert.equal(s.ball.owner, jumping ? 16 : -1);
    if (jumping) assert.equal(s.event.kind, 16);
  }
});
test("height stage three cannot score even though it is below the old geometric goal threshold", () => {
  const s = initial();
  s.players.forEach((p) => (p.stun = 10));
  Object.assign(s.ball, {
    owner: -1,
    x: 21.1,
    z: 0,
    vx: 8 * velocityUnit,
    vz: 0,
  });
  startFlight(s.ball, true);
  flightStep(s.ball, 6 / 25);
  // Contact is evaluated on the tick after crossing the boundary.
  step(s, 1 / 60, {}, [true, true]);
  step(s, 1 / 60, {}, [true, true]);
  assert.deepEqual(s.score, [0, 0]);
  assert.ok(s.ball.vx < 0);
});
