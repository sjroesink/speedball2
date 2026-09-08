import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { goalieTarget } from "./goalie.js";
const u = 22.4 / 576;
const place = (p, x, y) =>
  Object.assign(p, { x: (576 - y) * u, z: (x - 320) * u });
const target = (s, i = 0) => {
  const [x, z] = goalieTarget(s, i);
  return [Math.round(z / u + 320), Math.round(576 - x / u)];
};
test("keeper covers projected shot angle and recenters distant side attacks", () => {
  const s = initial();
  place(s.ball, 200, 1000);
  assert.deepEqual(target(s), [304, 1104]);
  place(s.ball, 440, 1000);
  assert.deepEqual(target(s), [336, 1104]);
  place(s.ball, 200, 576);
  assert.deepEqual(target(s), [320, 1104]);
  s.period = 2;
  place(s.ball, 200, 152);
  assert.deepEqual(target(s), [304, 48]);
});
test("keeper distinguishes released diagonal shot from a carrier", () => {
  const s = initial();
  place(s.ball, 320, 1080);
  s.ball.dirX = -1;
  s.ball.dirZ = 1;
  assert.deepEqual(target(s), [344, 1104]);
  s.ball.owner = 17;
  place(s.players[17], 320, 1080);
  Object.assign(s.players[17], { fx: -1, fz: 1 });
  assert.deepEqual(target(s), [332, 1104]);
  s.players[17].action = 3;
  assert.deepEqual(target(s), [344, 1104]);
});
test("keeper intelligence changes prediction horizon", () => {
  const s = initial();
  place(s.ball, 300, 1000);
  s.ball.vz = 8 * 25 * u;
  assert.deepEqual(target(s), [308, 1104]);
  s.players[0].stats[7] = 150;
  assert.deepEqual(target(s), [316, 1104]);
  s.players[0].stats[7] = 200;
  assert.deepEqual(target(s), [332, 1104]);
  s.players[0].stats[7] = 250;
  assert.deepEqual(target(s), [332, 1104]);
});
