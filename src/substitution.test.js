import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { medicalStep } from "./features.js";
test("three bench slots rotate and the outgoing attributes return on the fourth substitution", () => {
  const s = initial(),
    p = s.players[7];
  s.bench[0] = [110, 120, 130].map((v) => Array(8).fill(v));
  p.stats = Array(8).fill(197);
  p.z = -2;
  for (const expected of [110, 120, 130, 190]) {
    p.health = 0;
    p.injury = 0.04;
    medicalStep(s, 0.04);
    assert.equal(p.stats[0], expected);
    assert.equal(p.health, 100);
    assert.equal(s.reserves[0], 3);
  }
  assert.deepEqual(
    s.bench[0].map((stats) => stats[0]),
    [110, 120, 130],
  );
});
test("substitutes enter at original side positions and start toward center", () => {
  const u = 22.4 / 576;
  for (const period of [1, 2])
    for (const team of [0, 1])
      for (const side of [-1, 1]) {
        const s = initial();
        s.period = period;
        const p = s.players[team * 9 + 7];
        Object.assign(p, {
          z: side,
          injury: 0.04,
          health: 0,
          gear: 17,
          gearBackup: 150,
        });
        medicalStep(s, 0.04);
        const d = (team === 0 ? 1 : -1) * (period === 2 ? -1 : 1);
        assert.equal(p.x, -d * 32 * u);
        assert.equal(p.z, side * 272 * u);
        assert.equal(p.aiX, 0);
        assert.equal(p.aiZ, 0);
        assert.equal(p.aiWait, 1);
        assert.equal(p.gear, 0);
        assert.equal(p.gearBackup, 0);
      }
});
