import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AnimationMixer, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { playPlayerAction } from "./player-animation.js";

async function player(team = "cyan") {
  const bytes = await readFile(new URL(`../public/assets/player-${team}.glb`, import.meta.url));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
}

test("Blender throw completes within eight reference ticks at 30, 60 and 144 FPS", async () => {
  for (const fps of [30, 60, 144]) {
    const model = await player();
    const mixer = new AnimationMixer(model.scene);
    const clip = model.animations.find(c => c.name.includes("Throw"));
    assert.ok(clip.duration > .32, "asset retains its authored timeline");
    const action = mixer.clipAction(clip);
    playPlayerAction(action, 3, .32);
    let elapsed = 0;
    while (elapsed < .16 - 1e-9) {
      const dt = Math.min(1/fps, .16-elapsed); mixer.update(dt); elapsed += dt;
    }
    assert.ok(Math.abs(action.time/clip.duration - .5) < 1e-6, "release is halfway through clip");
    mixer.update(.16 + 1e-8);
    assert.equal(action.isRunning(), false, "throw finishes before action changes");
  }
});

test("a late throw snapshot begins at recovery instead of restarting wind-up", async () => {
  const model = await player(), mixer = new AnimationMixer(model.scene);
  const clip = model.animations.find(c => c.name.includes("Throw"));
  const action = mixer.clipAction(clip);
  playPlayerAction(action, 3, .12);
  assert.ok(Math.abs(action.time/clip.duration - .625) < 1e-6);
  mixer.update(.12 + 1e-8);
  assert.equal(action.isRunning(), false);
});

test("both Blender team models extend the throwing hand forward at release", async () => {
  for (const team of ["cyan", "orange"]) {
    const model = await player(team), mixer = new AnimationMixer(model.scene);
    const action = mixer.clipAction(model.animations.find(c => c.name.includes("Throw")));
    playPlayerAction(action, 3, .16);
    mixer.update(0);
    model.scene.updateMatrixWorld(true);
    const arm = model.scene.getObjectByName("Arm_1");
    const hand = arm.children.find(o => o.name.startsWith("Hand"));
    assert.ok(hand, "Blender throwing hand is present");
    const position = hand.getWorldPosition(new Vector3());
    assert.ok(position.z > .7, "hand extends toward the model's front");
    assert.ok(position.y > 1.2, "hand stays at chest level for release");
  }
});

test("Blender ball grip stays next to the hand through wind-up and release", async () => {
  for (const team of ["cyan", "orange"]) {
    const model = await player(team), mixer = new AnimationMixer(model.scene);
    const action = mixer.clipAction(model.animations.find(c => c.name.includes("Throw")));
    const grip = model.scene.getObjectByName("BallGrip");
    const hand = model.scene.getObjectByName("Arm_1").children.find(o => o.name.startsWith("Hand"));
    assert.ok(grip, "export includes the authored grip");
    for (const remaining of [.32, .28, .24, .20, .16]) {
      playPlayerAction(action, 3, remaining); mixer.update(0);
      model.scene.updateMatrixWorld(true);
      const point = grip.getWorldPosition(new Vector3());
      const palm = hand.getWorldPosition(new Vector3());
      assert.ok(Math.abs(point.distanceTo(palm) - .33) < 1e-5);
      assert.ok(point.y > .25, "held ball clears the floor");
    }
  }
});
