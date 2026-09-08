import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep } from "./game.js";
import { startFlight } from "./ball.js";
import { velocityUnit } from "./attributes.js";
const unit = 22.4 / 576;
function setup(distance, velocity) {
  const s = initial();
  s.players.forEach((p) => (p.stun = 100));
  Object.assign(s.players[7], { x: 0, z: 0, stun: 0, fx: 1, fz: 0 });
  Object.assign(s.ball, {
    x: distance * unit,
    z: 0,
    vx: velocity * velocityUnit,
    vz: 0,
    owner: -1,
    lastTouch: 16,
    speedTimer: 100,
  });
  startFlight(s.ball, false);
  return s;
}
test("a ball entering catch range during movement waits until the next tick", () => {
  const s = setup(17, -8);
  step(s, simulationStep, {}, [true, true]);
  assert.equal(s.ball.owner, -1);
  assert.ok(s.ball.x < 16 * unit);
  step(s, simulationStep, {}, [true, true]);
  assert.equal(s.ball.owner, 7);
});
test("a ball already in range is caught before it can move away", () => {
  const s = setup(15, 8);
  step(s, simulationStep, {}, [true, true]);
  assert.equal(s.ball.owner, 7);
  assert.equal(s.ball.vx, 0);
});
test("simulation uses team-two-first catch order at equal roster index", () => {
  const s = initial();
  s.players.forEach((p) => (p.stun = 100));
  for (const i of [7, 16]) Object.assign(s.players[i], { x: 0, z: 0, stun: 0 });
  Object.assign(s.ball, { x: 0, z: 0, h: 0.75 });
  step(s, simulationStep, {}, [true, true]);
  assert.equal(s.ball.owner, 16);
});
