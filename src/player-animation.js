import { LoopOnce, LoopRepeat } from "three";

// Match the complete throw (four wind-up and four recovery reference ticks).
export function playPlayerAction(action, kind, remaining = 0) {
  action.reset();
  action.setLoop(kind === 5 ? LoopRepeat : LoopOnce, kind === 5 ? Infinity : 1);
  const duration = kind === 3 ? 8 / 25 : kind === 6 ? 3 / 25 : kind === 7 ? 4 / 25 : 0;
  if (duration) {
    action.setDuration(duration);
    // A first received snapshot can already be partway through the throw.
    const elapsed = Math.max(0, Math.min(duration, duration - remaining));
    action.time = action.getClip().duration * elapsed / duration;
  }
  action.play();
}
