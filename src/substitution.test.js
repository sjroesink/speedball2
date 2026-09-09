import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep } from "./game.js";
import { medicalStep, startInjury } from "./features.js";
test("three bench slots rotate and the outgoing attributes return on the fourth substitution", () => {
  const s = initial(),
    p = s.players[7];
  s.bench[0] = [110, 120, 130].map((v) => Array(8).fill(v));
  p.stats = Array(8).fill(197);
  p.z = -2;
  for (const expected of [110, 120, 130, 190]) {
    p.health = 0;
    p.actionTime = 0;
    assert.equal(startInjury(s, 7), true);
    finishCare(s);
    assert.equal(p.stats[0], expected);
    assert.equal(p.health, 100);
    assert.equal(s.reserves[0], 3);
  }
  assert.deepEqual(
    s.bench[0].map((stats) => stats[0]),
    [110, 120, 130],
  );
});
test("substitutes enter at original side positions and start toward center", () => {
  const u = 22.4 / 576;
  for (const period of [1, 2])
    for (const team of [0, 1])
      for (const side of [-1, 1]) {
        const s = initial();
        s.period = period;
        const p = s.players[team * 9 + 7];
        Object.assign(p, {
          z: side,
          actionTime: 0,
          health: 0,
          gear: 17,
          gearBackup: 150,
        });
        assert.equal(startInjury(s, team * 9 + 7), true);
        finishCare(s);
        const d = (team === 0 ? 1 : -1) * (period === 2 ? -1 : 1);
        assert.equal(p.x, -d * 32 * u);
        assert.equal(p.z, -side * 272 * u);
        assert.equal(p.aiX, 0);
        assert.equal(p.aiZ, 0);
        assert.equal(p.aiWait, 1);
        assert.equal(p.gear, 0);
        assert.equal(p.gearBackup, 0);
      }
});

test("medical start aligns the injured player, awards the current multiplier once and serializes injuries", () => {
  const s = initial(),
    u = 22.4 / 576;
  Object.assign(s.players[7], {
    health: 0,
    actionTime: 0,
    x: (576 - 1107) * u,
    z: (595 - 320) * u,
  });
  Object.assign(s.players[16], { health: 0, actionTime: 0 });
  s.multiplier = -2;
  assert.equal(startInjury(s, 7), true);
  assert.ok(Math.abs(s.players[7].x - (576 - 1104) * u) < 1e-12);
  assert.ok(Math.abs(s.players[7].z - (592 - 320) * u) < 1e-12);
  assert.equal(s.score[1], 20);
  assert.equal(startInjury(s, 7), false);
  assert.equal(startInjury(s, 16), false);
  assert.equal(s.score[0], 0);
});

test("simultaneous fatal falls enter medical care in player processing order", () => {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  for (const item of s.pickups) item.wait = 100;
  for (const i of [7, 16])
    Object.assign(s.players[i], {
      health: 0,
      action: 4,
      actionTime: 35 / 25,
      stun: 35 / 25,
    });
  for (let frame = 0; frame < 35; frame++)
    step(s, simulationStep, {}, [false, false]);
  assert.equal(s.players[16].injury, 1);
  assert.equal(s.players[7].injury, 0);
  assert.deepEqual(s.score, [10, 0]);
  for (let frame = 0; s.players[16].injury > 0 && frame < 1000; frame++)
    step(s, simulationStep, {}, [false, false]);
  step(s, simulationStep, {}, [false, false]);
  assert.equal(s.players[16].injury, 0);
  assert.equal(s.players[7].injury, 1);
  assert.deepEqual(s.score, [10, 10]);
});

function finishCare(s) {
  for (let i = 0; s.medical && i < 1000; i++) medicalStep(s, 1 / 25);
  assert.equal(s.medical, null);
  assert.equal(s.restartPhase, 1);
}

test("medical anchor takes the ball from any carrier and stays behind during evacuation", () => {
  for (const owner of [-1, 7, 16]) {
    const s = initial();
    Object.assign(s.players[7], { health: 0, actionTime: 0, x: 4, z: -2 });
    Object.assign(s.ball, {
      owner,
      x: -8,
      z: 8,
      vx: 4,
      vz: 5,
      vh: 2,
      flightKind: 2,
      multiplierPath: 1,
    });
    s.charge = [1, 1];
    assert.equal(startInjury(s, 7), true);
    const anchor = [s.players[7].x, s.players[7].z];
    for (let i = 0; i < 300; i++) medicalStep(s, 1 / 25);
    assert.deepEqual([s.ball.x, s.ball.z], anchor);
    assert.equal(s.ball.owner, -1);
    assert.deepEqual(
      [
        s.ball.vx,
        s.ball.vz,
        s.ball.vh,
        s.ball.flightKind,
        s.ball.multiplierPath,
      ],
      [0, 0, 0, 0, 0],
    );
    assert.deepEqual(s.charge, [0, 0]);
    assert.notEqual(s.players[7].z, anchor[1]);
  }
});
