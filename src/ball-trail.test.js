import test from 'node:test';
import assert from 'node:assert/strict';
import {BallTrail} from './ball-trail.js';
test('ball trail covers the same travel at 30, 60 and 144 FPS',()=>{
 const results=[30,60,144].map(fps=>{
  const trail=new BallTrail();trail.update({x:0,y:1,z:0},0,true);
  for(let n=1;n<=fps;n++)trail.update({x:8*n/fps,y:1,z:4*n/fps},1/fps,true);
  return trail.points;
 });
 for(const points of results){assert.equal(points.length,10);points.forEach((p,i)=>{
  assert.ok(Math.abs(p.x-8*(1-i/60))<1e-8);
  assert.ok(Math.abs(p.z-4*(1-i/60))<1e-8);
 })}
});
test('ball trail clears for possession, warps and suspended frames',()=>{
 const t=new BallTrail();t.update({x:0,y:1,z:0},0,true);
 t.update({x:1,y:1,z:0},.04,true);assert.ok(t.points.length>1);
 assert.equal(t.update({x:1,y:1,z:0},.04,false).length,0);
 t.update({x:1,y:1,z:0},.04,true);
 assert.equal(t.update({x:20,y:1,z:0},.04,true).length,1);
 assert.equal(t.update({x:21,y:1,z:0},1,true).length,1);
 const before=structuredClone(t.points);t.update({x:21,y:1,z:0},0,true);
 assert.deepEqual(t.points,before);
});
