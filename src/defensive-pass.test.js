import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep } from "./game.js";
import { defensivePass, defensivePunt, goalThrow } from "./defensive-pass.js";
const u = 22.4 / 576;
test("goal lob threshold includes the displayed vertical pose origin", () => {
  const s=initial(), p=s.players[7];
  Object.assign(p,{x:380*u,z:16*u,physicalSprite:0}); p.stats[4]=100;
  assert.equal(goalThrow(s,7,0).high,false, "200 pixels equals twice throw skill");
  p.physicalSprite=50;
  assert.equal(goalThrow(s,7,0).high,true, "one-pixel pose shift crosses threshold");
});
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

test("defensive punts use goal offsets, strict steering threshold and mirrored wall routes", () => {
  const [s] = fixture();
  let plan = defensivePunt(s, 0, 0);
  assert.equal(plan.key, 3);
  assert.equal(plan.z, -48 * u);
  assert.equal(plan.steer, -1);
  assert.equal(plan.high, true);
  assert.equal(defensivePunt(s, 0, 50).steer, 0);
  assert.equal(defensivePunt(s, 0, 64).z, 48 * u);
  Object.assign(s.players[16], { x: 50 * u, z: 0, stun: 0 });
  for (const charged of [false, true]) {
    s.ball.charged = charged;
    for (const period of [1, 2]) {
      s.period = period;
      const d = period === 1 ? 1 : -1;
      s.players[16].x = d * 50 * u;
      for (const random of [0, 16]) {
        plan = defensivePunt(s, 0, random);
        assert.equal(plan.z, (random ? 288 : -288) * u);
        assert.equal(plan.x, d * 288 * u);
        assert.equal(plan.key, d * 3 + (random ? 1 : -1));
      }
    }
  }
});

test("AI keeper without receivers winds up a high punt and retains release steering", () => {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  Object.assign(s.players[0], { x: 0, z: 0, stun: 0, aiWait: 0 });
  Object.assign(s.ball, { x: 0, z: 0, owner: 0 });
  step(s, simulationStep, {}, [false, false]);
  assert.equal(s.players[0].throwMode, 3);
  assert.equal(s.ball.owner, 0);
  const steer = s.players[0].throwSteer;
  for (let n = 0; n < 4; n++) step(s, simulationStep, {}, [false, false]);
  assert.equal(s.ball.owner, -1);
  assert.equal(s.ball.flightKind, 2);
  assert.equal(s.ball.vz, steer * 4 * 25 * u);
});
