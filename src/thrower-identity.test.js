import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,catchBall,step} from './game.js';

test('catch preserves the last thrower until the catcher begins a new windup',()=>{
 for(const team of [0,1]) {
  const s=initial(), catcher=team*9+7, thrower=(1-team)*9+7;
  for(const p of s.players) Object.assign(p,{x:20,z:10,stun:100});
  Object.assign(s.players[catcher],{x:0,z:0,stun:0});
  s.controlled[team]=catcher;
  Object.assign(s.ball,{x:.1,z:0,h:.75,vx:1,owner:-1,lastTouch:thrower});
  catchBall(s,catcher);
  assert.equal(s.ball.owner,catcher);
  assert.equal(s.ball.lastTouch,thrower);
  for(let n=0;n<5 && s.players[catcher].action!==3;n++)
   step(s,.04,team===0?{shoot:true}:{},[true,true],team===1?{shoot:true}:{});
  assert.equal(s.players[catcher].action,3);
  assert.equal(s.ball.owner,catcher,'identity changes before release');
  assert.equal(s.ball.lastTouch,catcher);
 }
});
