import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "./game.js";
import { featureStep } from "./features.js";
import { ArenaAudio } from "./audio.js";
import { notificationEvent } from "./events.js";
test("each item announces appearance once, and replayed snapshots do not repeat it", () => {
 const s=initial();for(const p of s.players)p.stun=100;
 for(const item of s.pickups)item.wait=.08;
 featureStep(s,.04);assert.equal(s.events?.length??0,0);
 featureStep(s,.04);
 assert.equal(s.events.length,7);
 s.events.forEach((e,i)=>{assert.equal(e.kind,21);assert.equal(e.x,s.pickups[i].x);assert.equal(e.z,s.pickups[i].z)});
 assert.equal(notificationEvent(s,0),null);
 const audio=new ArenaAudio(),heard=[];audio.play=k=>heard.push(k);
 audio.observe(s,true);audio.observe(structuredClone(s),true);
 featureStep(s,.04);audio.observe(s,true);
 assert.equal(heard.filter(k=>k===21).length,7);
});
test("cash limit suppresses appearance audio and held gear remains silent", () => {
 const s=initial();for(const p of s.players)p.stun=100;
 for(const item of s.pickups)item.wait=100;
 s.credits=[2000,2000];s.pickups[2].wait=.04;
 s.pickups[6].kind=0;s.pickups[6].wait=.04;
 featureStep(s,.04);assert.equal(s.events?.length??0,0);
});
