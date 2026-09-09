import { LoopOnce, LoopRepeat } from "three";
import { actionDuration, fallDuration } from "./attributes.js";

// Visual clips share the simulation action duration, independent of authored FPS.
export function playPlayerAction(action, kind, remaining = 0, speed = 100) {
  action.reset();
  action.setLoop(kind === 5 ? LoopRepeat : LoopOnce, kind === 5 ? Infinity : 1);
  const duration = kind === 1 || kind === 2 ? actionDuration(kind, speed)
    : kind === 4 ? fallDuration
    : kind === 3 ? 8 / 25 : kind === 6 ? 3 / 25 : kind === 7 ? 4 / 25 : 0;
  if (duration) {
    action.setDuration(duration);
    // A first received snapshot can already be partway through the action.
    const elapsed = Math.max(0, Math.min(duration, duration - remaining));
    action.time = action.getClip().duration * elapsed / duration;
  }
  action.play();
}

// An idle snapshot can be omitted between two actions of the same kind.
export function startsPlayerAction(previousKind, kind, previousRemaining, remaining, healthy = true) {
  if (previousKind !== kind) return true;
  return healthy && [1, 2, 3, 6, 7].includes(kind) &&
    Number.isFinite(previousRemaining) && remaining > previousRemaining + .015;
}

// One authored two-step cycle covers approximately 1.2 court units.
export function runningAnimationDelta(distance, clipDuration, teleported = false) {
  if (teleported || !Number.isFinite(distance) || distance <= 0) return 0;
  return distance / 1.2 * clipDuration;
}
