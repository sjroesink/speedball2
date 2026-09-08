import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, wallBonus } from "./game.js";
const unit = 22.4 / 576;
test("all ten stars use complete original terrain cells, including edges", () => {
  for (const group of [0, 1])
    for (let index = 0; index < 5; index++)
      for (const offset of [0, 16, 31]) {
        const s = initial(),
          start = group === 0 ? 384 : 608;
        Object.assign(s.ball, {
          owner: -1,
          lastTouch: group * 9 + 7,
          x: (576 - start - index * 32 - offset) * unit,
          z: (group === 0 ? -288 : 288) * unit,
          h: 4,
        });
        wallBonus(s);
        assert.equal(s.stars[group], 1 << index);
        assert.equal(s.score[group], 2);
      }
});
test("star bank excludes adjacent cells and interior balls; throwing carrier is permitted", () => {
  for (const group of [0, 1]) {
    const start = group === 0 ? 384 : 608;
    for (const [y, z] of [
      [start - 1, group === 0 ? -288 : 288],
      [start + 160, group === 0 ? -288 : 288],
      [start + 16, group === 0 ? -287 : 287],
    ]) {
      const s = initial();
      Object.assign(s.ball, {
        owner: -1,
        lastTouch: group * 9 + 7,
        x: (576 - y) * unit,
        z: z * unit,
      });
      wallBonus(s);
      assert.deepEqual(s.stars, [0, 0]);
    }
  }
  const s = initial();
  Object.assign(s.ball, { owner: 7, lastTouch: 7, x: 176 * unit, z: -11.2 });
  wallBonus(s);
  assert.equal(s.score[0], 0);
  s.players[7].action = 3;
  wallBonus(s);
  assert.equal(s.score[0], 2);
});
