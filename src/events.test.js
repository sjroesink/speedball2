import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, throwBall } from "./game.js";
import { damage, startInjury } from "./features.js";
import { emit, recentEvents, notificationEvent } from "./events.js";
import { ArenaAudio } from "./audio.js";

test("bonus and injury feedback survives later sound-only events", () => {
  const s = initial();
  const bonus = emit(s, 8, 0, 2);
  emit(s, 18, 7, -1);
  emit(s, 19, 16, -1);
  assert.equal(notificationEvent(s, 0), bonus);
  assert.deepEqual(
    recentEvents(s, 0).map((e) => e.kind),
    [8, 18, 19],
  );
  const seen = s.event.id;
  assert.equal(notificationEvent(s, seen), null);
  assert.deepEqual(recentEvents(s, seen), []);
  const injury = emit(s, 14, 7, 16);
  emit(s, 4, 7, 16);
  emit(s, 20, 7, -1);
  assert.equal(notificationEvent(s, seen), injury);
});

test("an active score message resists low-priority feedback without replay", () => {
  const s = initial();
  emit(s, 5, 7, -1);
  emit(s, 11, 7, 1);
  assert.equal(notificationEvent(s, 0, 3), null);
  const seen = s.event.id;
  assert.equal(notificationEvent(s, seen, 0), null);
  const goal = emit(s, 7, 0, -1);
  assert.equal(notificationEvent(s, seen, 3), goal);
  const next = initial();
  assert.deepEqual(recentEvents(next, 0), []);
  const hit = emit(next, 4, 7, 16);
  assert.equal(notificationEvent(next, 0), hit);
});

test("an omitted snapshot still delivers every retained sound once, in order", () => {
  const s = initial(),
    audio = new ArenaAudio(),
    heard = [];
  audio.play = (kind) => heard.push(kind);
  emit(s, 3, 7, -1);
  audio.observe(s, false);
  // These events occur while a datagram is lost or between rendered frames.
  emit(s, 4, 7, 16);
  emit(s, 5, 7, -1);
  emit(s, 8, 0, 2);
  audio.observe(s, false);
  audio.observe(s, false);
  assert.deepEqual(heard, [3, 4, 5, 8]);
  for (let i = 0; i < 30; i++) emit(s, 12, 7, -1);
  assert.equal(s.events.length, 16);
  assert.deepEqual(
    s.events.map((e) => e.id),
    Array.from({ length: 16 }, (_, i) => i + 19),
  );
  audio.observe(s, false);
  assert.equal(heard.length, 20);
});
test("fatal impact and later medical cue retain event order; match reset drops history", () => {
  const s = initial();
  throwBall(s, 7, false);
  s.players[16].health = 1;
  damage(s, 7, 16);
  assert.equal(s.event.kind, 4);
  s.players[16].actionTime = 0;
  startInjury(s, 16);
  assert.deepEqual(
    s.events.map((e) => e.kind),
    [3, 4, 14],
  );
  const next = initial();
  assert.equal(next.events?.length ?? 0, 0);
});
