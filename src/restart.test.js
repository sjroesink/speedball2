import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep, launchPosition } from "./game.js";

test("medical restart walks to formation, preserves damage and holds clock/input until launch", () => {
  const s = initial();
  s.pause = 0;
  s.restartPhase = 1;
  s.players[7].x += 5;
  s.players[7].health = 42;
  s.players[7].stats[3] = 170;
  s.ball.x = s.ball.z = 0;
  const x = s.players[7].x,
    time = s.time;
  step(s, simulationStep, { x: 1, shoot: true }, [true, true]);
  assert.ok(s.players[7].x < x && s.players[7].x > x - 1);
  for (let i = 0; s.restartPhase === 1 && i < 1000; i++)
    step(s, simulationStep, {}, [true, true]);
  assert.equal(s.restartPhase, 2);
  s.players.forEach((p, i) =>
    assert.deepEqual([p.x, p.z], launchPosition(s, i)),
  );
  assert.equal(s.players[7].health, 42);
  assert.equal(s.players[7].stats[3], 170);
  for (let i = 0; i < 39; i++)
    step(s, simulationStep, { shoot: true }, [true, true]);
  assert.equal(s.restartPhase, 2);
  assert.equal(s.time, time);
  assert.equal(s.ball.owner, -1);
  step(s, simulationStep, { shoot: true }, [true, true]);
  assert.equal(s.restartPhase, 0);
  assert.equal(s.ball.h, 3);
  assert.equal(s.time, time);
  assert.equal(s.previous[0].shoot, true);
});
