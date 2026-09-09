import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {playerPointDistance,playerVerticalOrigin} from "../src/physical-pose.js";
if(!process.argv[2])throw new Error("Provide emulator CSV path");
const rows=readFileSync(process.argv[2],"utf8").trim().split(/\r?\n/);
assert.equal(rows.shift(),"sprite,dx,dz,origin,distance");assert.equal(rows.length,9477);
const deltas=[-64,-32,-16,-1,0,1,16,32,64],mismatches=[];
for(const [i,row] of rows.entries()){
 const [sprite,dx,dz,origin,reference]=row.split(",").map(Number);
 assert.equal(sprite,Math.floor(i/81));assert.equal(dx,deltas[Math.floor(i%81/9)]);assert.equal(dz,deltas[i%9]);
 const p={x:0,z:0,physicalSprite:sprite};
 assert.equal(playerVerticalOrigin(p),origin);
 const remake=playerPointDistance(p,dx*22.4/576,dz*22.4/576);
 if(remake!==reference)mismatches.push({sprite,dx,dz,origin,reference,remake});
}
console.log(JSON.stringify({compared:rows.length,mismatches},null,2));if(mismatches.length)process.exitCode=1;
