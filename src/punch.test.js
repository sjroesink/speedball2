import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep } from "./game.js";
import { velocityUnit } from "./attributes.js";
function setup() {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  Object.assign(s.players[7], { x: 4, z: 0, stun: 0, fx: 1, fz: 0 });
  Object.assign(s.ball, { owner: -1, x: 10, z: 10 });
  return s;
}
test("stationary action punches for four frames without moving", () => {
  const s = setup(),
    p = s.players[7];
  s.logicalView = [160, 380];
  step(s, simulationStep, { tackle: true }, [true, true]);
  assert.equal(p.action, 7);
  assert.equal(p.actionTime, 4 / 25);
  assert.equal(p.x, 4);
  for (let n = 1; n < 4; n++) {
    step(s, simulationStep, { tackle: true, x: 1 }, [true, true]);
    assert.equal(p.action, n === 3 ? 0 : 7);
    assert.equal(p.x, 4);
  }
  step(s, simulationStep, { tackle: true, x: 1 }, [true, true]);
  assert.equal(p.action, 0);
  assert.ok(p.x > 4);
  assert.equal(s.events.filter((e) => e.kind === 20).length, 1);
});
test("punch contact starts next tick and uses lower fall velocity than slide", () => {
  const s = setup();
  s.logicalView = [160, 360];
  s.rng = [0, 0];
  Object.assign(s.players[16], { x: 4.6, z: 0, stun: 0, fx: 1, fz: 0 });
  s.ball.owner = 16;
  step(s, simulationStep, { tackle: true }, [true, true]);
  assert.equal(s.ball.owner, 16);
  step(s, simulationStep, {}, [true, true]);
  assert.equal(s.ball.owner, 7);
  assert.ok(s.players[16].stun > 0);
  assert.equal(s.players[16].fallX, 3 * velocityUnit);
});

test("tackle waits until both players enter the original viewport", () => {
  const u = 22.4 / 576;
  for (const actorOutside of [false, true]) {
    const s = setup(),
      p = s.players[7],
      q = s.players[16];
    s.rng = [0, 0];
    Object.assign(p, {
      x: (actorOutside ? 93 : 91) * u,
      action: 7,
      actionTime: 4 / 25,
    });
    Object.assign(q, { x: (actorOutside ? 91 : 93) * u, z: 0, stun: 0, aiWait: 100 });
    s.ball.owner = 16;
    step(s, simulationStep, {}, [true, true]);
    assert.equal(s.ball.owner, 16);
    assert.ok(!p.tackleResolved);
    assert.equal(q.health, 100);
    s.logicalView = [160, 480];
    step(s, simulationStep, {}, [true, true]);
    assert.equal(s.ball.owner, 7);
    assert.ok(p.tackleResolved);
  }
});
