import test from "node:test";
import assert from "node:assert/strict";
import {initial,step,simulationStep} from "./game.js";

test("human and AI windup emit sound while the ball is still held",()=>{
 for(const human of [false,true]){
  const s=initial();
  for(const p of s.players)p.stun=100;
  for(const item of s.pickups)item.wait=100;
  Object.assign(s.players[0],{x:0,z:0,stun:0,aiWait:0});
  s.controlled[0]=0;
  Object.assign(s.ball,{x:0,z:0,owner:0});
  step(s,simulationStep,{shoot:true},[human,false]);
  assert.equal(s.ball.owner,0);
  assert.equal(s.players[0].action,3);
  assert.equal(s.events.filter(e=>e.kind===30&&e.actor===0).length,1);
  assert.equal(s.events.filter(e=>e.kind===3).length,0);
  for(let n=0;n<4;n++)step(s,simulationStep,{},[human,false]);
  assert.equal(s.ball.owner,-1);
  assert.equal(s.events.filter(e=>e.kind===30&&e.actor===0).length,1);
  assert.equal(s.events.filter(e=>e.kind===3&&e.actor===0).length,1);
 }
});
