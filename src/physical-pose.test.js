import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, simulationStep } from "./game.js";
import { advancePhysicalPose, physicalBallOffset } from "./physical-pose.js";
import data from "./physical-pose-data.json" with { type: "json" };
import { readFileSync } from "node:fs";
const unit = 22.4 / 576;
test("physical fall terminator holds the cursor used by subsequent running", () => {
  const p=initial().players[7];
  Object.assign(p,{action:4,actionTime:1/25,fx:1,fz:0});
  advancePhysicalPose(p,7,1,1/25);
  assert.equal(p.physicalFrame,25);
  assert.equal(p.poseCursor,25);
  Object.assign(p,{action:0,actionTime:0,moveX:1});
  advancePhysicalPose(p,7,1,1/25);
  assert.equal(p.physicalFrame,1,"run retains fall cursor modulo eight");
});
test("runtime physical pose data is identical for browser and server", () =>
  assert.deepEqual(
    data,
    JSON.parse(
      readFileSync(
        new URL("../server/physical-pose-data.json", import.meta.url),
      ),
    ),
  ));
test("simulation holds at standing offset and releases from the preceding throw sprite", () => {
  const s = initial();
  for (const p of s.players) p.stun = 100;
  const p = s.players[7];
  Object.assign(p, { x: 0, z: 0, stun: 0, fx: 1, fz: 0 });
  Object.assign(s.ball, { owner: 7, x: 0, z: 0 });
  step(s, simulationStep, {});
  assert.equal(s.ball.x, p.x - 6 * unit);
  assert.equal(s.ball.z, p.z + 13 * unit);
  step(s, simulationStep, { shoot: true });
  assert.equal(p.physicalSprite, 48);
  for (let n = 0; n < 3; n++) step(s, simulationStep, {});
  assert.equal(p.physicalSprite, 49);
  assert.equal(s.ball.owner, 7);
  const before = { x: s.ball.x, z: s.ball.z };
  step(s, simulationStep, {});
  assert.equal(s.ball.owner, -1);
  assert.equal(p.physicalSprite, 50);
  assert.ok(
    Math.abs(s.ball.x - (before.x + s.ball.vx * simulationStep)) < 1e-8,
  );
  assert.equal(s.ball.z, before.z);
});
test("jump landing chooses source tail and held-ball size even after a speed change", () => {
  const p = initial().players[7];
  Object.assign(p, { action: 2, actionTime: 0.48, fx: 1, fz: 0 });
  advancePhysicalPose(p, 7, 1, 0.04);
  assert.equal(p.physicalFrame, 0);
  p.stats[3] = 250;
  p.actionTime = 0.36;
  advancePhysicalPose(p, 7, 1, 0.04);
  assert.equal(p.physicalFrame, 3);
  const high = physicalBallOffset(p, { heldJump: true }),
    normal = physicalBallOffset(p, { heldJump: false });
  assert.ok(Math.abs(high.x - normal.x + 4 * unit) < 1e-8);
  assert.ok(Math.abs(high.z - normal.z - 4 * unit) < 1e-8);
  p.actionTime = 0.08;
  advancePhysicalPose(p, 7, 1, 0.04);
  assert.equal(p.physicalFrame, 18);
  assert.equal(p.physicalSprite, 48);
  assert.deepEqual(
    physicalBallOffset(p, { heldJump: true }),
    physicalBallOffset(p, { heldJump: false }),
  );
});
