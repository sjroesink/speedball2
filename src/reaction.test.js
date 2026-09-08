import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, aiReactionTime } from "./game.js";
test("AI reaction table and retained target until next decision", () => {
  const expected = [
    16, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 9, 8,
  ];
  for (let i = 0; i < 16; i++)
    assert.equal(aiReactionTime(100 + i * 10), expected[i] / 25);
  for (const intelligence of [100, 250]) {
    const s = initial();
    s.players.forEach((p) => (p.stun = 100));
    const p = s.players[7];
    Object.assign(p, { x: 0, z: 0, stun: 0 });
    p.stats[7] = intelligence;
    Object.assign(s.ball, { x: 5, z: 0, h: 4 });
    step(s, 1 / 25, {}, [false, false]);
    assert.equal(p.aiX, 5);
    s.ball.x = -5;
    const ticks = intelligence === 100 ? 16 : 8;
    for (let n = 1; n < ticks; n++) step(s, 1 / 25, {}, [false, false]);
    assert.equal(p.aiX, 5);
    step(s, 1 / 25, {}, [false, false]);
    assert.equal(p.aiX, -5);
  }
});
test("busy AI waits for action completion before choosing a new target", () => {
  const s = initial();
  s.players.forEach((p) => (p.stun = 100));
  const p = s.players[7];
  Object.assign(p, {
    x: 0,
    z: 0,
    stun: 0,
    action: 3,
    actionTime: 0.2,
    aiX: 2,
    aiZ: 0,
  });
  s.ball.x = 5;
  s.ball.h = 4;
  step(s, 0.04, {}, [false, false]);
  assert.equal(p.aiX, 2);
  for (let n = 0; n < 5; n++) step(s, 0.04, {}, [false, false]);
  assert.equal(p.aiX, 5);
});
