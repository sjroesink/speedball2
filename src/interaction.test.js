import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, step } from "./game.js";
import { localInteraction } from "./interaction.js";

test("local AI excludes either offscreen participant but accepts the viewport edge", () => {
  const s = setup(),
    d = Array(18).fill(100),
    u = 22.4 / 576;
  d[9] = 20;
  s.players[1].x = 91 * u;
  s.players[9].x = 93 * u;
  assert.equal(localInteraction(s, 1, d, 0), null);
  s.players[9].x = 92 * u;
  assert.equal(localInteraction(s, 1, d, 0).attack, true);
  s.players[1].x = 93 * u;
  assert.equal(localInteraction(s, 1, d, 0), null);
  s.logicalView = [160, 480];
  assert.equal(localInteraction(s, 1, d, 0).attack, true);
});
function setup() {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  Object.assign(s.players[1], { x: 0, z: 0, stun: 0 });
  Object.assign(s.players[9], { x: 1, z: 0, stun: 0 });
  s.ball.owner = -1;
  return s;
}
test("selected attacks lead the opponent; supporting punches use current position", () => {
  const s = setup(),
    d = Array(18).fill(100);
  d[9] = 20;
  s.players[1].stats[7] = 250;
  s.players[9].moveZ = 8 * (22.4 / 576) * 25;
  s.controlled[0] = 1;
  assert.deepEqual(localInteraction(s, 1, d, 0), { attack: true, x: 1, z: 1 });
  s.controlled[0] = 7;
  assert.deepEqual(localInteraction(s, 1, d, 0), { attack: true, x: 1, z: 0 });
  s.players[9].x = 0;
  assert.equal(localInteraction(s, 1, d, 255).x, 1);
  s.controlled[0] = 1;
  s.players[9].moveZ = 0;
  assert.deepEqual(localInteraction(s, 1, d, 0), { attack: true, x: 0, z: 0 });
});
test("selected AI starts a slide or high-ball jump on nearby contact", () => {
  for (const high of [false, true]) {
    const s = initial();
    for (const p of s.players) p.stun = 100;
    Object.assign(s.players[7], { x: 0, z: 0, stun: 0 });
    s.players[7].stats[0] = 255;
    Object.assign(s.players[16], { x: 0.7, z: 0, stun: 0, aiWait: 100 });
    Object.assign(s.ball, {
      x: 0.7,
      z: 0,
      h: high ? 4 : 1,
      stage: high ? 10 : 1,
      owner: high ? -1 : 16,
    });
    step(s, 1 / 25, {}, [false, false]);
    assert.equal(s.controlled[0], 7);
    assert.equal(s.players[7].action, high ? 2 : 1);
    assert.equal(s.players[7].jumping, high);
  }
});
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
