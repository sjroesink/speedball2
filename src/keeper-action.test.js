import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep } from "./game.js";
import { keeperAction } from "./keeper-action.js";
const u = 22.4 / 576;
function setup() {
  const s = initial();
  s.logicalView = [160, 960];
  Object.assign(s.players[0], { x: -464 * u, z: 0 });
  Object.assign(s.ball, { x: -400 * u, z: 0, vx: 0, vz: 0, owner: -1 });
  return s;
}
test("keeper action uses inclusive eight-sustain reach and strict aggression", () => {
  const s = setup();
  assert.equal(keeperAction(s, 0, 64, 255).attack, true);
  assert.equal(keeperAction(s, 0, 65, 255), null);
  const chase = keeperAction(s, 0, 65, 49);
  assert.equal(chase.attack, false);
  assert.equal(chase.tx, -400 * u);
  assert.equal(keeperAction(s, 0, 65, 50), null);
  s.players[0].stats[3] = 250;
  assert.equal(keeperAction(s, 0, 96, 255).attack, true);
  assert.equal(keeperAction(s, 0, 97, 255), null);
  s.ball.owner = 1;
  assert.equal(keeperAction(s, 0, 0, 0), null);
});
test("selected keeper starts an action at original reach in the simulation", () => {
  const s = setup();
  for (const p of s.players) p.stun = 100;
  s.players[0].stun = 0;
  s.ball.h = 0.75;
  step(s, simulationStep, {}, [false, false]);
  assert.equal(s.controlled[0], 0);
  assert.equal(s.players[0].action, 1);
});
