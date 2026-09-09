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
  for (let kind = 1; kind <= 20; kind++) {
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
