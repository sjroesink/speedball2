import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { supportTarget, aggressionTarget } from "./support.js";
const unit = 22.4 / 576;
const target = (s, i) => {
  const [x, z] = supportTarget(s, i);
  return [Math.round(z / unit + 320), Math.round(576 - x / unit)];
};
const place = (p, x, y) =>
  Object.assign(p, { x: (576 - y) * unit, z: (x - 320) * unit });

test("support aggression uses strict random and distance thresholds, first tie, and predicted role bounds", () => {
  const s = initial();
  s.logicalView = [0, 484];
  place(s.players[3], 120, 576);
  for (let j = 9; j < 18; j++) place(s.players[j], 600, 1000);
  place(s.players[9], 160, 576);
  place(s.players[10], 180, 576);
  const distances = Array(18).fill(999);
  distances[9] = distances[10] = 100;
  const target = (random = 49) => aggressionTarget(s, 3, distances, random);
  const xy = (j) => [s.players[j].x, s.players[j].z];
  assert.deepEqual(target(), xy(9));
  assert.equal(target(50), null);
  distances[9] = 101;
  assert.deepEqual(target(), xy(10));
  distances[9] = distances[10] = 200;
  assert.equal(target(), null);
  distances[9] = 100;
  s.players[9].stun = 1;
  assert.equal(target(), null);
  s.players[9].stun = 0;
  place(s.players[9], 213, 576);
  assert.deepEqual(target(), xy(9));
  s.players[9].moveZ = unit * 25;
  assert.equal(target(), null, "predicted position leaves the inclusive role boundary");
  s.players[9].moveZ = 0;
  s.logicalView = [320, 484];
  assert.equal(target(), null, "offscreen players retain positional support");
});
test("defender supports goalkeeper when a forward is selected", () => {
  const s = initial();
  s.controlled[0] = 8;
  assert.deepEqual(target(s, 1), [248, 1032]);
  place(s.players[8], 80, 80);
  assert.deepEqual(target(s, 1), [248, 1032]);
});
test("midfielder bends support target back into role zone", () => {
  const s = initial();
  s.controlled[0] = 8;
  place(s.players[8], 320, 200);
  assert.deepEqual(target(s, 3), [136, 384]);
  place(s.players[8], 120, 800);
  assert.deepEqual(target(s, 3), [120, 768]);
});
test("wing support lookup and halftime reflection", () => {
  const s = initial();
  s.controlled[0] = 8;
  place(s.players[8], 160, 96);
  assert.deepEqual(target(s, 6), [213, 208]);
  s.period = 2;
  place(s.players[8], 479, 1055);
  assert.deepEqual(target(s, 6), [426, 943]);
});
