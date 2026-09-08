import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  step,
  throwBall,
  wallBonus,
  matchClock,
  domeBounce,
  passTarget,
  selectPlayers,
} from "./game.js";
const dt = 1 / 60;

test("selection switches during actions and resolves equal distances by roster order", () => {
  const s = isolated();
  s.ball.owner = -1;
  s.ball.x = s.ball.z = 0;
  Object.assign(s.players[7], { x: 2, action: 1, actionTime: 0.3 });
  Object.assign(s.players[0], { x: 2.5, z: 0, stun: 0 });
  Object.assign(s.players[8], { x: 1.5, z: 0, stun: 0 });
  s.controlled[0] = 7;
  selectPlayers(s);
  assert.equal(s.controlled[0], 8);
  s.players[7].x = 1.5;
  s.controlled[0] = 7;
  selectPlayers(s);
  assert.equal(s.controlled[0], 8);
  s.ball.owner = 7;
  selectPlayers(s);
  assert.equal(s.controlled[0], 7);
});

test("a key pulse between simulation ticks still starts an action", () => {
  const s = isolated();
  s.ball.x = s.ball.z = 8;
  step(s, dt, { tackleId: 1 });
  assert.equal(s.players[7].action, 1);
});
function isolated() {
  const s = initial();
  s.players.forEach((p) => (p.stun = 10));
  Object.assign(s.players[7], { x: 0, z: 0, fx: 1, fz: 0, stun: 0 });
  return s;
}
test("missed tackle animates, moves, and cannot repeat while held", () => {
  const s = isolated();
  s.ball.x = s.ball.z = 9;
  step(s, dt, { tackle: true });
  assert.equal(s.players[7].action, 1);
  assert.ok(s.players[7].x > 0.075);
  for (let i = 0; i < 65; i++) step(s, dt, { tackle: true });
  assert.notEqual(s.players[7].action, 1);
});
test("tap and hold throw in facing direction with different heights", () => {
  for (const high of [false, true]) {
    const s = isolated();
    s.players[7].x = 4; // Clear throwing lane beside the central dome.
    s.ball.owner = 7;
    step(s, dt, { z: 1, shoot: true });
    assert.equal(s.ball.owner, 7, "ball stays in hand during wind-up");
    assert.equal(s.players[7].action, 3);
    for (let i = 1; i < 10; i++) step(s, dt, { z: 1, shoot: high });
    assert.equal(s.ball.owner, -1);
    assert.ok(s.ball.vz > 7);
    assert.ok(Math.abs(s.ball.vx) < 1);
    assert.equal(s.ball.flightKind, high ? 2 : 1);
  }
});
test("high ball clears standing player, can be caught while jumping", () => {
  const s = isolated();
  Object.assign(s.ball, { x: 0, z: 0, h: 3, owner: -1 });
  step(s, dt, {});
  assert.equal(s.ball.owner, -1);
  Object.assign(s.players[7], { action: 2, actionTime: 0.35 });
  s.ball.h = 2.7;
  s.ball.vh = 0;
  step(s, dt, {});
  assert.equal(s.ball.owner, 7);
});
test("a high throw at the goal rebounds above the crossbar", () => {
  const s = isolated();
  Object.assign(s.ball, { x: 20.9, z: 0, h: 3, vx: 24, owner: -1 });
  step(s, dt, {});
  assert.equal(s.score[0], 0);
  assert.ok(s.ball.vx < 0);
});
test("five stars bonus, enemy extinguish, and dome score", () => {
  const s = isolated();
  s.stars[0] = 15;
  Object.assign(s.ball, { x: 13, z: -11.1, h: 1, lastTouch: 7 });
  wallBonus(s);
  assert.equal(s.score[0], 2);
  s.ball.lastTouch = 16;
  wallBonus(s);
  assert.equal(s.score[0], 0);
  Object.assign(s.ball, {
    x: (256 * 22.4) / 576 + 0.4,
    z: 0,
    h: 0.5,
    vx: -12,
    vz: 0,
    lastTouch: 7,
  });
  domeBounce(s);
  assert.equal(s.score[0], 2);
  assert.ok(s.ball.vx > 0);
});
test("halftime swaps ends and resets targets", () => {
  const s = initial();
  s.time = 1;
  s.matchClock = 1 - dt;
  s.stars = [31, 31];
  step(s, dt);
  assert.equal(s.period, 2);
  assert.ok(s.players[0].x > 0);
  assert.deepEqual(s.stars, [0, 0]);
});

