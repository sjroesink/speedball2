import test from "node:test";
import assert from "node:assert/strict";
import {initial,step} from "./game.js";
import {velocityUnit} from "./attributes.js";
const unit=22.4/576;
test("high and low balls use original wall insets on all four walls",()=>{
 for(const axis of ["x","z"])for(const sign of [-1,1])for(const high of [false,true])for(const beyond of [false,true]){
  const s=initial();for(const p of s.players)p.stun=100;
  const center=axis==="x"?576:320;
  const boundary=(center-(high?24:32))*unit;
  Object.assign(s.ball,{owner:-1,lastTouch:-1,x:0,z:4,h:high?1.75:.75,flightKind:2,flightStage:high?3:1,flightIndex:high?8:0,flightFraction:0,vx:0,vz:0,speedTimer:100,nextSlowdown:0});
  s.ball[axis]=sign*(center-(beyond?20:28))*unit;
  s.ball["v"+axis]=sign*8*velocityUnit;
  const before=s.ball[axis];step(s,.04,{},[true,true]);
  const reflected=!high||beyond;
  assert.equal(Math.sign(s.ball["v"+axis]),reflected?-sign:sign,`${axis} high=${high} beyond=${beyond}`);
  if(reflected)assert.equal(s.event.kind,axis==="z"?(high?26:5):(high?28:27));
  const expected=(reflected?sign*boundary:before)+s.ball["v"+axis]*.04;
  assert.ok(Math.abs(s.ball[axis]-expected)<1e-8);
 }
});

test("wall and goal decisions use this tick's rising or falling flight stage",()=>{
 for(const rising of [false,true])for(const axis of ["x","z"])for(const sign of [-1,1]){
  const s=initial();for(const p of s.players)p.stun=100;
  const center=axis==="x"?576:320;
  Object.assign(s.ball,{owner:-1,lastTouch:-1,x:0,z:0,h:rising?1.25:1.75,flightKind:2,flightStage:rising?2:3,flightIndex:rising?4:41,flightFraction:0,vx:0,vz:0,speedTimer:100,nextSlowdown:0});
  s.ball[axis]=sign*(center-28)*unit;s.ball["v"+axis]=sign*8*velocityUnit;
  step(s,.04,{},[true,true]);
  if(axis==="x"&&!rising)assert.equal(s.score[sign>0?0:1],10,"descending ball can score immediately");
  else {
   assert.deepEqual(s.score,[0,0]);
   assert.equal(s.ball.flightStage,rising?3:2);
   assert.equal(Math.sign(s.ball["v"+axis]),rising?sign:-sign);
  }
 }
});
