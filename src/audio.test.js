import { test } from "node:test";
import assert from "node:assert/strict";
import { ArenaAudio, cues, eventPan } from "./audio.js";

test("audio consumes repeated/out-of-order snapshots once and resets between matches", () => {
  const audio = new ArenaAudio();
  const heard = [];
  audio.play = (...args) => heard.push(args);
  const s = { over: false, event: { id: 1, kind: 12, z: 11.2 } };
  audio.observe(s, true);
  audio.observe(s, true);
  audio.observe({ ...s, event: { id: 0, kind: 4, z: 0 } }, true);
  assert.deepEqual(heard, [["kickoff"], [12, 0.8]]);
  s.over = true;
  audio.observe(s, false);
  audio.observe(s, false);
  assert.equal(heard.filter(([kind]) => kind === "fulltime").length, 1);
  audio.reset();
  s.over = false;
  audio.observe(s, true);
  assert.equal(heard.filter(([kind]) => kind === 12).length, 2);
});

function context() {
  const scheduled = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
    setTargetAtTime(value) { this.value = value; },
  });
  const node = () => ({
    connect() {},
    disconnect() {},
    gain: param(),
    pan: param(),
    frequency: param(),
    Q: param(),
  });
  const source = () => {
    const s = {
      ...node(),
      start(t) {
        scheduled.push(["start", t]);
      },
      stop(t) {
        scheduled.push(["stop", t]);
      },
    };
    return s;
  };
  return {
    scheduled,
    state: "suspended",
    currentTime: 10,
    sampleRate: 100,
    destination: {},
    async resume() {
      this.state = "running";
    },
    createGain: node,
    createDynamicsCompressor: node,
    createStereoPanner: node,
    createBiquadFilter: node,
    createOscillator: source,
    createBufferSource: source,
    createBuffer: () => ({ getChannelData: () => new Float32Array(200) }),
  };
}

test("volume can be set before unlocking, survives mute and silences active voices at zero", async () => {
  const c=context(), a=new ArenaAudio(()=>c);
  a.setVolume(.3);
  assert.equal(a.context,undefined,"adjusting level does not unlock autoplay");
  await a.enable(true);a.setActive(true);
  assert.equal(a.master.gain.value,.3);
  a.play(7);assert.ok(a.voices.size>0);
  a.setVolume(0);assert.equal(a.voices.size,0);
  a.play(7);assert.equal(a.voices.size,0);
  a.setVolume(.4);await a.enable(false);await a.enable(true);
  assert.equal(a.volume,.4);assert.equal(a.master.gain.value,.4);
  assert.equal(a.setVolume(NaN),.4);
  assert.equal(a.setVolume(2),1);assert.equal(a.setVolume(-1),0);
});

test("gesture unlock, mute, pause and polyphony bound all scheduled voices", async () => {
  const c = context();
  const audio = new ArenaAudio(() => c);
  audio.setActive(true);
  audio.play(4);
  assert.equal(c.scheduled.length, 0);
  assert.equal(await audio.enable(true), true);
  assert.equal(c.state, "running");
  for (let i = 0; i < 30; i++) audio.play(4);
  assert.equal(audio.voices.size, 32);
  audio.setActive(false);
  assert.equal(audio.voices.size, 0);
  const count = c.scheduled.length;
  audio.play(7);
  assert.equal(c.scheduled.length, count);
  audio.setActive(true);
  audio.play(7);
  assert.ok(audio.voices.size > 0);
  await audio.enable(false);
  assert.equal(audio.voices.size, 0);
  assert.equal(audio.enabled, false);
});

test("every game event has a finite bounded cue and unavailable audio fails silently", async () => {
  for (let kind = 1; kind <= 28; kind++) {
    assert.ok(cues[kind]?.length);
    for (const [, from, to, duration, gain, delay] of cues[kind]) {
      assert.ok(from > 0 && to > 0 && duration > 0 && duration <= 2);
      assert.ok(gain > 0 && gain <= 0.3 && delay >= 0);
    }
  }
  const audio = new ArenaAudio(() => {
    throw Error("Unavailable");
  });
  assert.equal(await audio.enable(true), false);
  assert.equal(audio.enabled, false);
});

