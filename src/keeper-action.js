import { actionSustain } from "./attributes.js";
import { worldInViewport } from "./visibility.js";
const unit = 22.4 / 576;

// active_goalie_no_ball_ai, Amiga 0xfcf4–0xfd60: immediate actions.
export function keeperAction(s, i, distance, random) {
  const p = s.players[i],
    b = s.ball;
  if (b.owner >= 0 && s.players[b.owner].team === p.team) return null;
  const q = b.owner < 0 ? b : s.players[b.owner];
  const vx = b.owner < 0 ? b.vx : q.moveX || 0,
    vz = b.owner < 0 ? b.vz : q.moveZ || 0;
  const side = p.team ^ (s.period === 2 ? 1 : 0);
  const ymin = side === 0 ? 960 : 48,
    ymax = side === 0 ? 1104 : 192;
  let x = Math.round(q.z / unit + 320),
    y = Math.round(576 - q.x / unit);
  const attack =
    worldInViewport(s, p) && distance <= 8 * actionSustain(p.stats[3]);
  if (attack) {
    let shift = Math.max(0, Math.min(2, Math.floor((p.stats[7] - 100) / 50)));
    const dx = Math.round(vz / unit / 25),
      dy = -Math.round(vx / unit / 25);
    while (shift > 0) {
      const next = y + dy * 2 ** shift;
      if ((side !== 0 || next <= ymax) && next >= ymin) break;
      shift--;
    }
    x += dx * 2 ** shift;
    y += dy * 2 ** shift;
  } else {
    if (vx || vz || Math.floor(p.stats[0] / 2) <= random) return null;
    x = Math.max(160, Math.min(480, x));
    y = Math.max(ymin, Math.min(ymax, y));
  }
  const tx = (576 - y) * unit,
    tz = (x - 320) * unit;
  const dx = Math.round(tx / unit) - Math.round(p.x / unit),
    dz = Math.round(tz / unit) - Math.round(p.z / unit);
  return {
    attack,
    tx,
    tz,
    x: Math.abs(dx) > Math.floor(Math.abs(dz) / 2) ? Math.sign(dx) : 0,
    z: Math.abs(dz) > Math.floor(Math.abs(dx) / 2) ? Math.sign(dz) : 0,
  };
}
