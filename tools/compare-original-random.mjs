import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {randomByte} from "../src/attributes.js";
if(!process.argv[2])throw new Error("Provide emulator CSV path");
const rows=readFileSync(process.argv[2],"utf8").trim().split(/\r?\n/);
assert.equal(rows.shift(),"seed0,seed1,step,value,state0,state1");assert.equal(rows.length,1536);
const seeds=[[0x31415926,0x53589793],[0,0],[1,0],[0xffffffff,0xffffffff],[0xffff,1],[0xffff0000,0xffff]],mismatches=[];
let s;
for(const [i,row] of rows.entries()){
 const [a,b,step,reference,state0,state1]=row.split(",").map(Number);
 assert.deepEqual([a,b],seeds[Math.floor(i/256)]);assert.equal(step,i%256);
 if(step===0)s={rng:[a,b]};
 const remake=randomByte(s);
 if(remake!==reference||s.rng[0]!==state0||s.rng[1]!==state1)mismatches.push({seed:[a,b],step,reference,remake,expected:[state0,state1],actual:[...s.rng]});
}
console.log(JSON.stringify({compared:rows.length,mismatchCount:mismatches.length,mismatches:mismatches.slice(0,8)},null,2));if(mismatches.length)process.exitCode=1;
