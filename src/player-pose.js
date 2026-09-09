import { advancePhysicalPose } from "./physical-pose.js";
import { startInjury } from "./features.js";

// The fall -5 terminator (0x10d44) stops movement and resolves injury in
// the player's animation pass, rather than waiting for the next timer tick.
export function advancePlayerPose(s, i, dt) {
  const p = s.players[i];
  if (!advancePhysicalPose(p, i, s.period, dt)) return false;
  p.stun = p.actionTime = 0;
  p.moveX = p.moveZ = p.fallX = p.fallZ = 0;
  p.fallAttack = p.fallAttackTime = 0;
  p.fallFinishing = p.jumping = false;
  if (p.health <= 0) return startInjury(s, i);
  // Healthy -5 selects anim_lying_down and clears its cursor at 0x10d84.
  p.poseCursor = 0;
  p.action = 0;
  return false;
}
