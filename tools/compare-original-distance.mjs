import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {referenceDistance} from "../src/attributes.js";
if(!process.argv[2])throw new Error("Usage: node tools/compare-original-distance.mjs <emulator-output.csv>");
const rows=readFileSync(process.argv[2],"utf8").trim().split(/\r?\n/);
assert.equal(rows.shift(),"dx,dz,distance,instructions");
assert.equal(rows.length,6400);
const values=[...Array(65).keys(),96,100,127,128,160,192,255,256,320,512,576,640,1024,1120,1152];
const mismatches=[];
for(const [i,row] of rows.entries()){
 const [dx,dz,reference,count]=row.split(",").map(Number);
 assert.equal(dx,values[Math.floor(i/80)]);assert.equal(dz,values[i%80]);
 assert.ok(count>0&&count<=32);assert.ok(Number.isInteger(reference));
 const remake=referenceDistance(dx*22.4/576,dz*22.4/576);
 if(remake!==reference)mismatches.push({dx,dz,reference,remake});
}
console.log(JSON.stringify({compared:rows.length,mismatches},null,2));
if(mismatches.length)process.exitCode=1;
