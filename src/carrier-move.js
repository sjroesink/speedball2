import { zones } from "./support-data.js";
import { directionKey, opponentDirections } from "./defensive-pass.js";
import { worldInViewport } from "./visibility.js";
const unit = 22.4 / 576;

// active_player_ai, check_collectibles, find_route_left/right_first.
// Called after hardware targeting; null means enter the role's pass/shot branch.
export function carrierMove(s, i, random, distances) {
  if (i % 9 === 0) return null;
  const p = s.players[i],
    j = s.controlled[1 - p.team],
    q = s.players[j];
  if (q && q.stun <= 0 && q.health > 0 && distances[j] <= 64) return null;
  const blocked = opponentDirections(s, i, distances);
  const clear = (target) =>
    !blocked.includes(directionKey(p, target.x, target.z));
  const intelligence = i % 9 >= 6 ? Math.floor(p.stats[7] / 2) : p.stats[7];
  if (intelligence > random) {
    for (const slot of [0, 1, 6, 2, 3, 4, 5]) {
      const item = s.pickups?.[slot];
      if (item && item.kind && item.wait <= 0 && worldInViewport(s, item) && clear(item))
        return { x: item.x, z: item.z };
    }
  }
  const side = p.team ^ (s.period === 2 ? 1 : 0);
  const [xmin, xmax, ymin, ymax] = zones[side][i % 9];
  const cy = Math.floor((ymin + ymax) / 2) & ~1;
  const x = Math.round(320 + p.z / unit),
    y = Math.round(576 - p.x / unit);
  if (side === 0 ? y <= cy : y >= cy) return null;
  const bound = (v) => Math.max(xmin, Math.min(xmax, v));
  let forwardX = bound(x);
  if (forwardX <= 96) forwardX = 56;
  else if (forwardX >= 544) forwardX = 584;
  forwardX = bound(forwardX);
  const front = Math.floor((y + (side === 0 ? ymin : ymax)) / 2);
  const lateral = random & 8 ? [xmin, xmax] : [xmax, xmin];
  const candidates = [[forwardX, front]];
  for (const targetY of [
    front,
    Math.floor((y + cy) / 2),
    Math.floor((y + (side === 0 ? ymax : ymin)) / 2),
  ]) {
    for (const edge of lateral)
      candidates.push([Math.floor((x + edge) / 2), targetY]);
  }
  for (const [tx, ty] of candidates) {
    const target = { x: (576 - ty) * unit, z: (tx - 320) * unit };
    if (clear(target)) return target;
  }
  return null;
}
