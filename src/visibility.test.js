import { test } from "node:test";
import assert from "node:assert/strict";
import { scrollViewport, inViewport } from "./visibility.js";
import { initial, step, simulationStep } from "./game.js";
import { velocityUnit } from "./attributes.js";

test("human control includes the inset edge; AI takes over one unit outside", () => {
  const u = 22.4 / 576;
  for (const distance of [76, 77]) {
    const s = initial();
    for (const p of s.players) p.stun = 100;
    const p = s.players[7];
    Object.assign(p, { x: distance * u, z: 0, stun: 0 });
    Object.assign(s.ball, { x: 0, z: 0, h: 4, owner: -1 });
    step(s, simulationStep, { x: 1 });
    assert.equal(Math.sign(p.x - distance * u), distance === 76 ? 1 : -1);
  }
});

test("offscreen pending human throw still samples release button and steering", () => {
  for (const high of [false, true]) {
    const s = initial();
    for (const p of s.players) p.stun = 100;
    Object.assign(s.players[7], {
      x: 4,
      z: 0,
      fx: 1,
      fz: 0,
      stun: 0,
      action: 3,
      actionTime: 5 / 25,
      throwMode: 1,
    });
    s.ball.owner = 7;
    step(s, simulationStep, { shoot: high, z: 1 });
    assert.equal(s.ball.owner, -1);
    assert.equal(s.ball.flightKind, high ? 2 : 1);
    assert.equal(s.ball.vz, 4 * velocityUnit);
  }
});

test("original scroll has horizontal dead zone, vertical one-unit steps and speed cap", () => {
  assert.deepEqual(scrollViewport([160, 484], 327, 583), [160, 485]);
  assert.deepEqual(scrollViewport([160, 484], 328, 584), [162, 486]);
  assert.deepEqual(scrollViewport([160, 484], 327, 583, true), [161, 485]);
  assert.deepEqual(scrollViewport([160, 484], 640, 1152), [176, 500]);
  assert.deepEqual(scrollViewport([0, 0], 0, 0), [0, 0]);
  assert.deepEqual(scrollViewport([320, 968], 640, 1152), [320, 968]);
});
test("visibility uses inclusive 320 by 184 limits and optional 16-unit inset", () => {
  const v = [160, 484];
  assert.equal(inViewport(v, 160, 484), true);
  assert.equal(inViewport(v, 480, 668), true);
  assert.equal(inViewport(v, 481, 668), false);
  assert.equal(inViewport(v, 480, 669), false);
  assert.equal(inViewport(v, 176, 500, 16), true);
  assert.equal(inViewport(v, 464, 652, 16), true);
  assert.equal(inViewport(v, 175, 500, 16), false);
});
