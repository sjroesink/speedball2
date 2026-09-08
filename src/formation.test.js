import test from "node:test";
import assert from "node:assert/strict";
import { initial, resetPitch, selectPlayers } from "./game.js";

test("launch formation, goal restart and halftime side exchange", () => {
  const s = initial();
  const unit = 22.4 / 576;
  const terrain = (p) => [
    Math.round(p.z / unit + 320),
    Math.round(576 - p.x / unit),
  ];
  assert.deepEqual(s.players.slice(0, 9).map(terrain), [
    [320, 1104],
    [213, 992],
    [426, 992],
    [213, 768],
    [426, 768],
    [320, 800],
    [106, 576],
    [426, 576],
    [320, 640],
  ]);
  assert.deepEqual(s.players.slice(9).map(terrain), [
    [320, 48],
    [426, 160],
    [213, 160],
    [426, 384],
    [213, 384],
    [320, 352],
    [533, 576],
    [213, 576],
    [320, 512],
  ]);
  selectPlayers(s);
  assert.deepEqual(s.controlled, [8, 17]);
  const launch = s.players.map(terrain);
  s.tick = 1;
  s.players[3].health = 63;
  s.players[3].stats[0] = 180;
  for (const p of s.players) {
    p.x = 0;
    p.z = 0;
  }
  resetPitch(s);
  assert.deepEqual(s.players.map(terrain), launch);
  assert.equal(s.players[3].health, 63);
  assert.equal(s.players[3].stats[0], 180);
  s.period = 2;
  resetPitch(s);
  assert.deepEqual(s.players.map(terrain), [
    ...launch.slice(9),
    ...launch.slice(0, 9),
  ]);
  assert.equal(s.players[3].health, 63);
  assert.equal(s.players[0].fx, -1);
  assert.equal(s.players[9].fx, 1);
});
