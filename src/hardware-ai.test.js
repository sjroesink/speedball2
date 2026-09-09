import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep } from "./game.js";
import { hardwareThrow } from "./hardware-ai.js";
const u = 22.4 / 576;
function fixture(x, y) {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  Object.assign(s.players[1], {
    x: (576 - y) * u,
    z: (x - 320) * u,
    stun: 0,
    aiWait: 0,
  });
  Object.assign(s.ball, { x: s.players[1].x, z: s.players[1].z, owner: 1 });
  return s;
}
const distances = Array(18).fill(1000);
test("hardware priority: multiplier low throw, maximum multiplier and blocked/electric lane", () => {
  const s = fixture(56, 700);
  assert.equal(hardwareThrow(s, 1, 255, distances).high, false);
  s.multiplier = 2;
  assert.equal(hardwareThrow(s, 1, 255, distances), null);
  s.multiplier = 0;
  Object.assign(s.players[16], {
    x: (576 - 650) * u,
    z: (56 - 320) * u,
    stun: 0,
  });
  assert.equal(hardwareThrow(s, 1, 255, distances), null);
  s.ball.charged = true;
  assert.equal(hardwareThrow(s, 1, 255, distances).key, 3);
});
test("high wall throws require an attacking diagonal and mirror after halftime", () => {
  const s = fixture(160, 600);
  let p = hardwareThrow(s, 1, 255, distances);
  assert.equal(p.high, true);
  assert.equal(p.key, 2);
  assert.equal(p.x, (576 - 464) * u);
  assert.equal(p.z, (32 - 320) * u);
  s.period = 2;
  assert.equal(hardwareThrow(s, 1, 255, distances), null);
  Object.assign(s.players[1], { x: (576 - 552) * u, z: (480 - 320) * u });
  p = hardwareThrow(s, 1, 255, distances);
  assert.equal(p.high, true);
  assert.equal(p.key, -2);
});
test("zapper targeting uses inclusive rectangle, strict aggression and skips electroballs", () => {
  const s = fixture(100, 900);
  let p = hardwareThrow(s, 1, 49, distances);
  assert.equal(p.high, false);
  assert.equal(p.key, -1);
  assert.equal(hardwareThrow(s, 1, 50, distances), null);
  s.ball.charged = true;
  assert.equal(hardwareThrow(s, 1, 49, distances), null);
  s.ball.charged = false;
  Object.assign(s.players[1], { x: (576 - 986) * u, z: (126 - 320) * u });
  assert.equal(hardwareThrow(s, 1, 49, distances).high, false);
  s.players[1].z = (127 - 320) * u;
  assert.equal(hardwareThrow(s, 1, 49, distances), null);
});
test("carrier starts hardware throw without legacy danger or goal-distance trigger", () => {
  const s = fixture(56, 700);
  step(s, simulationStep, {}, [false, false]);
  assert.equal(s.players[1].throwMode, 2);
  assert.equal(s.players[1].fx, 1);
  assert.equal(s.players[1].fz, 0);
});
