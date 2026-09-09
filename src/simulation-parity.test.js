import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createMatch,step } from "./game.js";
test("browser and Go stay aligned through an extended seeded AI match", () => {
 const r=spawnSync("go",["test","./server","-run","^TestSimulationParityTrace$","-v"],{encoding:"utf8",maxBuffer:8*1024*1024});
 assert.equal(r.status,0,r.stdout+r.stderr);
 const rows=JSON.parse(r.stdout.match(/TRACE:(.+)/)[1]),s=createMatch();let sample=0;
 for(let tick=0;tick<5000;tick++) {
  step(s,.04,{},[false,false]);if(tick%25)continue;
  const row=[tick,s.time,s.period,...s.score,...s.rng,s.ball.x,s.ball.z,s.ball.h,s.ball.owner,s.restartPhase,s.ball.vx,s.ball.vz,s.ball.flightKind??0,s.ball.flightIndex??0,s.ball.speedTimer??0];
  for(const p of s.players)row.push(p.x,p.z,p.health,p.action,p.fx,p.fz);
  const expected=rows[sample++];
  // Inactive flight indices and held-ball slowdown timers are not consumed.
  for(let j=0;j<row.length;j++) if((j!==15||row[14])&&(j!==16||row[10]<0)) assert.ok(Math.abs(row[j]-expected[j])<1e-6,`tick ${tick} field ${j}: JS ${row[j]}, Go ${expected[j]}\nJS ${JSON.stringify(row.slice(0,17))}\nGo ${JSON.stringify(expected.slice(0,17))}`);
 }
});
