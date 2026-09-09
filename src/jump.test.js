import { test } from "node:test";
import assert from "node:assert/strict";
import { canJumpAtBall } from "./attributes.js";
test("jump selection uses speed reach, free possession and original flight stage", () => {
  const p = { stats: [100, 100, 100, 100, 100, 100, 100, 100] };
  const b = { owner: -1, flightKind: 2, flightStage: 3, h: 5 };
  assert.equal(canJumpAtBall(p, b, 48, false), true);
  assert.equal(canJumpAtBall(p, b, 49, false), false);
  p.stats[3] = 250;
  assert.equal(canJumpAtBall(p, b, 72, false), true);
  assert.equal(canJumpAtBall(p, b, 73, false), false);
  assert.equal(canJumpAtBall(p, b, 0, true), false);
  b.owner = 9;
  assert.equal(canJumpAtBall(p, b, 0, false), false);
  b.owner = -1;
  b.flightStage = 2;
  assert.equal(canJumpAtBall(p, b, 0, false), false);
});
