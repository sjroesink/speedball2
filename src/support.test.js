import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { supportTarget } from "./support.js";
const unit = 22.4 / 576;
const target = (s, i) => {
  const [x, z] = supportTarget(s, i);
  return [Math.round(z / unit + 320), Math.round(576 - x / unit)];
};
const place = (p, x, y) =>
  Object.assign(p, { x: (576 - y) * unit, z: (x - 320) * unit });
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
