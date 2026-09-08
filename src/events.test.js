import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, throwBall } from "./game.js";
import { damage } from "./features.js";
import { emit } from "./events.js";
import { ArenaAudio } from "./audio.js";

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
test("same-step injury retains both impact and injury cues; match reset drops history", () => {
  const s = initial();
  throwBall(s, 7, false);
  s.players[16].health = 1;
  damage(s, 7, 16);
  assert.deepEqual(
    s.events.map((e) => e.kind),
    [3, 4, 14],
  );
  const next = initial();
  assert.equal(next.events?.length ?? 0, 0);
});
