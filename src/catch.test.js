import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, catchBall, step, simulationStep } from "./game.js";
test("standing catch faces the ball and blocks input for three frames", () => {
  const s = initial();
  s.logicalView = [160, 380];
  for (const p of s.players) p.stun = 100;
  const p = s.players[7];
  Object.assign(p, { x: 4, z: 0, stun: 0, fx: 1, fz: 0 });
  s.controlled[0] = 7;
  Object.assign(s.ball, { owner: -1, x: 4, z: 0.2, h: 0.75, vx: 0, vz: -1 });
  catchBall(s);
  assert.equal(p.action, 6);
  assert.equal(p.actionTime, 3 / 25);
  assert.equal(p.fx, 0);
  assert.equal(p.fz, 1);
  for (let n = 0; n < 2; n++) {
    step(s, simulationStep, { x: 1, lobId: 1 }, [true, true]);
    assert.equal(p.x, 4);
    assert.equal(s.ball.owner, 7);
  }
  step(s, simulationStep, { x: 1, lobId: 1 }, [true, true]);
  assert.equal(p.action, 0);
  assert.ok(p.x > 4);
});
test("moving catches and stationary balls do not trigger standing recovery", () => {
  for (const mode of ["moving", "still ball", "same position"]) {
    const s = initial();
    const p = s.players[7];
    Object.assign(p, { x: 4, z: 0 });
    s.controlled[0] = 7;
    Object.assign(s.ball, {
      owner: -1,
      x: 4,
      z: mode === "same position" ? 0 : 0.2,
      h: 0.75,
      vx: 0,
      vz: mode === "still ball" ? 0 : -1,
    });
    if (mode === "moving") p.moveX = 1;
    catchBall(s);
    assert.equal(s.ball.owner, 7);
    assert.equal(p.action, 0, mode);
  }
});
