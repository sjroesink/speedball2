import { referenceDistance, fallRecovery } from "./attributes.js";
import { opponentDistance } from "./physical-pose.js";
const unit = 22.4 / 576;
export function contactDistances(players) {
  return players.map((p) =>
    players.map((q) =>
      p.team === q.team
        ? referenceDistance(q.x - p.x, q.z - p.z)
        : opponentDistance(p, q),
    ),
  );
}
// sub_D448/sub_D4AC: cancel movement toward each nearby standing opponent.
// Compensation precedes ordinary movement; it does not change velocity.
export function blockPlayerMovement(players, i, distances, dt) {
  const p = players[i];
  for (let j = 0; j < players.length; j++) {
    const q = players[j];
    if (q.team === p.team || q.stun > 0 || q.health <= 0 || distances[j] > 30)
      continue;
    if (p.action === 4 && p.stun <= fallRecovery + 1e-9) {
      p.fallX = p.fallZ = p.moveX = p.moveZ = 0;
      p.stun = p.actionTime = fallRecovery;
    }
    const dx = Math.round(q.x / unit) - Math.round(p.x / unit);
    const dz = Math.round(q.z / unit) - Math.round(p.z / unit);
    if (Math.abs(dx) > Math.floor(Math.abs(dz) / 2) && dx * p.moveX > 0)
      p.x -= p.moveX * dt;
    if (Math.abs(dz) > Math.floor(Math.abs(dx) / 2) && dz * p.moveZ > 0)
      p.z -= p.moveZ * dt;
  }
}
