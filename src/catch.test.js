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

test("keeper block checks height then electric damage, including shield bypass", () => {
  for (const stage of [1, 3]) for (const charged of [false, true]) for (const shield of [false, true]) {
    const s = initial();
    for (const p of s.players) p.stun = 100;
    const p = s.players[0];
    Object.assign(p, { x: 0, z: 0, stun: 0, action: 1, keeperBlock: true, fx: 0, fz: 1 });
    s.controlled[0] = 0;
    if (shield) s.effect = {kind: 10, team: 0, time: 10};
    Object.assign(s.ball, { owner: -1, lastTouch: 9, x: 0, z: 0,
      vx: -4, vz: 0, h: 0.25 + stage * 0.5, flightKind: 2,
      flightStage: stage, charged, electric: charged ? 3 : 0 });
    catchBall(s);
    const hit = stage <= 2 && charged;
    const deflected = stage <= 2 && !charged;
    assert.equal(p.health < 100, hit);
    assert.equal(p.action, hit ? 4 : 1);
    assert.equal(s.ball.owner, -1);
    assert.equal(s.ball.flightStage, deflected ? 1 : stage);
    assert.equal(s.ball.electric, charged ? (hit ? 2 : 3) : 0);
    assert.equal((s.events ?? []).some(e => e.kind === 17), deflected);
  }
});
