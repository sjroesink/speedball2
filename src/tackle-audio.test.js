import test from "node:test";
import assert from "node:assert/strict";
import { initial, step } from "./game.js";
import { ArenaAudio } from "./audio.js";

test("tackle contact sounds on failure and possession signals only on a steal", () => {
  for (const team of [0, 1]) for (const success of [false, true]) for (const carrying of [false, true]) {
    const s = initial(), i = team * 9 + 7, j = (1 - team) * 9 + 7;
    for (const p of s.players) p.stun = 100;
    Object.assign(s.players[i], { x: 0, z: 0, stun: 0, action: 7, actionTime: .16, fx: 1, fz: 0 });
    Object.assign(s.players[j], { x: .5, z: 0, stun: 0, fx: 1, fz: 0 });
    Object.assign(s.ball, { owner: carrying ? j : -1, x: 10, z: 10 });
    s.rng = success ? [0, 0] : [65535, 65535];
    step(s, .04, {}, [true, true], {});
    const expected = success ? carrying ? [29, 4, team === 0 ? 24 : 25] : [29, 4] : [29];
    assert.deepEqual(s.events.map(e => e.kind), expected);
    const audio = new ArenaAudio(), heard = [];
    audio.play = kind => heard.push(kind);
    audio.observe(s, true);
    audio.observe(s, true);
    assert.deepEqual(heard.filter(k => k !== "kickoff"), expected);
    const id = s.event.id;
    step(s, .04, {}, [true, true], {});
    assert.equal(s.event.id, id, "resolved contact must not replay each tick");
  }
});
