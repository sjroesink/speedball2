import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

// Independent numeric results from original machine-code execution, not host parity.
for(const [routine,count] of [["sustain",151],["distance",6400],["point-distance",9477],["tackle",4096]]) {
 test(`original ${routine} emulator measurements match the browser simulation`,()=>{
  const script=fileURLToPath(new URL(`../tools/compare-original-${routine}.mjs`,import.meta.url));
  const data=fileURLToPath(new URL(`../docs/original-${routine}.csv`,import.meta.url));
  const result=JSON.parse(execFileSync(process.execPath,[script,data],{encoding:"utf8"}));
  assert.equal(result.compared,count);assert.deepEqual(result.mismatches,[]);
 });
}
