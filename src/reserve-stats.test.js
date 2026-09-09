import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { startInjury,medicalStep,pickup } from "./features.js";
test("full energy restores the current substitute's saved stats through a full bench rotation", () => {
 const s=initial(),p=s.players[7];
 s.bench[0]=[170,140,120].map(v=>Array(8).fill(v));p.stats.fill(173);
 for(const expected of [170,140,120,170]) {
  Object.assign(p,{x:0,z:0,health:0,actionTime:0});assert.ok(startInjury(s,7));
  for(let i=0;i<1000&&s.medical;i++)medicalStep(s,.04);
  assert.equal(s.medical,null);
  assert.deepEqual(p.baseStats,Array(8).fill(expected));
  p.stats.fill(100);p.health=20;pickup(s,7,11);
  assert.equal(p.health,100);assert.deepEqual(p.stats,Array(8).fill(expected));
  assert.notEqual(p.stats,p.baseStats);
 }
});
