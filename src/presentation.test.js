import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraExtent,
  cameraTarget,
  damping,
  smoothFacing,
} from "./presentation.js";
import { eventPan } from "./audio.js";
test("camera fills portrait, landscape and ultrawide viewports without shrinking the base coverage", () => {
  for (const aspect of [9 / 16, 1, 16 / 9, 21 / 9, 32 / 9]) {
    const extent = cameraExtent(aspect);
    assert.ok(Math.abs(extent.halfWidth / extent.halfHeight - aspect) < 1e-12);
    assert.ok(extent.halfWidth >= 13.5 - 1e-12);
    assert.ok(extent.halfHeight >= 7.5 - 1e-12);
    const target = cameraTarget(100, -100, extent);
    assert.ok(target.x + extent.halfHeight <= Math.max(23.2, extent.halfHeight) + 1e-12);
    assert.ok(
      target.z - extent.halfWidth >= -Math.max(12, extent.halfWidth) - 1e-12,
    );
  }
});
test("visual smoothing converges equally at 30, 60 and 144 FPS", () => {
  for (const rate of [10, 22, 30])
    for (const fps of [30, 60, 144]) {
      let x = 0;
      for (let frame = 0; frame < fps; frame++)
        x += (1 - x) * damping(rate, 1 / fps);
      assert.ok(Math.abs(x - (1 - Math.exp(-rate))) < 1e-12);
    }
});
test("stereo uses the displayed camera extent rather than the reference AI viewport", () => {
  const s = { logicalView: [0, 484] },
    view = { centerZ: 4, halfWidth: 8 };
  assert.equal(eventPan(s, { kind: 4, z: 4 }, view), 0);
  assert.equal(eventPan(s, { kind: 4, z: 8 }, view), 0.5);
  assert.equal(eventPan(s, { kind: 4, z: 0 }, view), -0.5);
});

test("visual facing crosses the angle seam without a full spin", () => {
  const rad = Math.PI / 180;
  for (const sign of [-1, 1]) {
    const from = sign * 179 * rad,
      to = -sign * 179 * rad;
    const next = smoothFacing(from, to, 1 / 60);
    assert.ok(Math.abs(next - from) < 2 * rad);
    assert.ok(sign * (next - from) > 0);
  }
  for (const fps of [30, 60, 144]) {
    let angle = 0;
    for (let i = 0; i < fps; i++)
      angle = smoothFacing(angle, Math.PI / 2, 1 / fps);
    assert.ok(Math.abs(angle - Math.PI / 2) < 1e-6);
  }
});

test("sudden reversals have a bounded, frame-rate independent turn speed", () => {
  const results = [];
  for (const fps of [30, 60, 144]) {
    let angle = 0;
    for (let frame = 0; frame < fps / 2; frame++) {
      const next = smoothFacing(angle, Math.PI, 1 / fps);
      assert.ok(next >= angle && next <= Math.PI);
      assert.ok((next - angle) * fps <= 4 * Math.PI + 1e-10);
      angle = next;
    }
    results.push(angle);
  }
  for (const angle of results) assert.ok(Math.abs(angle - results[0]) < 1e-12);
  assert.equal(smoothFacing(1, -2, 0), 1);
  assert.equal(smoothFacing(1, -2, -1), 1);
});
