import test from "node:test";
import assert from "node:assert/strict";
import {stepReferenceAnimation as advance} from "./reference-animation.js";
import {heldBallOffset} from "./held-ball-position.js";

test("running cycles eight words and standing loops one word",()=>{
 let index=0;const sprites=[];
 for(let n=0;n<16;n++){const result=advance("anims_move_player_n",index);sprites.push(result.sprite);index=result.index;}
 assert.deepEqual(sprites,[16,16,17,17,18,18,19,19,16,16,17,17,18,18,19,19]);
 assert.deepEqual(advance("anim_standing_player_n",0),{sprite:0,index:0,control:"loop"});
});
test("release callback at index four retains the preceding carried pose",()=>{
 let index=0,offset;
 for(let tick=0;tick<4;tick++){const result=advance("anims_throwing_player_n",index);index=result.index;offset=heldBallOffset(result.sprite,0);}
 assert.equal(index,4);
 assert.deepEqual(offset,{x:18*(22.4/576),z:0});
 assert.equal(advance("anims_throwing_player_n",index).sprite,50);
 assert.deepEqual(advance("anims_throwing_player_n",7),{sprite:49,index:8,control:"finish-action"});
 assert.throws(()=>advance("anims_throwing_player_n",8),RangeError);
});
test("a mid-jump catch inherits the player index and landing seeks both to eighteen",()=>{
 assert.equal(advance("anims_jumping_player_n",7).sprite,73);
 assert.equal(advance("anim_ball_being_caught",7).sprite,6);
 assert.equal(advance("anims_jumping_player_n",18).sprite,48);
 assert.equal(advance("anim_ball_being_caught",18).sprite,0);
 assert.deepEqual(advance("anim_ball_being_caught",19),{sprite:0,index:19,control:"hold"});
 assert.throws(()=>advance("anim_ball_being_caught",20),RangeError);
});

test("hide and fall-completion opcodes are returned without reading them as frames",()=>{
 assert.deepEqual(advance("anim_big_ball",10),{sprite:4,index:0,control:"hide"});
 const fall=advance("anim_tackled",25);
 assert.equal(fall.control,"finish-fall");assert.equal(fall.index,25);assert.ok(fall.sprite>=0);
});

test("ordinary fall encounters its first completion at twenty-six frames",()=>{
 let index=0,count=0,result;
 do{result=advance("anim_tackled",index);index=result.index;count++;}while(result.control===null);
 assert.equal(count,26);assert.equal(result.control,"finish-fall");
});
