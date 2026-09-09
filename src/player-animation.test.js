import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AnimationMixer, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { playPlayerAction, startsPlayerAction, runningAnimationDelta, settleRunningPose, syncFallRecovery } from "./player-animation.js";

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
    const elbow = model.scene.getObjectByName("Elbow_1");
    const hand = elbow.children.find(o => o.name.startsWith("Hand"));
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
    const hand = model.scene.getObjectByName("Elbow_1").children.find(o => o.name.startsWith("Hand"));
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

test("tackle and jump clips follow original sustain bands rather than Blender duration", async () => {
  const model = await player(), mixer = new AnimationMixer(model.scene);
  for (const [speed, sustain] of [[100,8],[120,9],[160,10],[200,11],[240,12]]) {
    for (const [kind,name,extra] of [[1,"Slide",0],[2,"Jump",4]]) {
      mixer.stopAllAction();
      const clip=model.animations.find(c=>c.name.includes(name));
      const action=mixer.clipAction(clip),duration=(sustain+extra)/25;
      playPlayerAction(action,kind,duration,speed);
      mixer.update(duration/2);
      assert.ok(Math.abs(action.time/clip.duration-.5)<1e-6);
      assert.ok(action.isRunning());
      mixer.update(duration/2+1e-8);
      assert.equal(action.isRunning(),false);
    }
  }
});

test("fall animation remains active through recovery and seeks late snapshots", async () => {
  const model=await player(),mixer=new AnimationMixer(model.scene);
  const clip=model.animations.find(c=>c.name.includes("Hit")),action=mixer.clipAction(clip);
  playPlayerAction(action,4,26/25);
  mixer.update(18/25);
  assert.ok(action.isRunning(),"player still recovering");
  assert.ok(Math.abs(action.time/clip.duration-18/26)<1e-6);
  playPlayerAction(action,4,5/25);
  assert.ok(Math.abs(action.time/clip.duration-21/26)<1e-6);
  mixer.update(5/25+1e-8);
  assert.equal(action.isRunning(),false);
});

test("a repeated tackle restarts its clip when the idle snapshot was omitted", async () => {
  const model=await player(), mixer=new AnimationMixer(model.scene);
  const clip=model.animations.find(c=>c.name.includes("Slide")), action=mixer.clipAction(clip);
  playPlayerAction(action,1,.04,170);
  mixer.update(.04+1e-8);
  assert.equal(action.isRunning(),false);
  assert.equal(startsPlayerAction(1,1,.04,.36),true);
  playPlayerAction(action,1,.36,170);
  assert.ok(action.isRunning());
  assert.ok(Math.abs(action.time/clip.duration-.1)<1e-6,"new tackle starts near the beginning");
});

test("snapshot repetition, timer rounding and medical holds do not restart clips",()=>{
 for(const kind of [1,2,3,6,7]) {
  assert.equal(startsPlayerAction(kind,kind,.2,.2),false);
  assert.equal(startsPlayerAction(kind,kind,.2,.16),false);
  assert.equal(startsPlayerAction(kind,kind,.2,.21),false);
  assert.equal(startsPlayerAction(kind,kind,.04,.3),true);
 }
 assert.equal(startsPlayerAction(4,4,.04,1,false),false);
 assert.equal(startsPlayerAction(5,5,0,.4),false);
 assert.equal(startsPlayerAction(1,0,.04,0),true);
});

test("exported knees articulate independently and the running cycle closes", async () => {
  for (const team of ["cyan", "orange"]) {
    const model = await player(team), mixer = new AnimationMixer(model.scene);
    const knees = [-1, 1].map(side => model.scene.getObjectByName(`Knee_${side}`));
    assert.ok(knees.every(knee => knee && knee.parent.name.startsWith("Leg_")));
    const clip = model.animations.find(c => c.name === "Run");
    mixer.clipAction(clip).play();
    mixer.setTime(0);
    const initial = knees.map(knee => knee.quaternion.clone());
    mixer.setTime(clip.duration / 4);
    const first = knees.map(knee => knee.quaternion.clone());
    assert.ok(first[0].angleTo(first[1]) > .5, "one knee bends while the other extends");
    mixer.setTime(clip.duration * .75);
    assert.ok(knees.every((knee, i) => knee.quaternion.angleTo(first[1-i]) < .02), "legs exchange swing phase");
    mixer.setTime(clip.duration - 1e-6);
    assert.ok(knees.every((knee, i) => knee.quaternion.angleTo(initial[i]) < .001), "no seam at loop boundary");
  }
});

