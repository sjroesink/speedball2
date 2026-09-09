import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AnimationMixer } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { playPlayerAction } from "./player-animation.js";

async function player() {
  const bytes = await readFile(new URL("../public/assets/player-cyan.glb", import.meta.url));
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
