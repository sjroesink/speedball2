import { test } from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { sideFeature } from "./features.js";
import { velocityUnit } from "./attributes.js";
const unit = 22.4 / 576;
test("warp accepts both inclusive latitude endpoints at each wall", () => {
  for (const y of [355, 370, 385, 767, 782, 797])
    for (const x of [31, 609]) {
      const s = initial();
      Object.assign(s.ball, {
        owner: -1,
        lastTouch: 7,
        x: (576 - y) * unit,
        z: (x - 320) * unit,
        h: 1.25,
        flightKind: 2,
        flightStage: 2,
        dirX: 1,
        dirZ: 0,
        vx: 2,
        vz: 3,
      });
      s.players[7].stats[4] = 200;
      assert.equal(sideFeature(s), true);
      assert.equal(s.ball.z, x === 31 ? 11.2 : -11.2);
      assert.equal(s.ball.x, (576 - y) * unit);
      assert.equal(s.ball.vx, 8 * velocityUnit);
      assert.equal(s.ball.vz, 3);
      assert.equal(s.ball.speedTimer, 100);
      assert.equal(s.ball.flightStage, 2);
      assert.equal(s.event.kind, 12);
    }
});
test("warp excludes outside latitudes, exact wall boundary, held balls and high stages", () => {
  for (const y of [354, 386, 766, 798]) {
    const s = initial();
    Object.assign(s.ball, { owner: -1, x: (576 - y) * unit, z: -11.3, h: 1 });
    assert.equal(sideFeature(s), false);
  }
  for (const change of [
    { z: -11.2 },
    { z: 11.2 },
    { z: 0 },
    { owner: 7 },
    { flightKind: 2, flightStage: 3 },
    { h: 1.3 },
  ]) {
    const s = initial();
    Object.assign(s.ball, { owner: -1, x: 206 * unit, z: -11.3, h: 1 }, change);
    assert.equal(sideFeature(s), false);
  }
});
