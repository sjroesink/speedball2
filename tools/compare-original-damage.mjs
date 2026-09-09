import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {initial} from "../src/game.js";
import {damage} from "../src/features.js";
if(!process.argv[2])throw new Error("Provide emulator CSV path");
const rows=readFileSync(process.argv[2],"utf8").trim().split(/\r?\n/);
assert.equal(rows.shift(),"power,stamina,energy,base,remaining,agr,att,def,spd,thr,pow,sta,int");assert.equal(rows.length,1536);
const stats=[100,140,170,200,204,205,249,250],energies=[1,8,16,64,127,128],bases=[100,101,173,250],mismatches=[];
for(const [i,row] of rows.entries()){
 const [power,stamina,energy,base,remaining,...attributes]=row.split(",").map(Number);
 assert.deepEqual([power,stamina,energy,base],[stats[Math.floor(i/192)],stats[Math.floor(i/24)%8],energies[Math.floor(i/4)%6],bases[i%4]]);
 const s=initial(),p=s.players[7],q=s.players[16];p.stats[5]=power;q.stats.fill(base);q.stats[6]=stamina;q.health=energy*100/128;
 assert.equal(damage(s,7,16),true);
 if(Math.abs(q.health-remaining*100/128)>1e-9||q.stats.some((v,a)=>v!==attributes[a]))mismatches.push({power,stamina,energy,base,remaining,attributes,health:q.health,stats:q.stats});
}
console.log(JSON.stringify({compared:rows.length,mismatches},null,2));if(mismatches.length)process.exitCode=1;
