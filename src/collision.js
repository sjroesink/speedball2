import { referenceDistance, fallRecovery } from "./attributes.js";
import { inViewport } from "./visibility.js";
const unit = 22.4 / 576;
export function contactDistances(players) {
  return players.map((p) =>
    players.map((q) => referenceDistance(q.x - p.x, q.z - p.z)),
  );
}
// sub_D448/sub_D4AC: cancel movement toward each nearby standing opponent.
// Compensation precedes ordinary movement; it does not change velocity.
export function blockPlayerMovement(
  players,
  i,
  distances,
  dt,
  view = [160, 484],
) {
  const p = players[i];
  const visible = (q) =>
    inViewport(
      view,
      Math.round(q.z / unit + 320),
      Math.round(576 - q.x / unit),
    );
  if (!visible(p)) return;
  for (let j = 0; j < players.length; j++) {
    const q = players[j];
    if (
      q.team === p.team ||
      q.stun > 0 ||
      q.health <= 0 ||
      distances[j] > 30 ||
      !visible(q)
    )
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
