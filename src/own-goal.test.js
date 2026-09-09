import test from "node:test";
import assert from "node:assert/strict";
import {initial,step} from "./game.js";
import {isOwnGoal} from "./events.js";
test("goal events retain last touch and distinguish own goals at either end after halftime",()=>{
 for(const period of [1,2])for(const sign of [-1,1])for(const touch of [-1,7,16]){
  const s=initial();s.period=period;s.multiplier=2;for(const p of s.players)p.stun=100;
  Object.assign(s.ball,{owner:-1,lastTouch:touch,x:sign*21.4,z:0,vx:sign*8,vz:0,h:.75,flightKind:1,flightStage:1,flightIndex:0,flightFraction:0,speedTimer:100,nextSlowdown:0});
  step(s,.04,{},[true,true]);
  const scorer=(sign*(period===1?1:-1)>0)?0:1;
  assert.equal(s.score[scorer],scorer===0?20:10);
  assert.equal(s.score[1-scorer],0);
  const goal=s.events.find(e=>e.kind===7);
  assert.equal(goal.target,touch);
  assert.equal(isOwnGoal(goal),touch>=0&&Math.floor(touch/9)!==scorer);
 }
});
