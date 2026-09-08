import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep, pitchLengthLimit } from "./game.js";
import { velocityUnit } from "./attributes.js";
const u = 22.4 / 576;
function setup(x, z, vx, vz) {
  const s = initial();
  s.players.forEach((p) => (p.stun = 100));
  Object.assign(s.ball, {
    x,
    z,
    vx,
    vz,
    h: 0.75,
    owner: -1,
    lastTouch: 7,
    speedTimer: 100,
  });
  return s;
}
test("original goal includes both post boundaries and excludes the adjacent terrain unit", () => {
  for (const side of [-1, 1])
    for (const width of [-49, -48, 48, 49]) {
      const s = setup(side * 545 * u, width * u, side * 8 * velocityUnit, 0);
      step(s, simulationStep, {}, [true, true]);
      assert.equal(s.score[side > 0 ? 0 : 1], Math.abs(width) === 48 ? 10 : 0);
    }
});
test("goal needs outward movement beyond the original back line", () => {
  for (const velocity of [-8, 0]) {
    const s = setup(545 * u, 0, velocity * velocityUnit, 0);
    step(s, simulationStep, {}, [true, true]);
    assert.deepEqual(s.score, [0, 0]);
  }
  const s = setup(pitchLengthLimit, 0, 8 * velocityUnit, 0);
  step(s, simulationStep, {}, [true, true]);
  assert.equal(s.score[0], 0);
  step(s, simulationStep, {}, [true, true]);
  assert.equal(s.score[0], 10);
});
test("wall clips overshoot before reverse movement", () => {
  const s = setup(0, 12.5, 0, 8 * velocityUnit);
  step(s, simulationStep, {}, [true, true]);
  assert.ok(
    Math.abs(s.ball.z - (11.2 - 8 * velocityUnit * simulationStep)) < 1e-9,
  );
  const q = setup(23, 3, 8 * velocityUnit, 0);
  step(q, simulationStep, {}, [true, true]);
  assert.ok(
    Math.abs(
      q.ball.x - (pitchLengthLimit - 8 * velocityUnit * simulationStep),
    ) < 1e-9,
  );
});
