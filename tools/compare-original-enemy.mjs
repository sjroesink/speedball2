import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {initial} from "../src/game.js";
import {aggressionTarget} from "../src/support.js";
import {predictedTarget} from "../src/steering.js";
const lines=readFileSync(process.argv[2],"utf8").trim().split(/\r?\n/);
assert.equal(lines.shift(),"team,intelligence,distance,flags,x,dx,selected");
assert.equal(lines.length,1080);
const unit=22.4/576,mismatches=[];let compared=0,mismatchCount=0;
for(let team=0;team<2;team++)for(const intelligence of [100,200,250])
 for(const distance of [0,199,200,499,500])for(const flags of [0,16,64,80])
  for(const x of [212,213,214])for(const dx of [-1,0,1]){
   const row=lines[compared++].split(",").map(Number);
   assert.deepEqual(row.slice(0,6),[team,intelligence,distance,flags,x,dx]);
   assert.ok(row.length===7&&row.every(Number.isInteger)&&row[6]>=-1&&row[6]<9);
   const s=initial(),i=team*9+3,base=(1-team)*9;
   s.period=team===0?1:2;s.logicalView=[0,484];
   Object.assign(s.players[i],{x:0,z:(120-320)*unit});s.players[i].stats[7]=intelligence;
   const distances=Array(18).fill(999);
   for(let j=0;j<9;j++)Object.assign(s.players[base+j],{
    x:(576-(j===0&&(flags&64)?450:576))*unit,z:((j===0?x:180)-320)*unit,
    moveX:0,moveZ:j===0?dx*unit*25:0,stun:j===0?(flags&16?1:0):j===1?0:1
   });
   distances[base]=distance;distances[base+1]=199;
   const actual=aggressionTarget(s,i,distances,0);
   const p=s.players[base+row[6]];
   const expected=row[6]<0?null:predictedTarget(p.x,p.z,p.moveX,p.moveZ,intelligence);
   if(JSON.stringify(actual)!==JSON.stringify(expected)){
    mismatchCount++;if(mismatches.length<8)mismatches.push({row,actual,expected});
   }
  }
console.log(JSON.stringify({compared,mismatchCount,mismatches}));
if(mismatchCount)process.exitCode=1;