test("action stereo follows the camera while match announcements remain centered", () => {
  const u = 22.4 / 576;
  for (const viewX of [0, 160, 320]) {
    const s = { logicalView: [viewX, 484] },
      center = (viewX - 160) * u;
    assert.equal(eventPan(s, { kind: 4, z: center }), 0);
    assert.ok(
      Math.abs(eventPan(s, { kind: 4, z: center + 80 * u }) - 0.5) < 1e-12,
    );
    assert.ok(
      Math.abs(eventPan(s, { kind: 4, z: center - 80 * u }) + 0.5) < 1e-12,
    );
    assert.equal(eventPan(s, { kind: 4, z: center + 320 * u }), 0.8);
    assert.equal(eventPan(s, { kind: 4, z: center - 320 * u }), -0.8);
    for (const kind of [6, 7, 14, 15])
      assert.equal(eventPan(s, { kind, z: 11.2 }), 0);
  }
});

test("restart whistle waits for the goal/half pause to end and is not replayed on repeated snapshots", () => {
  const a = new ArenaAudio(),
    heard = [];
  a.play = (kind) => heard.push(kind);
  const s = { over: false, pause: 3 };
  a.observe(s, true);
  a.observe(s, true);
  assert.deepEqual(heard, []);
  s.pause = 0;
  a.observe(s, true);
  a.observe(s, true);
  assert.deepEqual(heard, ["kickoff"]);
  s.pause = 1.4;
  a.observe(s, true);
  s.pause = 0;
  a.observe(s, true);
  a.observe(s, true);
  assert.deepEqual(heard, ["kickoff", "kickoff"]);
  s.pause = 3;
  a.observe(s, true);
  s.over = true;
  s.pause = 0;
  a.observe(s, false);
  a.observe(s, false);
  assert.deepEqual(heard, ["kickoff", "kickoff", "fulltime"]);
  a.reset();
  s.over = false;
  a.observe(s, false);
  assert.equal(heard.length, 3);
  a.observe(s, true);
  assert.equal(heard.at(-1), "kickoff");
});

test("inactive restarts are consumed without playing a late whistle", async () => {
  const c = context(),
    a = new ArenaAudio(() => c);
  await a.enable(true);
  a.observe({ pause: 1.4, over: false }, true);
  a.observe({ pause: 0, over: false }, true);
  a.setActive(true);
  a.observe({ pause: 0, over: false }, true);
  assert.equal(c.scheduled.length, 0);
  a.observe({ pause: 1.4, over: false }, true);
  a.observe({ pause: 0, over: false }, true);
  assert.ok(c.scheduled.length > 0);
});

test("medical whistle waits through evacuation, formation and launcher", () => {
  const a = new ArenaAudio(),
    heard = [];
  a.play = (kind) => heard.push(kind);
  const s = { pause: 0, medical: { player: 7 }, restartPhase: 0 };
  a.observe(s, true);
  s.medical = null;
  s.restartPhase = 1;
  a.observe(s, true);
  s.restartPhase = 2;
  a.observe(s, true);
  assert.deepEqual(heard, []);
  s.restartPhase = 0;
  a.observe(s, true);
  a.observe(s, true);
  assert.deepEqual(heard, ["kickoff"]);
});

test("collision storms preserve whistles and medical announcements within the voice limit", async () => {
  const audio = new ArenaAudio(() => context());
  await audio.enable(true);
  audio.setActive(true);
  audio.play("fulltime");
  audio.play(14);
  const announcements = [...audio.voices];
  for (let i = 0; i < 50; i++) audio.play(i % 2 ? 4 : 5);
  assert.equal(audio.voices.size, 32);
  for (const voice of announcements) assert.ok(audio.voices.has(voice));
  audio.stop();
  assert.equal(audio.voices.size, 0);
  for (let i = 0; i < 32; i++) audio.play("kickoff");
  const voices = [...audio.voices];
  audio.play(5);
  assert.deepEqual([...audio.voices], voices);
});

