import test from "node:test";
import assert from "node:assert/strict";
import {initial} from "./game.js";
import {pickup,damage} from "./features.js";
import {restorePower} from "./attributes.js";

test("equipment acquired during a power restores its underlying attribute across expiry and impact",()=>{
 for(const kind of [3,4,5,6]) for(let gear=14;gear<=21;gear++)
  for(const expireFirst of [false,true]) {
   const s=initial(),p=s.players[7],attribute=gear-14;
   p.stats.fill(173);
   pickup(s,kind===3||kind===6?16:7,kind);
   const powered=kind!==6||attribute===3;
   const powerValue=kind===3||kind===6?100:250;
   pickup(s,7,gear);
   assert.equal(p.stats[attribute],250);
   if(expireFirst) restorePower(s);
   assert.equal(p.stats[attribute],250,"expiry retains held equipment");
   assert.equal(damage(s,16,7),true);
   assert.equal(p.gear,0);
   assert.equal(p.stats[attribute],!expireFirst&&powered?powerValue:173,
    `${kind}/${gear}/${expireFirst}: impact restores the pre-equipment layer`);
   restorePower(s);
   assert.equal(p.stats[attribute],173,"expiry restores the original underlying value");
   assert.equal(p.statBackup[attribute],0);
  }
});
