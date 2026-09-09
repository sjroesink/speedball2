import { predictedTarget } from "./steering.js";
import { worldInViewport } from "./visibility.js";
import { referenceDistance } from "./attributes.js";
const unit = 22.4 / 576;

// active_player_ai: selected field-player targets (WIP sub_D742 / sub_D97E).
export function pursuit(s, i, random, distances, inMultiplier) {
  const p = s.players[i],
    b = s.ball;
  const j = s.controlled[1 - p.team],
    q = s.players[j];
  const visible = worldInViewport(s, p, 16);
  const attack = visible && Math.floor(p.stats[0] / 2) > random;
  const opponent =
    visible &&
    q &&
    (b.owner === j ||
      inMultiplier ||
      (q.stun <= 0 && q.health > 0 && attack && distances[i] > distances[j]));
  let item;
  if (visible) {
    for (const slot of [0, 1, 6, 2, 3, 4, 5]) {
      const candidate = s.pickups?.[slot];
      if (
        !candidate || !candidate.kind ||
        candidate.wait > 0 ||
        !worldInViewport(s, candidate) ||
        referenceDistance(candidate.x - p.x, candidate.z - p.z) === 0
      )
        continue;
      if (
        referenceDistance(candidate.x - b.x, candidate.z - b.z) <= distances[i]
      )
        item = candidate;
      break;
    }
  }
  const target = item || (opponent ? q : b);
  const [tx, tz] = predictedTarget(
    target.x,
    target.z,
    item ? 0 : opponent ? q.moveX || 0 : b.vx,
    item ? 0 : opponent ? q.moveZ || 0 : b.vz,
    p.stats[7],
  );
  const dx = Math.round(tx / unit) - Math.round(p.x / unit);
  const dz = Math.round(tz / unit) - Math.round(p.z / unit);
  const x = Math.abs(dx) > Math.floor(Math.abs(dz) / 2) ? Math.sign(dx) : 0;
  const z = Math.abs(dz) > Math.floor(Math.abs(dx) / 2) ? Math.sign(dz) : 0;
  return { attack, x, z, tx, tz };
}
