import { emit } from "./events.js";
import { multiplierPaths } from "./multiplier-paths.js";
import { velocityUnit } from "./attributes.js";
import { setBallSpeed } from "./ball.js";

const unit = 22.4 / 576;
// Original terrain X is transverse; terrain Y increases downfield.
export function enterMultiplier(b) {
  if (b.owner >= 0 || b.multiplierPath) return false;
  if (b.flightKind ? b.flightStage > 2 : b.h > 1.25) return false;
  const x = Math.round(320 + b.z / unit),
    y = Math.round(576 - b.x / unit);
  if (x < 24 || x > 616 || (x >= 64 && x <= 576)) return false;
  const left = x < 64,
    origin = left ? 576 : 512;
  if (y < origin || y > origin + 64) return false;
  const dx = b.dirX ?? Math.sign(b.vx),
    dz = b.dirZ ?? Math.sign(b.vz);
  if ((left ? x >= 48 : x <= 592) && dz === 0 && dx !== 0) {
    b.multiplierPath = left ? (dx > 0 ? 1 : 2) : dx < 0 ? 3 : 4;
    b.multiplierIndex = 0;
    b.multiplierFraction = 1; // The entry tick also executes the first path step.
    b.flightKind = 0;
    b.h = 0.75;
    b.vh = 0;
    return true;
  }
  // Reconstruct the earlier position exactly as the original two-velocity test.
  const oldX = x - (2 * b.vz) / velocityUnit,
    oldY = y + (2 * b.vx) / velocityUnit;
  if (left ? oldX >= 64 : oldX <= 576) {
    b.vz = -b.vz;
    b.dirZ = -dz;
  }
  if (oldY < origin || oldY > origin + 64) {
    b.vx = -b.vx;
    b.dirX = -dx;
  }
  return false;
}

export function runMultiplier(s, dt) {
  const b = s.ball;
  if (!b.multiplierPath) return false;
  if (b.owner >= 0) {
    b.multiplierPath = 0;
    return false;
  }
  b.multiplierFraction += dt * 25;
  while (b.multiplierFraction >= 1 - 1e-9) {
    b.multiplierFraction = Math.max(0, b.multiplierFraction - 1);
    const path = multiplierPaths[b.multiplierPath - 1];
    if (b.multiplierIndex === path.length) {
      b.multiplierPath = 0;
      b.vx = (b.vx > 0 ? 1 : -1) * 8 * velocityUnit;
      b.h = 0.25;
      setBallSpeed(b, s.players[b.lastTouch]?.stats?.[4] ?? 100);
      return false;
    }
    const left = b.multiplierPath <= 2,
      [x, y] = path[b.multiplierIndex++];
    b.x = (576 - (left ? 576 : 512) - y) * unit;
    b.z = ((left ? 0 : 640) + x - 320) * unit;
    if (b.multiplierIndex === 22 && b.lastTouch >= 0) {
      const team = s.players[b.lastTouch].team;
      const next = Math.max(
        -2,
        Math.min(2, s.multiplier + (team === 0 ? 1 : -1)),
      );
      if (next !== s.multiplier) {
        s.multiplier = next;
        emit(s, 9, team, next, b.x, b.z, b.h);
      }
    }
  }
  return true;
}
