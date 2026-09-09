import { predictedTarget } from "./steering.js";
const unit = 22.4 / 576;

// active_player_ai: no-item, visible field-player branch (WIP sub_D742).
export function pursuit(s, i, random, distances, inMultiplier) {
  const p = s.players[i],
    b = s.ball;
  const j = s.controlled[1 - p.team],
    q = s.players[j];
  const attack = Math.floor(p.stats[0] / 2) > random;
  const opponent =
    q &&
    (b.owner === j ||
      inMultiplier ||
      (q.stun <= 0 && q.health > 0 && attack && distances[i] > distances[j]));
  const target = opponent ? q : b;
  const [tx, tz] = predictedTarget(
    target.x,
    target.z,
    opponent ? q.moveX || 0 : b.vx,
    opponent ? q.moveZ || 0 : b.vz,
    p.stats[7],
  );
  const dx = Math.round(tx / unit) - Math.round(p.x / unit);
  const dz = Math.round(tz / unit) - Math.round(p.z / unit);
  const x = Math.abs(dx) > Math.floor(Math.abs(dz) / 2) ? Math.sign(dx) : 0;
  const z = Math.abs(dz) > Math.floor(Math.abs(dx) / 2) ? Math.sign(dz) : 0;
  return { attack, x, z, tx, tz };
}
