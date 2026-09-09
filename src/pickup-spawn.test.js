import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { featureStep } from "./features.js";
import { spawnPickup } from "./pickup-spawn.js";
const u = 22.4 / 576;
test("powers stay in separate halves and coins in their quadrants on the 16-unit grid", () => {
  const s = initial();
  assert.equal(s.pickups[2].wait, s.pickups[5].wait);
  for (let n = 0; n < 100; n++)
    for (let slot = 0; slot < 6; slot++) {
      spawnPickup(s, slot);
      const p = s.pickups[slot];
      const x = Math.round(p.z / u + 320),
        y = Math.round(576 - p.x / u);
      assert.equal((x - 72) % 16, 0);
      assert.equal((y - 72) % 16, 0);
      const right = slot >= 2 && (slot - 2) % 2,
        bottom = slot < 2 ? slot === 1 : slot >= 4;
      assert.ok(
        x >= 72 + (right ? 256 : 0) &&
          x <= 72 + (slot < 2 ? 496 : 240) + (right ? 256 : 0),
      );
      assert.ok(y >= 72 + (bottom ? 512 : 0) && y <= 568 + (bottom ? 512 : 0));
      assert.ok(
        p.wait >= (slot < 2 ? 128 : 32) / 25 &&
          p.wait <= (slot < 2 ? 255 : 63) / 25,
      );
    }
});
test("uncollected coins and powers persist; collection requires the original 16-unit distance", () => {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  for (const item of s.pickups.slice(0, 6)) {
    item.wait = 0;
    item.life = 0;
  }
  const before = structuredClone(s.pickups.slice(0, 6));
  featureStep(s, 60);
  assert.deepEqual(s.pickups.slice(0, 6), before);
  const item = s.pickups[2],
    p = s.players[7];
  Object.assign(item, { x: 0, z: 0, wait: 0 });
  Object.assign(p, { x: 17 * u, z: 0, stun: 0 });
  featureStep(s, 0.04);
  assert.equal(item.wait, 0);
  p.x = 16 * u;
  featureStep(s, 0.04);
  assert.ok(item.wait > 0);
  assert.equal(s.credits[0], 100);
});

test("Amiga random indices select their corresponding effects, with solo freeze rejected", () => {
  // With zero low words and B=0, the third RNG draw has high word 3*A.
  // 11 is the inverse of 3 modulo 16, selecting each source table index.
  const expected = [10, 1, 3, 4, 5, 6, 7, 8, 2, 9, 11, 12];
  for (let index=0; index<12; index++) {
    const s=initial();s.rng=[((index*11)%16)<<16,0];
    spawnPickup(s,0);
    assert.equal(s.pickups[0].kind,expected[index]);
  }
  const s=initial({training:true});s.rng=[11<<16,0];
  spawnPickup(s,0);
  assert.equal(s.pickups[0].kind,8); // Freeze draw 33 is rejected; next is 55.
  assert.deepEqual(s.rng,[55<<16,33<<16]);
  s.rng=[0x31415926,0x53589793];
  const seen=new Set();
  for(let i=0;i<1000;i++){spawnPickup(s,0);seen.add(s.pickups[0].kind)}
  assert.equal(seen.has(1),false);
  assert.equal(seen.has(2),true); // Reverse controls remains valid in solo.
  assert.equal(seen.size,11);
});
