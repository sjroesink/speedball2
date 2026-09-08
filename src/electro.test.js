import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, throwBall } from "./game.js";
import { sideFeature } from "./features.js";
import { velocityUnit } from "./attributes.js";
const unit = 22.4 / 576;
test("electro-bounces use original rectangles and relaunch away from each emitter", () => {
  for (const [cx, cy] of [
    [20, 880],
    [620, 272],
  ])
    for (const dy of [-15, 0, 15]) {
      const s = initial();
      s.multiplier = 2;
      throwBall(s, 7, false);
      const dz = cx === 20 ? 15 : -15;
      Object.assign(s.ball, {
        x: (576 - cy - dy) * unit,
        z: (cx + dz - 320) * unit,
        vx: 2,
        vz: 1,
      });
      assert.equal(sideFeature(s), true);
      assert.equal(s.ball.z, cx === 20 ? -11.2 : 11.2);
      assert.equal(s.ball.vx, -Math.sign(dy) * 8 * velocityUnit || 0);
      assert.equal(s.ball.vz, Math.sign(dz) * 8 * velocityUnit);
      assert.equal(s.ball.electric, 3);
      assert.equal(s.ball.speedTimer, 50);
      assert.equal(s.event.kind, 13);
    }
});
test("remaining electric hits are fixed at throw time and are not replenished by another bounce", () => {
  const s = initial();
  s.multiplier = 1;
  throwBall(s, 7, false);
  s.multiplier = 2;
  Object.assign(s.ball, { x: 304 * unit, z: 11.3 });
  sideFeature(s);
  assert.equal(s.ball.electric, 2);
  s.ball.electricBudget = 1;
  Object.assign(s.ball, { x: 304 * unit, z: 11.3 });
  sideFeature(s);
  assert.equal(s.ball.electric, 1);
  throwBall(s, 7, false);
  assert.equal(s.ball.electricBudget, 3);
  assert.equal(s.ball.electric, 0);
});
test("electro contact rejects high, carried and outside-rectangle balls", () => {
  for (const change of [
    { owner: 7 },
    { flightKind: 2, flightStage: 3 },
    { z: (604 - 320) * unit },
    { x: (576 - 288) * unit },
  ]) {
    const s = initial();
    throwBall(s, 7, false);
    s.players[7].action = 0;
    Object.assign(s.ball, { x: 304 * unit, z: 11.3 }, change);
    assert.equal(sideFeature(s), false);
    assert.equal(s.ball.electric, 0);
  }
});
