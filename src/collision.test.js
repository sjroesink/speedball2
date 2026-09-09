import { test } from "node:test";
import assert from "node:assert/strict";
import { blockPlayerMovement, contactDistances } from "./collision.js";
const unit = 22.4 / 576;
function fixture(x = 20, z = 0) {
  return [
    { x: 0, z: 0, team: 0, health: 100, moveX: 25 * unit, moveZ: 25 * unit },
    { x: x * unit, z: z * unit, team: 1, health: 100, stun: 0 },
  ];
}
test("opponents block approaching axes, with inclusive 30-unit cached reach", () => {
  for (const distance of [30, 31]) {
    const p = fixture();
    blockPlayerMovement(p, 0, [0, distance], 1 / 25);
    assert.equal(p[0].x, distance === 30 ? -unit : 0);
    assert.equal(p[0].z, 0);
    assert.equal(p[1].x, 20 * unit);
  }
  const p = fixture(20, 10);
  blockPlayerMovement(p, 0, [0, 25], 1 / 25);
  assert.equal(p[0].x, -unit);
  assert.equal(p[0].z, 0, "half-axis equality is excluded");
  const q = fixture(20, 11);
  blockPlayerMovement(q, 0, [0, 25], 1 / 25);
  assert.equal(q[0].x, -unit);
  assert.equal(q[0].z, -unit);
});
test("teammates, fallen opponents, stationary overlap and retreat are not pushed", () => {
  for (const kind of ["team", "fallen", "stationary", "retreat"]) {
    const p = fixture();
    if (kind === "team") p[1].team = 0;
    if (kind === "fallen") p[1].stun = 1;
    if (kind === "stationary") p[0].moveX = p[0].moveZ = 0;
    if (kind === "retreat") p[0].moveX = -25 * unit;
    blockPlayerMovement(p, 0, contactDistances(p)[0], 1 / 25);
    assert.equal(p[0].x, 0, kind);
    assert.equal(p[0].z, 0, kind);
  }
});
