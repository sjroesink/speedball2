import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {actionSustain} from "../src/attributes.js";
const path=process.argv[2];
if(!path)throw new Error("Usage: node tools/compare-original-sustain.mjs <emulator-output.csv>");
const lines=readFileSync(path,"utf8").trim().split(/\r?\n/);
assert.equal(lines.shift(),"speed,sustain,instructions");
assert.equal(lines.length,151,"Reference must include the full valid attribute range");
const mismatches=[];
for(const [i,line] of lines.entries()) {
 const [speed,reference,instructions]=line.split(",").map(Number);
 assert.equal(speed,100+i);assert.equal(instructions,7);
 const remake=actionSustain(speed);
 if(remake!==reference)mismatches.push({speed,reference,remake});
}
console.log(JSON.stringify({compared:lines.length,mismatches},null,2));
if(mismatches.length)process.exitCode=1;
