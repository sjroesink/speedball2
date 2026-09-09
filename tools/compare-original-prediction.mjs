import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {predictedTarget} from "../src/steering.js";
const lines=readFileSync(process.argv[2],"utf8").trim().split(/\r?\n/);
assert.equal(lines.shift(),"intelligence,x,y,dx,dy,targetX,targetY");
assert.equal(lines.length,8575);
const unit=22.4/576,mismatches=[];
let compared=0,mismatchCount=0;
for(const intelligence of [100,149,150,199,200,249,250])
 for(const x of [32,33,64,320,576,607,608])
  for(const y of [32,33,64,576,1088,1119,1120])
   for(const dx of [-8,-1,0,1,8])for(const dy of [-8,-1,0,1,8]){
    const row=lines[compared++].split(",").map(Number);
    assert.ok(row.length===7&&row.every(Number.isInteger));
    assert.deepEqual(row.slice(0,5),[intelligence,x,y,dx,dy]);
    const [a,b]=predictedTarget((576-y)*unit,(x-320)*unit,-dy*unit*25,dx*unit*25,intelligence);
    const actual=[Math.round(b/unit+320),Math.round(576-a/unit)];
    if(actual[0]!==row[5]||actual[1]!==row[6]){
     mismatchCount++;if(mismatches.length<8)mismatches.push({row,actual});
    }
   }
console.log(JSON.stringify({compared,mismatchCount,mismatches}));
if(mismatchCount)process.exitCode=1;
