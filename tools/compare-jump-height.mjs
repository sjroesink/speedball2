import { initial, step, jumpHeight } from '../src/game.js';
// Reproduce a mid-jump stat update without advancing time. A real boost or
// equipment pickup can change the same attribute while an action is running.
const s=initial();
for(const p of s.players)Object.assign(p,{x:20,z:10,stun:100});
const p=s.players[7];Object.assign(p,{x:0,z:0,stun:0});
Object.assign(s.ball,{x:1,z:0,h:4,owner:-1});
step(s,.04,{shoot:true});
for(let n=0;n<3;n++)step(s,.04,{});
const before={height:jumpHeight(p),remaining:p.actionTime,speed:p.stats[3],capturedPoseDuration:p.poseDuration};
p.stats[3]=250;
const after={height:jumpHeight(p),remaining:p.actionTime,speed:p.stats[3],capturedPoseDuration:p.poseDuration};
console.log(JSON.stringify({before,after,instantHeightChange:after.height-before.height},null,2));
