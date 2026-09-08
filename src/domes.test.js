import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, domeBounce } from "./game.js";
import { velocityUnit } from "./attributes.js";
const unit = 22.4 / 576;
test("both original bumper centers relaunch in eight directions with strict half-axis boundaries", () => {
  for (const center of [-256, 256])
    for (const [dx, dz, fx, fz] of [
      [12, 0, 1, 0],
      [-12, 0, -1, 0],
      [0, 12, 0, 1],
      [0, -12, 0, -1],
      [10, 10, 1, 1],
      [-10, 10, -1, 1],
      [10, -10, 1, -1],
      [-10, -10, -1, -1],
      [12, 6, 1, 0],
      [12, 7, 1, 1],
      [6, 12, 0, 1],
      [7, 12, 1, 1],
    ]) {
      const s = initial();
      Object.assign(s.ball, {
        owner: -1,
        lastTouch: 7,
        x: (center + dx) * unit,
        z: dz * unit,
        h: 0.25,
        vx: 1,
        vz: 2,
      });
      s.players[7].stats[4] = 200;
      domeBounce(s);
      assert.equal(s.ball.vx, fx * 8 * velocityUnit);
      assert.equal(s.ball.vz, fz * 8 * velocityUnit);
      assert.equal(s.ball.dirX, fx);
      assert.equal(s.ball.dirZ, fz);
      assert.equal(s.ball.speedTimer, 100);
      assert.equal(s.score[0], 2);
      assert.equal(
        s.ball.x,
        (center + dx) * unit,
        "contact does not push ball outside the bumper",
      );
    }
});
test("bumper excludes held/high balls, exact center and points outside original radius", () => {
  for (const change of [
    { owner: 7 },
    { h: 2 },
    { flightKind: 2, flightStage: 3 },
    { x: 256 * unit },
    { x: 272 * unit, z: 16 * unit },
    { x: 273 * unit },
  ]) {
    const s = initial();
    Object.assign(
      s.ball,
      { owner: -1, lastTouch: 7, x: 268 * unit, z: 0, h: 0.25, vx: -1 },
      change,
    );
    domeBounce(s);
    assert.equal(s.score[0], 0);
  }
  const s = initial();
  Object.assign(s.ball, {
    owner: -1,
    lastTouch: 7,
    x: 272 * unit,
    z: 0,
    h: 1.25,
    flightKind: 2,
    flightStage: 2,
  });
  s.multiplier = 2;
  domeBounce(s);
  assert.equal(s.score[0], 4);
  assert.equal(s.ball.flightIndex, -1);
  assert.equal(s.ball.flightStage, 1);
});
