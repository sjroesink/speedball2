import test from "node:test";
import assert from "node:assert/strict";
import { playerPointDistance, opponentDistance } from "./physical-pose.js";
import { initial, catchBall } from "./game.js";
const unit = 22.4 / 576;

test("point distance uses vertical origin but ignores horizontal sprite origin", () => {
  const p = { x: 0, z: 0, physicalSprite: 73 };
  assert.equal(playerPointDistance(p, 28 * unit, 0), 16);
  p.physicalSprite = 94;
  assert.equal(playerPointDistance(p, 28 * unit, 0), 32);
  p.physicalSprite = 56; // Horizontal origin +10, vertical origin zero.
  assert.equal(playerPointDistance(p, 0, 20 * unit), 20);
});

test("opponent cache preserves the original team-one target origin for both readers", () => {
  const p = { team: 0, x: 0, z: 0, physicalSprite: 48 };
  const q = { team: 1, x: 0, z: 20 * unit, physicalSprite: 0 };
  assert.equal(opponentDistance(p, q), 18);
  assert.equal(opponentDistance(q, p), 18);
  p.team = 1; q.team = 0;
  assert.equal(opponentDistance(p, q), 20);
});

test("jump catch reaches sixteen pixels from its pose-adjusted point", () => {
  for (const distance of [28, 29]) {
    const s = initial();
    s.controlled[0] = 7;
    Object.assign(s.players[7], { x: 0, z: 0, action: 2, actionTime: .3,
      jumping: true, physicalSprite: 73 });
    Object.assign(s.ball, { owner: -1, x: distance * unit, z: 0, h: .2, after: 0 });
    catchBall(s, 7);
    assert.equal(s.ball.owner, distance === 28 ? 7 : -1);
  }
});