test("running boot soles remain near level throughout the exported cycle", async () => {
  for (const team of ["cyan", "orange"]) {
    const model=await player(team), mixer=new AnimationMixer(model.scene);
    const clip=model.animations.find(c=>c.name==='Run');mixer.clipAction(clip).play();
    const ankles=[-1,1].map(side=>model.scene.getObjectByName(`Ankle_${side}`));
    assert.ok(ankles.every(ankle=>ankle?.parent.name.startsWith('Knee_')));
    for(let step=0;step<=48;step++) {
      mixer.setTime(clip.duration*step/48);model.scene.updateMatrixWorld(true);
      for(const ankle of ankles) {
        const soleUp=new Vector3(0,1,0).transformDirection(ankle.matrixWorld);
        assert.ok(soleUp.y>.98,`sole pitch remains under 12 degrees: ${soleUp.y}`);
      }
    }
  }
});

test("running stance stays near the floor between authored keys", async () => {
  for (const team of ["cyan", "orange"]) {
    const model=await player(team),mixer=new AnimationMixer(model.scene);
    const clip=model.animations.find(c=>c.name==='Run');mixer.clipAction(clip).play();
    const boots=[];model.scene.traverse(o=>{if(o.isMesh&&o.name.startsWith('Boot'))boots.push(o)});
    assert.equal(boots.length,2);
    const point=new Vector3();
    for(let step=0;step<=96;step++) {
      mixer.setTime(clip.duration*step/96);model.scene.updateMatrixWorld(true);
      let sole=Infinity;
      for(const boot of boots) {
        const vertices=boot.geometry.attributes.position;
        for(let i=0;i<vertices.count;i++) sole=Math.min(sole,point.fromBufferAttribute(vertices,i).applyMatrix4(boot.matrixWorld).y);
      }
      assert.ok(sole>=-.005&&sole<.04,`stance sole stays within floor tolerance: ${sole}`);
    }
  }
});


test("running phase follows distance regardless of frame rate and ignores relocation", () => {
  for(const fps of [30,60,144]) {
    let elapsed=0;
    for(let frame=0;frame<fps;frame++) elapsed+=runningAnimationDelta(2.4/fps,.4);
    assert.ok(Math.abs(elapsed-.8)<1e-10,"2.4 units produce two stride cycles");
  }
  assert.equal(runningAnimationDelta(0,.4),0);
  assert.equal(runningAnimationDelta(25,.4,true),0);
});


test("stopping a run settles the lifted leg without advancing the stride", async () => {
  const model=await player(), mixer=new AnimationMixer(model.scene);
  const knee=model.scene.getObjectByName('Knee_1'),rest=knee.quaternion.clone();
  const action=mixer.clipAction(model.animations.find(c=>c.name==='Run'));
  playPlayerAction(action,5);mixer.update(.12);
  const raised=knee.quaternion.clone(),phase=action.time;
  assert.ok(raised.angleTo(rest)>.2);
  settleRunningPose(action);mixer.update(.06);
  assert.equal(action.time,phase,"the last stride pose is held during settling");
  assert.ok(knee.quaternion.angleTo(rest)<raised.angleTo(rest));
  mixer.update(.061);
  assert.ok(knee.quaternion.angleTo(rest)<1e-5,"rest pose restored after fade");
});


test("fall recovery jumps seek the exported clip and resume a clamped pose", async()=>{
 const model=await player(),mixer=new AnimationMixer(model.scene);
 const clip=model.animations.find(c=>c.name==='Hit'),action=mixer.clipAction(clip);
 action.clampWhenFinished=true;playPlayerAction(action,4,1.04);
 syncFallRecovery(action,.80,.44);mixer.update(0);
 assert.ok(Math.abs(action.time/clip.duration-15/26)<1e-6);
 mixer.update(.9);assert.equal(action.paused,true);
 syncFallRecovery(action,.04,.44);mixer.update(.04);
 assert.ok(action.isRunning());
 assert.ok(Math.abs(action.time/clip.duration-(.6+.04)/1.04)<1e-6);
});
