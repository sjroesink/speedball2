import test from "node:test";
import assert from "node:assert/strict";
import { initial, catchBall, throwBall } from "./game.js";
test("depleted electroball remains charged, friendly catch retains it, throw clears it", () => {
  const s = initial();
  s.controlled[1] = 16;
  Object.assign(s.players[16], { x: 0, z: 0 });
  Object.assign(s.ball, {
    x: 0,
    z: 0,
    h: 0.75,
    vx: 1,
    charged: true,
    electric: 1,
    electricBudget: 1,
    lastTouch: 7,
  });
  catchBall(s);
  assert.equal(s.ball.owner, -1);
  assert.equal(s.ball.electric, 0);
  assert.equal(s.ball.charged, true);
  s.players[16].stun = 10;
  s.controlled[0] = 7;
  Object.assign(s.players[7], { x: 0, z: 0 });
  catchBall(s);
  assert.equal(s.ball.owner, 7);
  assert.equal(s.ball.charged, true);
  throwBall(s, 7, false);
  assert.equal(s.ball.charged, false);
  assert.equal(s.ball.electricBudget, 1);
});
test("opposing moving catch clears exhausted charge; stationary catch preserves it", () => {
  for (const vx of [0, 1]) {
    const s = initial();
    s.controlled[1] = 16;
    Object.assign(s.players[16], { x: 0, z: 0 });
    Object.assign(s.ball, {
      x: 0,
      z: 0,
      h: 0.75,
      vx,
      charged: true,
      electric: 0,
      electricBudget: 0,
      lastTouch: 7,
    });
    catchBall(s);
    assert.equal(s.ball.owner, 16);
    assert.equal(s.ball.charged, vx === 0);
  }
});