test("Zap pickup gets one spatial discharge instead of the generic pickup cue",()=>{
 const audio=new ArenaAudio(),heard=[];audio.play=(...args)=>heard.push(args);
 const event={id:1,kind:11,target:12,x:0,z:2,h:.5};
 const s={over:false,pause:1,events:[event]};
 audio.observe(s,true,{centerZ:0,halfWidth:4});
 audio.observe(s,true,{centerZ:0,halfWidth:4});
 assert.deepEqual(heard,[["zap",.5]]);
 audio.observe({...s,events:[event,{...event,id:2,target:3}]},true,{centerZ:0,halfWidth:4});
 assert.deepEqual(heard,[["zap",.5],[11,.5]]);
});

test("Zap is protected from collision noise but cannot displace match whistles",async()=>{
 const a=new ArenaAudio(()=>context());await a.enable(true);a.setActive(true);
 a.play("zap");const discharge=[...a.voices];
 assert.equal(discharge.length,4);assert.ok(discharge.every(v=>v.priority===1));
 for(let i=0;i<40;i++)a.play(4);
 for(const voice of discharge)assert.ok(a.voices.has(voice));
 a.stop();for(let i=0;i<32;i++)a.play("kickoff");const whistles=[...a.voices];
 a.play("zap");assert.deepEqual([...a.voices],whistles);
});


test("coins and equipment play distinct collection cues once per event",()=>{
 const audio=new ArenaAudio(),heard=[];audio.play=(...args)=>heard.push(args);
 const events=[{id:1,kind:11,target:13,z:-2},{id:2,kind:11,target:17,z:2}];
 const state={over:false,pause:1,events};
 audio.observe(state,true,{centerZ:0,halfWidth:4});
 audio.observe(state,true,{centerZ:0,halfWidth:4});
 assert.deepEqual(heard,[["coin",-.5],["equipment",.5]]);
});


test("throw sound starts at windup and does not repeat at release",()=>{
 const a=new ArenaAudio(),heard=[];a.play=(...args)=>heard.push(args);
 const start={id:1,kind:30,z:1};
 const state={pause:1,over:false,events:[start]};
 a.observe(state,true,{centerZ:0,halfWidth:4});
 assert.deepEqual(heard,[[3,.25]]);
 state.events.push({id:2,kind:3,z:2});
 a.observe(state,true,{centerZ:0,halfWidth:4});
 a.observe(state,true,{centerZ:0,halfWidth:4});
 assert.deepEqual(heard,[[3,.25]]);
});

test('clients choose identical hit variation and retained snapshots do not repeat it',()=>{
 const heard=[[],[]], clients=heard.map(list=>{const a=new ArenaAudio();a.play=(...args)=>list.push(args);return a});
 const state={pause:1,events:[1,2,3,4].map(id=>({id,kind:4,z:0}))};
 clients[0].observe(state,true);clients[0].observe(state,true);
 clients[1].observe(state,true);
 assert.deepEqual(heard[0],heard[1]);
 assert.deepEqual(heard[0].map(call=>call[2]),[1,2,3,0]);
 assert.equal(heard[0].length,4);
});

test("collection after injury retains its sound without replacing the priority notice", async () => {
 const {initial} = await import("./game.js");
 const {pickup} = await import("./features.js");
 const {emit,notificationEvent} = await import("./events.js");
 for (const kind of [13,14]) {
  const s=initial(), a=new ArenaAudio(), heard=[];
  s.pause=1;
  a.play=(cue)=>heard.push(cue);
  const injury=emit(s,14,7,-1);
  pickup(s,16,kind);
  assert.equal(notificationEvent(s,0),injury);
  a.observe(s,true);a.observe(s,true);
  assert.deepEqual(heard,[14,kind===13?"coin":"equipment"]);
 }
});
