import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationRate, simulationStep } from "./game.js";
test("runtime cadence advances 25 simulation ticks per match second", () => {
  const s = initial();
  s.players.forEach((p) => (p.stun = 100));
  for (let n = 0; n < simulationRate; n++)
    step(s, simulationStep, {}, [true, true]);
  assert.equal(s.tick, 25);
  assert.equal(s.time, 89);
});
test("released action counter survives sampling at 25 Hz", () => {
  const s = initial();
  s.players.forEach((p) => (p.stun = 100));
  Object.assign(s.players[7], { x: 0, z: 0, stun: 0, fx: 1, fz: 0 });
  Object.assign(s.ball, { owner: 7, x: 0, z: 0, h: 1 });
  for (let n = 0; n < 4; n++)
    step(s, simulationStep, { fire: 1, shoot: false }, [true, true]);
  assert.equal(s.ball.owner, -1);
  assert.equal(s.ball.flightKind, 1);
  assert.equal(s.ball.lastTouch, 7);
  assert.equal(s.events.filter((e) => e.kind === 3).length, 1);
  step(s, simulationStep, { fire: 1, shoot: false }, [true, true]);
  assert.equal(s.events.filter((e) => e.kind === 3).length, 1);
});
