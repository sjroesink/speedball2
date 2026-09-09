import { flightStep } from "./ball.js";
import { restartStep } from "./restart.js";
import { pickup } from "./features.js";
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
  assert.equal(s.ball.h, 3.25);
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
  assert.equal(s.ball.h, 3.25);
});

test("formation clears temporary powers while retaining equipment, energy and base attributes", () => {
 for(const kind of [1,2,3,4,5,6,9,10]) {
  const s=initial(),p=s.players[7];
  p.health=42;p.stats[0]=170;
  pickup(s,7,17); // Equipment survives expiration of a temporary power.
  pickup(s,7,kind);
  beginRestart(s,.2);
  step(s,simulationStep,{},[true,true]);
  assert.equal(s.effect.kind,kind); // Still in celebration pause.
  for(let i=0;i<10;i++)step(s,simulationStep,{},[true,true]);
  assert.deepEqual(s.effect,{kind:0,team:-1,time:0});
  assert.equal(p.gear,17);assert.equal(p.stats[3],250);
  assert.equal(p.stats[0],170);assert.equal(p.health,42);
  assert.ok(s.players.every(q=>q.statBackup.every(v=>v===0)));
 }
});

test("launcher continues original landing frames after releasing the players", () => {
 const s=initial();beginRestart(s);s.restartPhase=2;
 for(let i=0;i<40;i++)restartStep(s,.04,launchPosition);
 assert.equal(s.restartPhase,0);assert.equal(s.ball.flightKind,3);
 assert.equal(s.ball.flightIndex,20);
 const stages=[];
 for(let i=0;i<11;i++){flightStep(s.ball,.04);stages.push(s.ball.flightStage)}
 assert.deepEqual(stages,[6,6,10,10,9,9,8,8,7,7,0]);
 assert.equal(s.ball.h,.25);assert.equal(s.ball.vh,0);
 flightStep(s.ball,1);assert.equal(s.ball.h,.25);
});

test("launcher mechanism and release sounds occur once at their phase boundaries", () => {
 const s=initial();beginRestart(s);
 restartStep(s,.04,launchPosition);
 assert.deepEqual(s.events.map(e=>e.kind),[22]);
 for(let i=0;i<18;i++)restartStep(s,.04,launchPosition);
 assert.deepEqual(s.events.map(e=>e.kind),[22]);
 restartStep(s,.04,launchPosition);
 assert.deepEqual(s.events.map(e=>e.kind),[22,23]);
 for(let i=0;i<30;i++)restartStep(s,.04,launchPosition);
 assert.deepEqual(s.events.map(e=>e.kind),[22,23]);
});
