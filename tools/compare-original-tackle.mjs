import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {tackleThreshold} from "../src/attributes.js";
if(!process.argv[2])throw new Error("Provide emulator CSV path");
const rows=readFileSync(process.argv[2],"utf8").trim().split(/\r?\n/);
assert.equal(rows.shift(),"attack,defense,angle,slide,jump,keeper,threshold");assert.equal(rows.length,4096);
const stats=[100,140,170,200,204,205,249,250],mismatches=[];
for(const [i,row] of rows.entries()){
 const [attack,defense,angle,slide,jump,keeper,reference]=row.split(",").map(Number);
 assert.deepEqual([attack,defense,angle,slide,jump,keeper],[stats[Math.floor(i/512)],stats[Math.floor(i/64)%8],Math.floor(i/8)%8,i&1,(i>>1)&1,(i>>2)&1]);
 const p={stats:Array(8).fill(100),fx:1,fz:0,action:slide?1:7};p.stats[1]=attack;
 const q={stats:Array(8).fill(100),fx:Math.round(Math.cos(angle*Math.PI/4)),fz:Math.round(Math.sin(angle*Math.PI/4)),action:jump?2:0,jumping:!!jump};q.stats[2]=defense;
 const remake=tackleThreshold(p,q,!!keeper);
 if(remake!==reference)mismatches.push({attack,defense,angle,slide,jump,keeper,reference,remake});
}
console.log(JSON.stringify({compared:rows.length,mismatches},null,2));if(mismatches.length)process.exitCode=1;
