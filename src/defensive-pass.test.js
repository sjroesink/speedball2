import { test } from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { defensivePass } from "./defensive-pass.js";
const u = 22.4 / 576;
function fixture() {
  const s = initial(),
    d = Array(18).fill(1000);
  for (const p of s.players) p.stun = 100;
  Object.assign(s.players[0], { x: 0, z: 0, stun: 0 });
  Object.assign(s.players[1], { x: 20 * u, z: 0, stun: 0 });
  Object.assign(s.players[3], { x: 100 * u, z: 0, stun: 0 });
  d[1] = 20;
  d[3] = 100;
  s.ball.owner = 0;
  return [s, d];
}
test("keeper prefers advanced roles, then falls back and applies strict throw range", () => {
  const [s, d] = fixture();
  let p = defensivePass(s, 0, d);
  assert.equal(p.receiver, 3);
  assert.equal(p.high, true);
  s.players[3].stun = 1;
  p = defensivePass(s, 0, d);
  assert.equal(p.receiver, 1);
  assert.equal(p.high, false);
  d[1] = 200;
  assert.equal(defensivePass(s, 0, d).high, true);
  d[1] = 201;
  assert.equal(defensivePass(s, 0, d), null);
});
test("pass lanes reject blocking directions; electroball clears those exclusions", () => {
  const [s, d] = fixture();
  Object.assign(s.players[16], { x: 50 * u, z: 0, stun: 0 });
  d[16] = 50;
  assert.equal(defensivePass(s, 0, d), null);
  s.ball.charged = true;
  assert.equal(defensivePass(s, 0, d).receiver, 3);
  Object.assign(s.players[4], { x: 100 * u, z: 0, stun: 0 });
  d[4] = 100;
  assert.equal(defensivePass(s, 0, d).receiver, 4);
});
