import test from "node:test";
import assert from "node:assert/strict";
import { initial, catchBall } from "./game.js";
import { velocityUnit } from "./attributes.js";

test("keeper deflections use both original direction tables and preserve throw attribution", () => {
  const expected = [
    [0, 0, 1, 2, 0, 6, 7, 0],
    [4, 2, 3, 4, 4, 4, 5, 6],
  ];
  for (let side = 0; side < 2; side++)
    for (let facing = 0; facing < 8; facing++) {
      const s = initial(),
        i = side * 9,
        p = s.players[i];
      s.controlled[side] = i;
      s.controlled[1 - side] = (1 - side) * 9 + 8;
      Object.assign(p, {
        x: 0,
        z: 0,
        action: 1,
        keeperBlock: true,
        fx: Math.round(Math.cos((facing * Math.PI) / 4)),
        fz: Math.round(Math.sin((facing * Math.PI) / 4)),
      });
      Object.assign(s.ball, {
        x: 0,
        z: 0,
        h: 0.75,
        vx: 1,
        vz: 1,
        lastTouch: (1 - side) * 9 + 8,
      });
      catchBall(s);
      const dir = expected[side][facing];
      assert.equal(s.ball.owner, -1);
      assert.equal(s.ball.lastTouch, (1 - side) * 9 + 8);
      assert.equal(
        s.ball.vx,
        Math.round(Math.cos((dir * Math.PI) / 4)) * 8 * velocityUnit,
      );
      assert.equal(
        s.ball.vz,
        Math.round(Math.sin((dir * Math.PI) / 4)) * 8 * velocityUnit,
      );
      assert.equal(s.ball.flightKind, 2);
      assert.equal(s.ball.speedTimer, 29);
      assert.equal(s.event.kind, 17);
    }
});
test("standing keeper catches; blocking keeper deflects high and electric shots", () => {
  const s = initial(),
    p = s.players[0];
  s.controlled[0] = 0;
  Object.assign(p, { x: 0, z: 0, fx: 0, fz: 1 });
  Object.assign(s.ball, { x: 0, z: 0, h: 0.75, lastTouch: 17 });
  catchBall(s);
  assert.equal(s.ball.owner, 0);
  Object.assign(p, { action: 1, keeperBlock: true });
  Object.assign(s.ball, { owner: -1, flightKind: 2, flightStage: 3 });
  catchBall(s);
  assert.equal(s.ball.owner, -1);
  Object.assign(s.ball, {
    flightStage: 1,
    electric: 1,
    charged: true,
    electricBudget: 1,
    lastTouch: 17,
  });
  catchBall(s);
  assert.equal(p.health, 100);
  assert.equal(s.ball.owner, -1);
  assert.equal(s.ball.electric, 0);
});
