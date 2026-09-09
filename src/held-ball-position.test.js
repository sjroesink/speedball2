import test from "node:test";
import assert from "node:assert/strict";
import {heldBallOffset} from "./held-ball-position.js";
const unit=22.4/576;
test("held-ball offsets preserve signed source coordinates and ball-size correction",()=>{
 // Sprite 0: offset bytes (25,18), origin (0,0).
 assert.deepEqual(heldBallOffset(0,0),{x:-6*unit,z:13*unit});
 assert.deepEqual(heldBallOffset(0,6),{x:-10*unit,z:17*unit});
 // Throw north: sprite 49 has combined terrain displacement (4,-14) minus 8.
 assert.deepEqual(heldBallOffset(49,0),{x:18*unit,z:0});
 assert.deepEqual(heldBallOffset(49,6),{x:14*unit,z:4*unit});
 assert.throws(()=>heldBallOffset(117,0),RangeError);
 assert.throws(()=>heldBallOffset(-1,0),RangeError);
});
