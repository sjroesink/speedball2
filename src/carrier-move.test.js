import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep } from "./game.js";
import { pickup } from "./features.js";
import { carrierMove } from "./carrier-move.js";
const u = 22.4 / 576;
const world = (x, y) => ({ x: (576 - y) * u, z: (x - 320) * u });
function fixture(x = 200, y = 1000, i = 1) {
  const s = initial(),
    d = Array(18).fill(1000);
  for (const p of s.players) p.stun = 100;
  for (const item of s.pickups) item.wait = 100;
  Object.assign(s.players[i], world(x, y), { stun: 0, aiWait: 0 });
  Object.assign(s.ball, world(x, y), { owner: i });
  s.logicalView = [40, 900];
  return [s, d];
}
function target(p, x, y) {
  assert.ok(p);
  assert.ok(Math.abs(p.x - world(x, y).x) < 1e-12);
  assert.ok(Math.abs(p.z - world(x, y).z) < 1e-12);
}
test("carrier advances to zone midpoint and passes at the inclusive center, mirrored after halftime", () => {
  const [s, d] = fixture();
  target(carrierMove(s, 1, 255, d), 200, 884);
  Object.assign(s.players[1], world(200, 936));
  assert.equal(carrierMove(s, 1, 255, d), null);
  s.period = 2;
  Object.assign(s.players[1], world(440, 152));
  target(carrierMove(s, 1, 255, d), 440, 268);
  Object.assign(s.players[1], world(440, 216));
  assert.equal(carrierMove(s, 1, 255, d), null);
});
test("route search reuses random bit three for left/right priority and tries a shallower advance", () => {
  const [s, d] = fixture(200, 960);
  Object.assign(s.players[16], world(200, 860), { stun: 0 });
  d[16] = 100;
  target(carrierMove(s, 1, 8, d), 116, 864);
  target(carrierMove(s, 1, 0, d), 260, 864);
  Object.assign(s.players[1], world(100, 1000));
  Object.assign(s.players[16], world(100, 900));
  Object.assign(s.players[15], world(180, 900), { stun: 0 });
  d[15] = 128;
  target(carrierMove(s, 1, 8, d), 66, 968);
});
test("selected opponent within 64 takes priority over items; fallen opponents do not", () => {
  const [s, d] = fixture();
  Object.assign(s.players[16], world(200, 936), { stun: 0 });
  d[16] = 64;
  Object.assign(s.pickups[0], world(280, 1000), { wait: 0 });
  assert.equal(carrierMove(s, 1, 0, d), null);
  d[16] = 65;
  target(carrierMove(s, 1, 0, d), 280, 1000);
  d[16] = 64;
  s.players[16].stun = 1;
  target(carrierMove(s, 1, 0, d), 280, 1000);
});
test("collectible detours use equipment before coins and skip blocked directions", () => {
  const [s, d] = fixture();
  Object.assign(s.pickups[6], world(200, 980), { wait: 0 });
  Object.assign(s.pickups[2], world(280, 1000), { wait: 0 });
  target(carrierMove(s, 1, 0, d), 200, 980);
  Object.assign(s.players[16], world(200, 900), { stun: 0 });
  d[16] = 100;
  target(carrierMove(s, 1, 0, d), 280, 1000);
  const [a, ad] = fixture(200, 300, 6);
  a.logicalView = [40, 200];
  Object.assign(a.pickups[0], world(280, 300), { wait: 0 });
  target(carrierMove(a, 6, 49, ad), 280, 300);
  target(carrierMove(a, 6, 50, ad), 200, 174);
});
test("simulation routes a defender behind the zone center and throws at the center", () => {
  for (const y of [1000, 936]) {
    const [s] = fixture(200, y);
    step(s, simulationStep, {}, [false, false]);
    if (y === 1000) {
      assert.equal(s.players[1].throwMode || 0, 0);
      target({ x: s.players[1].aiX, z: s.players[1].aiZ }, 200, 884);
    } else assert.equal(s.players[1].throwMode, 3);
  }
});

test("carrier skips collected armour and routes to the next live item", () => {
 const [s,d] = fixture();
 Object.assign(s.pickups[6],world(280,1000),{kind:14,wait:0});
 Object.assign(s.pickups[2],world(240,1000),{kind:13,wait:0});
 target(carrierMove(s,1,0,d),280,1000);
 pickup(s,16,14);
 target(carrierMove(s,1,0,d),240,1000);
});
