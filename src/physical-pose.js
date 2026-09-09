import data from "./physical-pose-data.json" with { type: "json" };
import {
  actionDuration,
  fallDuration,
  referenceDistance,
} from "./attributes.js";
const unit = 22.4 / 576;
export function playerTargetDelta(p, target) {
  const a = data.origins[p.physicalSprite ?? 0];
  const b = data.origins[target.physicalSprite ?? 0];
  return { x: target.x - b[1] * unit - p.x + a[1] * unit,
    z: target.z + b[0] * unit - p.z };
}
// distance_to_point (0xdaca) includes only the querying player's Y origin.
export function playerPointDistance(p, x, z) {
  const origin = data.origins[p.physicalSprite ?? 0];
  return referenceDistance(p.x - origin[1] * unit - x, p.z - z);
}
// calculate_player_distances (0xda20) adds both origins to team one's target,
// queries team two, then stores the same result for both opponents.
export function opponentDistance(p, q) {
  const target = p.team === 0 ? p : q;
  const query = p.team === 0 ? q : p;
  const origin = data.origins[target.physicalSprite ?? 0];
  return playerPointDistance(
    query,
    target.x - origin[1] * unit,
    target.z + origin[0] * unit,
  );
}
// Advance original sprite selection for physical carried-ball placement.
export function advancePhysicalPose(p, i, period, dt) {
  const direction =
    (Math.round((Math.atan2(p.fz, p.fx) * 4) / Math.PI) + 8) % 8;
  const up = (p.team === 0) === (period !== 2),
    keeper = i % 9 === 0;
  let kind = p.action || (p.moveX || p.moveZ ? 5 : 0),
    group = [
      "standing",
      "slide",
      "jump",
      "throw",
      "fall",
      "run",
      "catch",
      "punch",
    ][kind];
  let index = 0;
  if (kind === 5) {
    index = Math.floor((p.poseCursor || 0) + 1e-7) & 7;
    p.poseCursor = ((p.poseCursor || 0) + dt * 25) % 8;
  } else if (kind) {
    const computedDuration =
      kind === 1 || kind === 2
        ? actionDuration(kind, p.stats[3])
        : kind === 3
          ? 8 / 25
          : kind === 4
            ? fallDuration
            : kind === 6
              ? 3 / 25
              : 4 / 25;
    const duration =
      p.poseKind === kind && p.actionTime <= (p.poseRemaining ?? 0) + 1e-9
        ? p.poseDuration
        : computedDuration;
    p.poseDuration = duration;
    index = Math.max(0, Math.floor((duration - p.actionTime) * 25 + 1e-7));
    if (kind === 2 && p.actionTime <= 2 / 25 + 1e-9)
      index = 18 + Math.max(0, Math.floor((2 / 25 - p.actionTime) * 25 + 1e-7));
    if (kind === 1 && p.actionTime <= 1 / 25 + 1e-9) index = 15;
    p.poseCursor = index + 1;
  } else p.poseCursor = 0;
  if (keeper && [0, 5, 6].includes(kind))
    group =
      (kind === 0 ? "stand" : kind === 5 ? "run" : "catch") +
      (up ? "Up" : "Down");
  const frames =
    data.groups[group][keeper && kind === 0 ? (up ? 0 : 4) : direction];
  index = Math.min(index, frames.length - 1);
  p.physicalSprite = frames[index];
  p.physicalFrame = index;
  p.poseKind = kind;
  p.poseRemaining = p.actionTime;
}
export function physicalBallOffset(p, b) {
  const ballSprite =
    b.heldJump && p.action === 2 && p.physicalFrame >= 2 && p.physicalFrame < 18
      ? 6
      : 0;
  const origin = data.offsets[p.physicalSprite],
    correction = ballSprite === 0 ? 12 : 8;
  return {
    x: -(origin[1] - correction) * unit,
    z: (origin[0] - correction) * unit,
  };
}
