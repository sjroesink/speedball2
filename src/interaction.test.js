import { test } from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { localInteraction } from "./interaction.js";
function setup() {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  Object.assign(s.players[1], { x: 0, z: 0, stun: 0 });
  Object.assign(s.players[9], { x: 1, z: 0, stun: 0 });
  s.ball.owner = -1;
  return s;
}
test("local aggression comparison is strict and returns avoidance at equality", () => {
  const s = setup(),
    d = Array(18).fill(100);
  d[9] = 30;
  assert.deepEqual(localInteraction(s, 1, d, 99), { attack: true, x: 1, z: 0 });
  const avoid = localInteraction(s, 1, d, 100);
  assert.equal(avoid.attack, false);
  assert.equal(avoid.x, -1);
  d[9] = 31;
  assert.equal(localInteraction(s, 1, d, 0), null);
});
test("first opponent wins; ball carriers and keepers trigger attack", () => {
  const s = setup(),
    d = Array(18).fill(100);
  d[9] = d[10] = 20;
  Object.assign(s.players[10], { x: 1, z: 0, stun: 0 });
  s.ball.owner = 10;
  assert.equal(localInteraction(s, 1, d, 255).attack, false);
  s.players[9].stun = 1;
  assert.equal(localInteraction(s, 1, d, 255).attack, true);
  s.ball.owner = -1;
  Object.assign(s.players[0], { x: 0, z: 0, stun: 0 });
  assert.equal(localInteraction(s, 0, d, 255).attack, true);
  s.ball.owner = 1;
  assert.equal(localInteraction(s, 1, d, 0).attack, false);
});
