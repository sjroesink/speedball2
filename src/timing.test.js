import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationRate, simulationStep } from "./game.js";
test("runtime cadence advances 25 simulation ticks per match second", () => {
  const s = initial();
  s.players.forEach((p) => (p.stun = 100));
  for (let n = 0; n < simulationRate; n++)
    step(s, simulationStep, {}, [true, true]);
  assert.equal(s.tick, 25);
  assert.equal(s.time, 89);
});
test("released action counter survives sampling at 25 Hz", () => {
  const s = initial();
  s.players.forEach((p) => (p.stun = 100));
  Object.assign(s.players[7], { x: 0, z: 0, stun: 0, fx: 1, fz: 0 });
  Object.assign(s.ball, { owner: 7, x: 0, z: 0, h: 1 });
  for (let n = 0; n < 5; n++)
    step(s, simulationStep, { fire: 1, shoot: false }, [true, true]);
  assert.equal(s.ball.owner, -1);
  assert.equal(s.ball.flightKind, 1);
  assert.equal(s.ball.lastTouch, 7);
  assert.equal(s.events.filter((e) => e.kind === 3).length, 1);
  step(s, simulationStep, { fire: 1, shoot: false }, [true, true]);
  assert.equal(s.events.filter((e) => e.kind === 3).length, 1);
});

test("throw releases at index four, samples current button and clears action after displaying index seven", () => {
  for (const high of [false, true]) {
    const s = initial();
    s.logicalView = [160, 380];
    for (const p of s.players) p.stun = 100;
    Object.assign(s.players[7], { x: 4, z: 0, fx: 1, fz: 0, stun: 0 });
    s.ball.owner = 7;
    step(s, simulationStep, { shoot: true }, [true, true]);
    for (let index = 1; index < 4; index++) {
      step(s, simulationStep, { shoot: !high }, [true, true]);
      assert.equal(s.ball.owner, 7, `index ${index}`);
    }
    step(s, simulationStep, { shoot: high }, [true, true]);
    assert.equal(s.ball.owner, -1);
    assert.equal(s.ball.flightKind, high ? 2 : 1);
    assert.equal(s.players[7].actionTime, 4 / 25);
    for (let index = 5; index < 8; index++) {
      step(s, simulationStep, {}, [true, true]);
      assert.equal(s.players[7].action, index === 7 ? 0 : 3);
      assert.equal(s.players[7].physicalFrame, index);
    }
    step(s, simulationStep, {}, [true, true]);
    assert.equal(s.players[7].action, 0);
  }
});

test("AI low and high throws hold possession through the same preparation", () => {
  for (const high of [false, true]) {
    const s = initial();
    for (const p of s.players) Object.assign(p, { stun: 100, x: -10, z: 8 });
    const p = s.players[7];
    Object.assign(p, { stun: 0, x: high ? 4 : 16, z: 0, fx: 1, fz: 0 });
    for (const item of s.pickups) item.wait = 100;
    if (high)
      Object.assign(s.players[16], { x: 5.6, z: 0, stun: 0, aiWait: 100 });
    Object.assign(s.ball, { owner: 7, x: p.x, z: 0 });
    for (let n = 0; n < 4; n++) {
      step(s, simulationStep, {}, [false, false]);
      assert.equal(s.ball.owner, 7);
      assert.equal(p.action, 3);
      assert.equal(p.x, high ? 4 : 16);
    }
    step(s, simulationStep, {}, [false, false]);
    assert.equal(s.ball.owner, -1);
    assert.equal(s.ball.flightKind, high ? 2 : 1);
    assert.equal(s.events.filter((e) => e.kind === 3).length, 1);
  }
});
test("possession loss cancels a pending lob", () => {
  const s = initial();
  s.logicalView = [160, 380];
  for (const p of s.players) p.stun = 100;
  Object.assign(s.players[7], { stun: 0, x: 4, z: 0 });
  s.ball.owner = 7;
  step(s, simulationStep, { lobId: 1 }, [true, true]);
  assert.equal(s.players[7].throwMode, 3);
  Object.assign(s.ball, { owner: -1, x: 10, z: 10, h: 1 });
  for (let n = 0; n < 8; n++)
    step(s, simulationStep, { lobId: 1 }, [true, true]);
  assert.equal((s.events ?? []).filter((e) => e.kind === 3).length, 0);
  assert.equal(s.charge[0], 0);
});

test("landing and slide recovery emit one sound on their original action frame", () => {
  for (const [action, frames, kind, eventFrame] of [
    [1, 8, 19, 7],
    [2, 12, 18, 10],
  ]) {
    const s = initial();
    for (const p of s.players) p.stun = 100;
    Object.assign(s.players[7], {
      x: 4,
      z: 0,
      stun: 0,
      action,
      actionTime: frames / 25,
      jumping: action === 2,
    });
    Object.assign(s.ball, { owner: -1, x: 10, z: 10 });
    for (let frame = 1; frame <= frames + 2; frame++) {
      step(s, simulationStep, {}, [true, true]);
      const events = (s.events ?? []).filter((e) => e.kind === kind);
      assert.equal(
        events.length,
        frame < eventFrame ? 0 : 1,
        `${kind} frame ${frame}`,
      );
      if (events.length) assert.equal(events[0].actor, 7);
    }
  }
});
