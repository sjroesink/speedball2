import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, catchBall } from "./game.js";
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
