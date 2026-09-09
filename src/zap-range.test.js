import test from "node:test";
import assert from "node:assert/strict";
import {initial} from "./game.js";
import {pickup} from "./features.js";
const unit=22.4/576;
test("Zap uses the inclusive original logical view and preserves excluded carriers",()=>{
 for(const view of [[0,0],[160,484],[320,968]])
 for(const [dx,dy,hit] of [[0,0,true],[320,184,true],[-1,92,false],[321,92,false],[160,-1,false],[160,185,false]]){
  const [x,y]=[view[0]+dx,view[1]+dy];
  const s=initial();s.logicalView=view;
  const p=s.players[16];p.x=(576-y)*unit;p.z=(x-320)*unit;s.ball.owner=16;
  pickup(s,7,12);
  assert.equal(p.health<100,hit,`${x},${y}`);
  assert.equal(s.ball.owner,hit?-1:16);
 }
});
