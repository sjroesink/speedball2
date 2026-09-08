import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { decodeSnapshot } from "./wire.js";
test("browser decodes actual Go protocol v5 snapshot with every new field", () => {
  const r = spawnSync(
    "go",
    ["test", "./server", "-run", "^TestFeatureSnapshot$", "-v"],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const bytes = Buffer.from(
    r.stdout.match(/WIRE:([A-Za-z0-9+/=]+)/)[1],
    "base64",
  );
  const m = decodeSnapshot(bytes),
    s = m.state;
  assert.equal(m.room, "ABCDEF");
  assert.deepEqual(m.names, ["Blue", "Red"]);
  assert.equal(m.started, true);
  assert.deepEqual(s.effect, { kind: 10, team: 1, time: 5.5 });
  assert.deepEqual(s.credits, [100, 50]);
  assert.deepEqual(s.reserves, [2, 1]);
  assert.equal(s.ball.electric, 3);
  assert.equal(s.events.length, 16);
  assert.deepEqual(
    s.events.map((e) => e.id),
    Array.from({ length: 16 }, (_, i) => i + 5),
  );
  assert.deepEqual(s.events[15], s.event);
  assert.deepEqual(s.events[0], {
    id: 5,
    kind: 4,
    actor: 7,
    target: -1,
    x: 4,
    z: -2,
    h: 1,
  });
  s.players.forEach((p, i) => {
    assert.equal(p.health, 90 - i);
    assert.equal(p.injury, i / 10);
    assert.equal(p.gear, 14 + (i % 8));
    assert.deepEqual(p.stats, Array(8).fill(100 + i));
  });
  assert.equal(s.pickups.length, 7);
  assert.equal(s.pickups[6].kind, 14);
  assert.ok(bytes.length < 1200);
  const old = Buffer.from(bytes);
  old[3] = 2;
  assert.throws(() => decodeSnapshot(old), /Server version/);
});
