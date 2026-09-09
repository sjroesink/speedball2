import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, catchBall } from "./game.js";
import { ArenaAudio } from "./audio.js";
const unit = 22.4 / 576;
function setup() {
  const s = initial();
  s.players.forEach((p) => Object.assign(p, { x: 10, z: 8 }));
  Object.assign(s.ball, {
    x: 0,
    z: 0,
    h: 0.25,
    owner: -1,
    lastTouch: 7,
    lock: 0,
  });
  s.controlled = [7, 16];
  return s;
}
test("only selected players can catch, with original 16-unit inclusive range", () => {
  for (const distance of [16, 17]) {
    const s = setup();
    Object.assign(s.players[7], { x: distance * unit, z: 0 });
    catchBall(s);
    assert.equal(s.ball.owner, distance === 16 ? 7 : -1);
  }
  const s = setup();
  Object.assign(s.players[8], { x: 0, z: 0 });
  catchBall(s);
  assert.equal(
    s.ball.owner,
    -1,
    "unselected teammate must not steal the catch",
  );
});
test("throwing player cannot catch, but another selected player can intercept immediately", () => {
  const s = setup();
  Object.assign(s.players[7], { x: 0, z: 0, action: 3 });
  s.ball.lock = 0.18;
  catchBall(s);
  assert.equal(s.ball.owner, -1);
  Object.assign(s.players[16], { x: 0, z: 0 });
  catchBall(s);
  assert.equal(s.ball.owner, 16, "no invented global post-throw catch lock");
});
test("contested catches follow interleaved roster order, team two first at equal index", () => {
  const s = setup();
  Object.assign(s.players[7], { x: 0, z: 0 });
  Object.assign(s.players[16], { x: 15 * unit, z: 0 });
  catchBall(s);
  assert.equal(
    s.ball.owner,
    16,
    "earlier eligible player wins, not the nearest",
  );
  const other = setup();
  other.controlled[0] = 6;
  Object.assign(other.players[6], { x: 15 * unit, z: 0 });
  Object.assign(other.players[16], { x: 0, z: 0 });
  catchBall(other);
  assert.equal(other.ball.owner, 6);
});

test("interception signals keep team identity across halves and reach audio once", () => {
  for (const period of [1, 2]) for (const team of [0, 1])
    for (const friendly of [false, true]) for (const charged of [false, true]) {
      const s = setup(), i = team * 9 + 7;
      s.period = period;
      Object.assign(s.players[i], { x: 0, z: 0 });
      Object.assign(s.ball, {
        lastTouch: (friendly ? team : 1 - team) * 9 + 6,
        charged, electric: 0, vx: 1,
      });
      const audio = new ArenaAudio(), heard = [];
      audio.play = (cue) => heard.push(cue);
      // Consume the initial state before delivering the catch snapshot.
      audio.observe(s, true);
      heard.length = 0;
      catchBall(s);
      assert.equal(s.ball.owner, i);
      const intercepts = (s.events ?? []).filter(e => e.kind === 24 || e.kind === 25);
      const expected = !friendly && !charged ? [24 + team, 16] : [16];
      assert.equal(intercepts.length, expected.length - 1);
      audio.observe(s, true);
      audio.observe(s, true);
      assert.deepEqual(heard, expected, `half ${period}, team ${team}, friendly ${friendly}, charged ${charged}`);
    }
});

test("catch impact requires planar motion while interception remains independent", () => {
 for (const [vx,vz] of [[0,0],[1,0],[0,-1]]) for (const enemy of [false,true]) {
  const s=setup();
  Object.assign(s.players[7],{x:0,z:0});
  Object.assign(s.ball,{vx,vz,vh:-1,lastTouch:enemy?16:6});
  catchBall(s);
  assert.equal(s.ball.owner,7);
  const kinds=(s.events??[]).map(e=>e.kind);
  assert.equal(kinds.includes(16),!!(vx||vz));
  assert.equal(kinds.includes(24),enemy);
 }
});
