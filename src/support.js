import { zones, forwardTargets } from "./support-data.js";
import { predictedTarget } from "./steering.js";
import { worldInViewport } from "./visibility.js";

const unit = 22.4 / 576;
const role = (i) => [0, 1, 1, 2, 2, 2, 4, 4, 3][i % 9];
const terrain = (p) => [
  Math.round(p.z / unit + 320),
  Math.round(576 - p.x / unit),
];
const predicted = (p) => {
  const [x, y] = terrain(p);
  return [
    x + Math.round((p.moveZ || 0) / unit / 25),
    y - Math.round((p.moveX || 0) / unit / 25),
  ];
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// base_player_ai / find_closest_available_enemy (0xf786..0xf8ca).
// Reuse the decision's random byte and cached opponent distances.
export function aggressionTarget(s, i, distances, random) {
  const p = s.players[i];
  if (!worldInViewport(s, p) || random >= (p.stats[0] >> 1)) return null;
  const side = p.team ^ (s.period === 2 ? 1 : 0);
  const [xmin, xmax, ymin, ymax] = zones[side][i % 9];
  let closest = p.stats[7] * 2, target = null;
  for (let j = 0; j < s.players.length; j++) {
    const q = s.players[j];
    if (q.team === p.team || q.stun > 0 || q.health <= 0 ||
        !worldInViewport(s, q) || distances[j] >= closest) continue;
    const next = predictedTarget(q.x, q.z, q.moveX || 0, q.moveZ || 0, p.stats[7]);
    const [x, y] = terrain({ x: next[0], z: next[1] });
    if (x < xmin || x > xmax || y < ymin || y > ymax) continue;
    closest = distances[j];
    target = next;
  }
  return target;
}

// Positional branch of base_player_ai: E218..E438 in the C# reference,
// adjust_support_target / attackers_targeting in the Amiga disassembly.
export function supportTarget(s, i, self = false) {
  const team = Math.floor(i / 9),
    side = team ^ (s.period === 2 ? 1 : 0);
  const [xmin, xmax, ymin, ymax] = zones[side][i % 9];
  const cx = Math.floor((xmin + xmax) / 2) & ~1;
  const cy = Math.floor((ymin + ymax) / 2) & ~1;
  const r = role(i);
  let selected = self ? i : s.controlled[team];
  if (r === 1 && role(selected) >= 2) selected = team * 9;
  const q = s.players[selected],
    qr = Math.min(3, role(selected));
  let [x, y] = self ? terrain(q) : predicted(q);
  const [qx] = terrain(q);
  const adjust = () => {
    x = clamp(Math.floor((x + cx) / 2), xmin, xmax);
    let delta = Math.abs(x - qx),
      diagonal;
    if (qr <= r) {
      diagonal = side === 0 ? y >= cy : y <= cy;
      if (side === 0 && diagonal) delta = -delta;
    } else {
      diagonal = side === 0 ? y <= cy : y >= cy;
      if (side !== 0 && diagonal) delta = -delta;
    }
    if (diagonal) {
      y += delta;
      const constrained = clamp(y, ymin, ymax),
        excess = Math.abs(y - constrained);
      y = constrained;
      x = clamp(x + (x <= cx ? excess : -excess), xmin, xmax);
    } else y = clamp(predicted(q)[1], ymin, ymax);
  };
  if (role(selected) >= 3 && r >= 3) {
    const mirrorX = x >= 320 ? 639 - x : x;
    const mirrorY = side === 0 ? y : 1151 - y;
    if (mirrorY >= 32 && mirrorY < 208 && mirrorX >= 32 && mirrorX < 320) {
      const index =
        Math.floor((mirrorY - 32) / 32) * 9 + Math.floor((mirrorX - 32) / 32);
      [x, y] = forwardTargets[r === 4 ? 1 : 0][index];
      if (qx >= 320) x = 639 - x;
      if (side !== 0) y = 1151 - y;
      x = clamp(x, xmin, xmax);
    } else {
      [x, y] = predicted(q);
      adjust();
    }
  } else if (r !== 1 && x > xmin && x < xmax) {
    let anchor;
    if (qr > r)
      anchor = side === 0 ? (y >= cy ? ymax : cy) : y <= cy ? ymin : cy;
    else anchor = side === 0 ? (y <= cy ? ymin : cy) : y >= cy ? ymax : cy;
    y = clamp(Math.floor((y + anchor) / 2), ymin, ymax);
  } else adjust();
  return [(576 - y) * unit, (x - 320) * unit];
}
