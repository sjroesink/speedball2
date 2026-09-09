import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep } from "./game.js";
import { damage } from "./features.js";
import { beginRestart } from "./restart.js";

// Source anim_tackled has 26 displayed entries before its first -5.
for (const fatal of [false, true]) for (const restart of [false, true]) {
  test(`fall displays all 26 frames before completion (fatal=${fatal}, restart=${restart})`, () => {
    const s = initial();
    s.players.forEach(p => { p.stun = 100; });
    s.pickups.forEach(p => { p.wait = 100; });
    const p = s.players[16];
    Object.assign(p, { x: 0, z: 0, stun: 0, health: fatal ? 1 : 100 });
    assert.equal(damage(s, 7, 16), true);
    if (restart) beginRestart(s);
    for (let frame = 0; frame < 26; frame++) {
      step(s, simulationStep, {}, [true, true]);
      assert.equal(p.physicalFrame, frame);
      if (frame < 25) {
        assert.equal(p.action, 4);
        assert.equal(p.injury, 0);
        assert.ok(p.stun > 0);
      }
    }
    assert.equal(p.injury, fatal ? 1 : 0);
    assert.equal(s.score[0], fatal ? 10 : 0);
    if (!fatal) {
      assert.equal(p.action, 0);
      assert.equal(p.stun, 0);
      assert.equal(p.poseCursor, 0);
      assert.equal(p.moveX, 0);
      assert.equal(p.moveZ, 0);
    }
  });
}
