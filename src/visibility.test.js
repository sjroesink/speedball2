import { test } from "node:test";
import assert from "node:assert/strict";
import { scrollViewport, inViewport } from "./visibility.js";

test("original scroll has horizontal dead zone, vertical one-unit steps and speed cap", () => {
  assert.deepEqual(scrollViewport([160, 484], 327, 583), [160, 485]);
  assert.deepEqual(scrollViewport([160, 484], 328, 584), [162, 486]);
  assert.deepEqual(scrollViewport([160, 484], 327, 583, true), [161, 485]);
  assert.deepEqual(scrollViewport([160, 484], 640, 1152), [176, 500]);
  assert.deepEqual(scrollViewport([0, 0], 0, 0), [0, 0]);
  assert.deepEqual(scrollViewport([320, 968], 640, 1152), [320, 968]);
});
test("visibility uses inclusive 320 by 184 limits and optional 16-unit inset", () => {
  const v = [160, 484];
  assert.equal(inViewport(v, 160, 484), true);
  assert.equal(inViewport(v, 480, 668), true);
  assert.equal(inViewport(v, 481, 668), false);
  assert.equal(inViewport(v, 480, 669), false);
  assert.equal(inViewport(v, 176, 500, 16), true);
  assert.equal(inViewport(v, 464, 652, 16), true);
  assert.equal(inViewport(v, 175, 500, 16), false);
});
