import test from "node:test";
import assert from "node:assert/strict";
import { createMatch } from "./game.js";
import { movementSpeed,velocityUnit } from "./attributes.js";
import { pickup } from "./features.js";
test("playable match starts use original two-player attributes for players and reserves", () => {
 for(const training of [false,true]) {
  const s=createMatch({training});assert.equal(s.restartPhase,1);assert.equal(s.time,90);
  for(const p of s.players) {
   assert.deepEqual(p.stats,Array(8).fill(170));assert.deepEqual(p.baseStats,Array(8).fill(170));
   assert.equal(movementSpeed(p,false),6*velocityUnit);assert.equal(movementSpeed(p,true),5*velocityUnit);
  }
  for(const b of s.bench) for(const stats of b) assert.deepEqual(stats,Array(8).fill(170));
  s.players[7].stats.fill(100);pickup(s,7,11);assert.deepEqual(s.players[7].stats,Array(8).fill(170));
  assert.equal(s.training,training);
 }
});
