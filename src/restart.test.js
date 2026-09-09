import { beginRestart } from "./restart.js";
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

test("kickoff holds live input until the central launch finishes", () => {
  const s = initial();
  beginRestart(s);
  for (let i = 0; i < 40; i++)
    step(s, simulationStep, { shoot: true }, [true, true]);
  assert.equal(s.restartPhase, 2);
  assert.equal(s.time, 90);
  assert.equal(s.ball.owner, -1);
  step(s, simulationStep, { shoot: true }, [true, true]);
  assert.equal(s.restartPhase, 0);
  assert.equal(s.time, 90);
});

test("goal celebration precedes formation without teleporting or healing players", () => {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  Object.assign(s.players[7], { x: 3, z: 2, health: 41 });
  Object.assign(s.ball, {
    x: 544 * (22.4 / 576) + 0.01,
    z: 0,
    h: 0.5,
    vx: 8,
    owner: -1,
  });
  step(s, simulationStep, {}, [false, false]);
  assert.equal(s.score[0], 10);
  assert.equal(s.restartPhase, 1);
  assert.equal(s.pause, 1.4);
  assert.deepEqual(
    [s.players[7].x, s.players[7].z, s.players[7].health],
    [3, 2, 41],
  );
  for (let i = 0; i < 34; i++) step(s, simulationStep, {}, [false, false]);
  assert.deepEqual([s.players[7].x, s.players[7].z], [3, 2]);
  for (let i = 0; s.restartPhase && i < 1500; i++)
    step(s, simulationStep, {}, [false, false]);
  assert.equal(s.restartPhase, 0);
  assert.equal(s.time, 90);
  assert.equal(s.players[7].health, 41);
  assert.equal(s.ball.owner, -1);
  assert.equal(s.ball.h, 3);
});
