import test from "node:test";
import assert from "node:assert/strict";
import {acceptKeyDown,clearControls} from "./keyboard.js";
import {initial,step} from "./game.js";

test("key repeats cannot revive actions cleared by pause or focus loss",()=>{
 for(const code of ["Space","ShiftLeft","KeyE","KeyW"]){
  const keys=new Set();
  assert.equal(acceptKeyDown(keys,code,false),true);
  assert.equal(acceptKeyDown(keys,code,true),true);
  keys.clear();
  assert.equal(acceptKeyDown(keys,code,true),false);
  assert.equal(keys.size,0);
  assert.equal(acceptKeyDown(keys,code,false),true);
 }
 assert.equal(acceptKeyDown(new Set(["Escape"]),"Escape",true),false);
});

test("pausing training consumes queued fire without starting a throw on resume",()=>{
 const s=initial(),keys=new Set(["Space"]);
 s.controlled[0]=7;s.ball.owner=7;
 const input=()=>({fire:1,shoot:keys.has("Space"),x:0,z:0});
 clearControls(keys,s,0,false,input);
 step(s,.04,input(),[true,true]);
 assert.equal(s.players[7].action,0);
 assert.equal(s.ball.owner,7);
 step(s,.04,{fire:2,shoot:true},[true,true]);
 assert.equal(s.players[7].action,3,"a fresh press still works");
});

test("online focus loss does not mutate authoritative input history",()=>{
 const s=initial(),before=s.previous[0],keys=new Set(["Space"]);
 clearControls(keys,s,0,true,()=>({fire:3}));
 assert.equal(keys.size,0);
 assert.equal(s.previous[0],before);
});

test("focus loss after disconnection accepts the last snapshot without local history",()=>{
 const keys=new Set(["KeyW"]);
 assert.doesNotThrow(()=>clearControls(keys,{},0,false,()=>({fire:1})));
 assert.equal(keys.size,0);
});
