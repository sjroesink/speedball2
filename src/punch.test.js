import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep } from "./game.js";
import { velocityUnit } from "./attributes.js";
function setup() {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  Object.assign(s.players[7], { x: 4, z: 0, stun: 0, fx: 1, fz: 0 });
  Object.assign(s.ball, { owner: -1, x: 10, z: 10 });
  return s;
}
test("stationary action punches for four frames without moving", () => {
  const s = setup(),
    p = s.players[7];
  step(s, simulationStep, { tackle: true }, [true, true]);
  assert.equal(p.action, 7);
  assert.equal(p.actionTime, 4 / 25);
  assert.equal(p.x, 4);
  for (let n = 1; n < 4; n++) {
    step(s, simulationStep, { tackle: true, x: 1 }, [true, true]);
    assert.equal(p.action, 7);
    assert.equal(p.x, 4);
  }
  step(s, simulationStep, { tackle: true, x: 1 }, [true, true]);
  assert.equal(p.action, 0);
  assert.ok(p.x > 4);
  assert.equal(s.events.filter((e) => e.kind === 20).length, 1);
});
test("punch contact starts next tick and uses lower fall velocity than slide", () => {
  const s = setup();
  s.rng = [0, 0];
  Object.assign(s.players[16], { x: 4.6, z: 0, stun: 0, fx: 1, fz: 0 });
  s.ball.owner = 16;
  step(s, simulationStep, { tackle: true }, [true, true]);
  assert.equal(s.ball.owner, 16);
  step(s, simulationStep, {}, [true, true]);
  assert.equal(s.ball.owner, 7);
  assert.ok(s.players[16].stun > 0);
  assert.equal(s.players[16].fallX, 3 * velocityUnit);
});
