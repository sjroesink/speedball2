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

test("electroball knockdown follows nominal direction at three terrain units", () => {
  const unit = (25 * 22.4) / 576;
  for (const [dx, dz] of [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ]) {
    const s = initial();
    s.controlled[1] = 16;
    Object.assign(s.players[16], { x: 0, z: 0 });
    Object.assign(s.players[7], { fx: -dx, fz: -dz });
    Object.assign(s.ball, {
      owner: -1,
      x: 0,
      z: 0,
      h: 0.75,
      dirX: dx,
      dirZ: dz,
      vx: dx * 8 + (dx === 0 ? 4 : 0),
      vz: dz * 8 + (dz === 0 ? 4 : 0),
      charged: true,
      electric: 1,
      electricBudget: 1,
      lastTouch: 7,
    });
    catchBall(s);
    const p = s.players[16];
    assert.equal(p.action, 4);
    assert.equal(p.stun, 35 / 25);
    assert.equal(p.fallX, dx * 3 * unit);
    assert.equal(p.fallZ, dz * 3 * unit);
    assert.equal(s.ball.electric, 0);
    assert.equal(s.ball.owner, -1);
  }
});
