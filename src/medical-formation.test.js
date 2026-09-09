import test from "node:test";
import assert from "node:assert/strict";
import { initial,step,launchPosition } from "./game.js";
import { startInjury } from "./features.js";
test("healthy players return during medical care without releasing ball or advancing launcher", () => {
 const s=initial(),p=s.players[1];const target=launchPosition(s,1);
 p.x+=3;const before=p.x;
 Object.assign(s.players[7],{x:0,z:0,health:0,actionTime:0});
 startInjury(s,7);const anchor=[s.ball.x,s.ball.z];
 Object.assign(s.players[8],{health:0,actionTime:.4});
 step(s,.04,{x:1,shoot:true},[true,true]);
 assert.ok(p.x<before);assert.equal(s.players[7].stun,1);
 for(let i=0;i<49;i++)step(s,.04,{},[true,true]);
 assert.equal(s.medical.player,7);assert.equal(s.players[8].injury,0);
 assert.deepEqual([p.x,p.z],target);
 assert.deepEqual([s.ball.x,s.ball.z],anchor);assert.equal(s.ball.owner,-1);
 assert.equal(s.time,90);assert.notEqual(s.restartPhase,2);
 assert.equal(s.events.some(e=>e.kind===22||e.kind===23),false);
});
