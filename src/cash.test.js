import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { featureStep } from "./features.js";
test("cash cap blocks new coins only after both multiplayer teams reach it", () => {
 const s=initial();for(const p of s.players)p.stun=100;
 const item=s.pickups[2];s.credits=[2000,1900];item.wait=.04;
 featureStep(s,.04);assert.equal(item.wait,0);
 s.credits[1]=2000;item.wait=.04;
 featureStep(s,.04);assert.equal(item.wait,256/25);
 // Existing coins are still available; this is not a clamp on earnings.
 const p=s.players[7];Object.assign(p,{x:item.x,z:item.z,stun:0,action:0});item.wait=0;
 featureStep(s,.04);assert.equal(s.credits[0],2100);assert.ok(item.wait>0);
});
test("training uses the human cash threshold, independent of AI earnings", () => {
 const s=initial({training:true});for(const p of s.players)p.stun=100;
 assert.deepEqual(s.cashLimits,[10000,10000]);
 const item=s.pickups[2];s.credits=[9900,20000];item.wait=.04;
 featureStep(s,.04);assert.equal(item.wait,0);
 s.credits=[10000,0];item.wait=.04;
 featureStep(s,.04);assert.equal(item.wait,256/25);
});
