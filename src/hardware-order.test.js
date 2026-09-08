import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep } from "./game.js";
test("warp and star contacts use the position at tick start", () => {
  for (const warp of [true, false]) {
    const s = initial();
    s.players.forEach((p) => (p.stun = 100));
    Object.assign(s.ball, {
      x: warp ? 8 : (48 * 22.4) / 576,
      z: warp ? 11.1 : -11.1,
      h: 1,
      vz: warp ? 8 : -8,
      owner: -1,
      lastTouch: 7,
      speedTimer: 100,
    });
    step(s, simulationStep, {}, [true, true]);
    assert.equal(s.score[0], 0);
    assert.ok(warp ? s.ball.z > 11.2 : s.ball.z < -11.2);
    step(s, simulationStep, {}, [true, true]);
    if (warp) {
      assert.ok(s.ball.z < 0);
      assert.equal(s.event.kind, 12);
    } else {
      assert.equal(s.score[0], 2);
    }
  }
});
