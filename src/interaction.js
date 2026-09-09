import { predictedTarget } from "./steering.js";
const unit = 22.4 / 576;
// sub_E854: first nearby opponent decides attack or avoidance.
export function localInteraction(s, i, distances, random) {
  const p = s.players[i];
  for (let j = 0; j < s.players.length; j++) {
    const q = s.players[j];
    if (q.team === p.team || q.stun > 0 || q.health <= 0 || distances[j] > 30)
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
    if (!x && !z) x = (p.team === 0 ? 1 : -1) * (s.period === 2 ? -1 : 1);
    else if (!attack) {
      x = -x;
      z = -z;
    }
    return { attack, x, z };
  }
  return null;
}
