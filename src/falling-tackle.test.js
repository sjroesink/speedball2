import test from "node:test";
import assert from "node:assert/strict";
import {initial,step} from "./game.js";
import {velocityUnit} from "./attributes.js";
function encounter(action, resolved=false) {
 const s=initial();for(const p of s.players)p.stun=100;
 Object.assign(s.players[16],{x:.5,z:0,fx:1,fz:0,stun:0,action:1,actionTime:.3});
 Object.assign(s.players[7],{x:0,z:0,fx:1,fz:0,stun:0,action,actionTime:.3,tackleResolved:resolved});
 Object.assign(s.ball,{owner:7,lastTouch:7,x:0,z:0,h:1,vx:0,vz:0,vh:0});s.rng=[0,0];
 return s;
}
test("unresolved slides and punches survive being hit and knock possession loose",()=>{
 for(const action of [1,7]) {
  const s=encounter(action);
  step(s,.04,{},[true,true],{});
  assert.deepEqual(s.events.filter(e=>e.kind===4).map(e=>[e.actor,e.target]),[[16,7],[7,16]]);
  assert.equal(s.ball.owner,-1);
  assert.equal(s.ball.lastTouch,7);
  assert.equal(s.ball.vx,0);assert.equal(s.ball.vz,0);
  assert.equal(s.ball.x,0);assert.ok(s.ball.vh<=0);
  assert.equal(s.players[16].fx,-1);
  assert.equal(s.players[16].fallX,-(action===1?4:3)*velocityUnit);
  assert.deepEqual(s.events.filter(e=>e.kind===24||e.kind===25).map(e=>e.actor),[16]);
  const id=s.event.id;step(s,.04,{},[true,true],{});assert.equal(s.event.id,id);
 }
});
test("ordinary falls and attacks whose contact was already resolved cannot counter",()=>{
 for(const [action,resolved] of [[0,false],[2,false],[3,false],[6,false],[1,true],[7,true]]) {
  const s=encounter(action,resolved);step(s,.04,{},[true,true],{});
  assert.equal(s.players[7].fallAttack,0);
  assert.equal(s.players[16].stun,0);
  assert.equal(s.ball.owner,16);
 }
});

function recovering(attack=1,finishing=false,remaining=1.04) {
 const s=initial();for(const p of s.players){p.stun=100;p.x=20;p.z=10}
 Object.assign(s.players[7],{x:0,z:0,stun:remaining,action:4,actionTime:remaining,fallAttack:attack,fallAttackTime:.32,fallFinishing:finishing});
 return s;
}
test('retained slide and completed punch enter the eleven-tick recovery tail',()=>{
 for(const [attack,finishing] of [[1,false],[7,true]]) {
  const s=recovering(attack,finishing),p=s.players[7];
  for(let i=0;i<6;i++)step(s,.04,{},[true,true],{});
  assert.ok(p.actionTime>.44);step(s,.04,{},[true,true],{});
  assert.ok(Math.abs(p.actionTime-.44)<1e-9);assert.equal(p.fallAttack,0);
  for(let i=0;i<11;i++)step(s,.04,{},[true,true],{});
  assert.equal(p.stun,0);assert.notEqual(p.action,4);
 }
});
test('an unresolved punch fall runs normally while a late completed contact extends recovery',()=>{
 const ordinary=recovering(7),p=ordinary.players[7];
 for(let i=0;i<8;i++)step(ordinary,.04,{},[true,true],{});
 assert.ok(Math.abs(p.actionTime-.72)<1e-9);
 const late=recovering(7,true,.16),q=late.players[7];q.fallAttackTime=0;
 step(late,.04,{},[true,true],{});assert.ok(Math.abs(q.actionTime-.44)<1e-9);
});

test('a tackle steal preserves electric state and last thrower',()=>{
 const s=encounter(0);
 Object.assign(s.ball,{charged:true,electric:3,electricBudget:3});
 step(s,.04,{},[true,true],{});
 assert.equal(s.ball.owner,16);
 assert.equal(s.ball.lastTouch,7);
 assert.equal(s.ball.charged,true);
 assert.equal(s.ball.electric,3);
 assert.equal(s.ball.electricBudget,3);
});
