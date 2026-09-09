import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,step} from './game.js';
function fixture(team, action, owner=true) {
 const s=initial();
 for(const p of s.players) Object.assign(p,{x:20,z:10,stun:100});
 const i=team*9+7,p=s.players[i];
 Object.assign(p,{x:0,z:0,stun:0,action,actionTime:action===6?3/25:4/25,fx:1,fz:0});
 Object.assign(s.ball,{x:1,z:0,h:4,owner:owner?i:-1});
 return {s,p};
}
function tick(s,team,shoot) {step(s,.04,team===0?{shoot}:{},[true,true],team===1?{shoot}:{});}
test('held fire during a catch starts a throw when the catch completes',()=>{
 for(const team of [0,1]) {
  const {s,p}=fixture(team,6); const windups=new Set();
  for(let n=0;n<8;n++){tick(s,team,true);for(const e of s.events??[]) if(e.kind===30)windups.add(e.id);}
  assert.equal(windups.size,1); assert.equal(s.ball.owner,-1); assert.equal(s.ball.flightKind,2);
  assert.equal(s.pendingShoot[team],false);
 }
});
test('releasing fire during a catch cancels the pending throw',()=>{
 for(const team of [0,1]) {
  const {s}=fixture(team,6); tick(s,team,true);
  for(let n=0;n<8;n++)tick(s,team,false);
  assert.equal(s.ball.owner,team*9+7); assert.equal(s.players[team*9+7].throwMode??0,0);
 }
});
test('a consumed stationary punch does not repeat while fire stays held',()=>{
 for(const team of [0,1]) {
  const {s,p}=fixture(team,0,false); p.actionTime=0;
  // Keep the loose ball beyond catch range but close enough to select this player.
  s.ball.h=.25; s.ball.x=2;
  const punches=new Set();
  for(let n=0;n<12;n++){tick(s,team,true);for(const e of s.events??[]) if(e.kind===20)punches.add(e.id);}
  assert.equal(punches.size,1);
  tick(s,team,false); tick(s,team,true);
  assert.ok((s.events??[]).some(e=>e.kind===20 && !punches.has(e.id)));
 }
});