test("a held button launches automatically and cannot charge indefinitely", () => {
  const s = isolated();
  s.players[7].x = 4;
  s.ball.owner = 7;
  for (let i = 0; i < 12; i++) step(s, dt, { shoot: true });
  assert.equal(s.ball.owner, -1);
  assert.equal(s.ball.flightKind, 2);
  assert.equal(s.charge[0], 0);
});
test("movement uses eight directions and uses full speed on each diagonal axis", () => {
  const a = isolated(),
    b = isolated();
  a.ball.x = b.ball.x = 8;
  a.ball.z = b.ball.z = 8;
  step(a, dt, { x: 1 });
  step(b, dt, { x: 1, z: 0.7 });
  assert.ok(Math.abs(b.players[7].x - a.players[7].x) < 1e-8);
  assert.ok(Math.abs(b.players[7].x - b.players[7].z) < 1e-8);
});

test("AI outlet chooses an unmarked forward teammate, never a stunned one", () => {
  const s = isolated();
  Object.assign(s.players[6], { x: 6, z: 3, stun: 0 });
  assert.equal(passTarget(s, 7), 6);
  Object.assign(s.players[16], { x: 6, z: 3, stun: 0 });
  assert.equal(passTarget(s, 7), -1);
  s.players[16].stun = 10;
  s.players[6].stun = 1;
  assert.equal(passTarget(s, 7), -1);
});

test("shots outside the original-width goal rebound off the end wall", () => {
  const s = isolated();
  Object.assign(s.ball, { x: 20.9, z: 2.2, h: 1, vx: 24, owner: -1 });
  step(s, dt, {});
  assert.equal(s.score[0], 0);
  assert.ok(s.ball.vx < 0);
});

test("tackle wins possession directly and resolves only one opponent per slide", () => {
  const s = isolated();
  s.rng = [0, 0];
  Object.assign(s.players[16], { x: 0.7, z: 0, stun: 0, cooldown: 10 });
  Object.assign(s.players[17], { x: 0.8, z: 0, stun: 0, cooldown: 10 });
  Object.assign(s.ball, { owner: 16, lastTouch: 16, x: 0.7, z: 0, h: 1 });
  step(s, dt, { tackle: true }, [true, true]);
  assert.equal(
    s.ball.owner,
    7,
    "successful tackle must give possession immediately",
  );
  assert.equal(s.controlled[0], 7);
  assert.ok(s.players[16].stun > 0);
  assert.equal(s.players[17].health, 100, "second opponent is not hit");
  for (let n = 0; n < 4; n++) {
    Object.assign(s.players[17], {
      x: s.players[7].x + 0.3,
      z: s.players[7].z,
    });
    step(s, dt, {}, [true, true]);
  }
  assert.equal(
    s.players[17].health,
    100,
    "contact checking stays disabled for the rest of the slide",
  );
});

test("full star banks pay on the clock pulse, clear, and can be completed again", () => {
  for (const period of [1, 2]) {
    const s = initial();
    s.period = period;
    const owner = period === 1 ? 0 : 1;
    s.multiplier = owner === 0 ? 2 : -2;
    s.stars[0] = 30;
    Object.assign(s.ball, { x: 5, z: -11.2, h: 3, lastTouch: owner * 9 + 7 });
    wallBonus(s);
    assert.equal(s.score[owner], 4);
    assert.equal(s.stars[0], 31);
    matchClock(s, 0.99);
    assert.equal(s.score[owner], 4);
    matchClock(s, 0.01);
    assert.equal(s.score[owner], 24);
    assert.equal(s.stars[0], 0);
    matchClock(s, 1);
    assert.equal(s.score[owner], 24);
    wallBonus(s);
    assert.equal(s.stars[0], 1);
    assert.equal(s.score[owner], 28);
  }
});
test("extinguishing deducts exactly two and can cancel a pending bank bonus", () => {
  const s = initial();
  s.multiplier = 2;
  s.stars[0] = 31;
  s.score[0] = 20;
  Object.assign(s.ball, { x: 5, z: -11.2, h: 1, lastTouch: 16 });
  wallBonus(s);
  assert.equal(s.score[0], 18);
  assert.equal(s.stars[0], 30);
  matchClock(s, 1);
  assert.equal(s.score[0], 18);
});
