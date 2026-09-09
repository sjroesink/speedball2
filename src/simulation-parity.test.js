import {damage} from "./features.js";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createMatch,step } from "./game.js";
test("browser and Go stay aligned through seeded AI and scripted-input matches", () => {
 const r=spawnSync("go",["test","./server","-run","^TestSimulationParityTrace$","-v"],{encoding:"utf8",maxBuffer:32*1024*1024});
 assert.equal(r.status,0,r.stdout+r.stderr);
 const traces=JSON.parse(r.stdout.match(/TRACE:(.+)/)[1]);
 for(let scenario=0;scenario<6;scenario++){
 const rows=traces[scenario],s=createMatch();if(scenario===4){s.restartPhase=0;Object.assign(s.ball,{x:206*22.4/576,z:11.2,h:.25,vx:0,vz:6,owner:-1,lastTouch:7});}if(scenario===5){s.restartPhase=0;s.players[7].health=1;damage(s,16,7);}let sample=0;const seen=new Set();
 for(let tick=0;tick<10000;tick++) {
  const inputs=[0,1].map(team=>{
    const p=s.players[s.controlled[team]];
    let dx=s.ball.x-p.x,dz=s.ball.z-p.z;
    if(scenario!==3 && s.ball.owner===s.controlled[team]){dx=(team===0?1:-1)*(s.period===2?-1:1)*20;dz=-p.z}
    const sign=v=>Math.abs(v)<.05?0:Math.sign(v);
    return {x:sign(dx),z:sign(dz),shoot:scenario!==3 && tick%37<8,tackle:scenario===3?tick%18<5:tick%53===0,lob:scenario!==3 && tick%97<7};
  });
  step(s,.04,inputs[0],[scenario>0,scenario>1],inputs[1]);for(const e of s.events??[])seen.add(e.kind);if(tick%25)continue;
  const row=[tick,s.time,s.period,...s.score,...s.rng,s.ball.x,s.ball.z,s.ball.h,s.ball.owner,s.restartPhase,s.ball.vx,s.ball.vz,s.ball.flightKind??0,s.ball.flightIndex??0,s.ball.speedTimer??0];
  for(const p of s.players)row.push(p.x,p.z,p.health,p.action,p.fx,p.fz,p.gear,...p.stats,
    p.physicalPoseValid?1:0,p.physicalSprite??0,p.physicalFrame??0,p.poseCursor??0,
    p.poseKind??0,p.poseRemaining??0,p.poseDuration??0,p.actionTime,p.fallPosePending?1:0);
  row.push(...s.credits,s.effect.kind,s.effect.time);
  const expected=rows[sample++];
  // Inactive flight indices and held-ball slowdown timers are not consumed.
  for(let j=0;j<row.length;j++) if((j!==15||row[14])&&(j!==16||(row[10]<0&&(row[12]||row[13])))) assert.ok(Math.abs(row[j]-expected[j])<1e-6,`scenario ${scenario} tick ${tick} field ${j}: JS ${row[j]}, Go ${expected[j]}\nJS ${JSON.stringify(row.slice(0,17))}\nGo ${JSON.stringify(expected.slice(0,17))}`);
 }
 assert.equal(s.over,true,`scenario ${scenario} must reach full time`);
 assert.equal(s.period,2);
 for(const kind of (scenario===3?[4,6,11,22,23]:[3,4,6,11,16,22,23])) assert.ok(seen.has(kind),`scenario ${scenario} missing event ${kind}`);
 if(scenario===1)for(const kind of [7])assert.ok(seen.has(kind),`scenario ${scenario} missing goal/medical event ${kind}`);
 if(scenario===5)for(const kind of [14,15])assert.ok(seen.has(kind),`missing medical coverage ${kind}`);
 if(scenario===4)for(const kind of [12])assert.ok(seen.has(kind),`missing warp/medical coverage ${kind}`);
 }
});
