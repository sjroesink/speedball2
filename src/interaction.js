import { predictedTarget } from "./steering.js";
import { worldInViewport } from "./visibility.js";
import { playerTargetDelta } from "./physical-pose.js";
import { referenceDistance } from "./attributes.js";
const unit = 22.4 / 576;
// sub_E854: first nearby opponent decides attack or avoidance.
export function localInteraction(s, i, distances, random) {
  const p = s.players[i];
  if (!worldInViewport(s, p)) return null;
  for (let j = 0; j < s.players.length; j++) {
    const q = s.players[j];
    if (
      q.team === p.team ||
      q.stun > 0 ||
      q.health <= 0 ||
      distances[j] > 30 ||
      !worldInViewport(s, q)
    )
      continue;
    const attack =
      s.ball.owner !== i &&
      (i % 9 === 0 || s.ball.owner === j || p.stats[0] > random);
    const selected = s.controlled[p.team] === i;
    const [tx, tz] =
      attack && selected
        ? predictedTarget(q.x, q.z, q.moveX || 0, q.moveZ || 0, p.stats[7])
        : [q.x, q.z];
    const dx = Math.round(tx / unit) - Math.round(p.x / unit),
      dz = Math.round(tz / unit) - Math.round(p.z / unit);
    let x = Math.abs(dx) > Math.floor(Math.abs(dz) / 2) ? Math.sign(dx) : 0;
    let z = Math.abs(dz) > Math.floor(Math.abs(dx) / 2) ? Math.sign(dz) : 0;
    if (!x && !z && !(attack && selected))
      x = (p.team === 0 ? 1 : -1) * (s.period === 2 ? -1 : 1);
    else if (!attack) {
      x = -x;
      z = -z;
    }
    return { attack, x, z };
  }
  // 0xffd4-0x1001e: yield to the selected teammate after opponent checks.
  const selected = s.controlled[p.team], q = s.players[selected];
  if (selected !== i && q && q.stun <= 0 && q.health > 0) {
    const delta = playerTargetDelta(p, q);
    if (Math.abs(delta.x) <= 30 * unit + 1e-9 &&
        Math.abs(delta.z) <= 30 * unit + 1e-9 &&
        referenceDistance(delta.x, delta.z) <= 32) {
      // Avoidance direction uses terrain positions, not the distance origins.
      const dx = Math.round(q.x / unit) - Math.round(p.x / unit);
      const dz = Math.round(q.z / unit) - Math.round(p.z / unit);
      let x = Math.abs(dx) > Math.floor(Math.abs(dz) / 2) ? -Math.sign(dx) : 0;
      const z = Math.abs(dz) > Math.floor(Math.abs(dx) / 2) ? -Math.sign(dz) : 0;
      if (!x && !z) x = (p.team === 0 ? 1 : -1) * (s.period === 2 ? -1 : 1);
      return { attack: false, x, z };
    }
  }
  return null;
}
