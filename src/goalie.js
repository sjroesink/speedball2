import { startFlight, setBallSpeed } from "./ball.js";
import { velocityUnit } from "./attributes.js";

// goalie_deflect_ball (0xed52), table 0xedf4. The last thrower is preserved.
export function deflectBall(s, i) {
  const p = s.players[i],
    b = s.ball;
  const side = Math.floor(i / 9) ^ (s.period === 2 ? 1 : 0);
  const facing = (Math.round(Math.atan2(p.fz, p.fx) / (Math.PI / 4)) + 8) % 8;
  const dir = [
    [0, 0, 1, 2, 0, 6, 7, 0],
    [4, 2, 3, 4, 4, 4, 5, 6],
  ][side][facing];
  b.dirX = Math.round(Math.cos((dir * Math.PI) / 4));
  b.dirZ = Math.round(Math.sin((dir * Math.PI) / 4));
  b.vx = b.dirX * 8 * velocityUnit;
  b.vz = b.dirZ * 8 * velocityUnit;
  const thr = p.stats[4];
  setBallSpeed(b, ((thr >> 1) | thr) >> 1);
  startFlight(b, true);
  if (b.lastTouch >= 0 && s.players[b.lastTouch].team !== p.team) {
    b.electric = 0;
    b.charged = false;
  }
}

const unit = 22.4 / 576;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Amiga base_goalie_set_intercept_position (0xfb30), prediction at 0xfed0.
// Selected positioning adds the active keeper averaging rules at 0xfd60–0xfece.
export function goalieTarget(s, i, selected = false) {
  const side = Math.floor(i / 9) ^ (s.period === 2 ? 1 : 0);
  const p = s.players[i],
    loose = s.ball.owner < 0;
  const q = loose ? s.ball : s.players[s.ball.owner];
  let x = Math.round(q.z / unit + 320),
    y = Math.round(576 - q.x / unit);
  const vx = Math.round((loose ? q.vz : q.moveZ || 0) / unit / 25);
  const vy = -Math.round((loose ? q.vx : q.moveX || 0) / unit / 25);
  let shift = clamp(Math.floor(((p.stats?.[7] ?? 100) - 100) / 50), 0, 2);
  const ymin = side === 0 ? 960 : 48,
    ymax = side === 0 ? 1104 : 192;
  while (shift > 0) {
    const next = y + vy * 2 ** shift;
    if ((side !== 0 || next <= ymax) && next >= ymin) break;
    shift--;
  }
  x += vx * 2 ** shift;
  y += vy * 2 ** shift;
  const line = selected ? (side === 0 ? 1120 : 32) : side === 0 ? ymax : ymin;
  const low = selected ? 272 : 288,
    high = selected ? 368 : 352;
  const spread = Math.abs(line - y),
    plus = x + spread,
    minus = x - spread;
  const fx = loose ? (q.dirX ?? 0) : q.fx;
  const fz = loose ? (q.dirZ ?? 0) : q.fz;
  // Original directions: 0 up, 2 right, 4 down, 6 left.
  const dir = ((Math.round(Math.atan2(fz, fx) / (Math.PI / 4)) % 8) + 8) % 8;
  let type = -1,
    intercept = 0;
  if (x < 272) {
    intercept = plus > high ? 320 : Math.max(selected ? 272 : 256, plus);
    type = 2;
  } else if (x > 368) {
    intercept = selected
      ? minus > 272
        ? 320
        : minus
      : minus < 288
        ? 320
        : Math.min(384, minus);
    type = 2;
  } else {
    let mode = 0;
    if (side === 0 ? y < 1024 : y > 128) type = 1;
    else if (dir === (side === 0 ? 4 : 0)) mode = 1;
    else if (dir === (side === 0 ? 3 : 1)) mode = 2;
    else if (dir === (side === 0 ? 5 : 7)) mode = 3;
    const released = loose || q.action === 3;
    if (mode === 1 && released) type = 1;
    else if (mode === 2 || mode === 3) {
      intercept = mode === 2 ? plus : minus;
      if (mode === 2 && intercept > high) {
        intercept = minus;
        type = intercept >= low ? 3 : 1;
      }
      if (mode === 3 && intercept < low) {
        intercept = plus;
        type = intercept <= high ? 3 : 1;
      }
      if (type < 0) type = released ? 2 : 3;
    }
    if (type < 0) {
      intercept = minus;
      if (intercept < low) {
        intercept = plus;
        type = intercept > high ? 1 : 3;
      } else {
        intercept = plus;
        if (intercept <= 352) type = 1;
        else {
          intercept = minus;
          type = 3;
        }
      }
    }
  }
  if (type === 3) intercept = Math.floor((intercept + x) / 2);
  if (type >= 2) x = selected ? Math.floor((x + intercept) / 2) : intercept;
  const targetY = selected
    ? clamp(Math.floor((y + line) / 2), ymin, ymax)
    : line;
  return [(576 - targetY) * unit, (clamp(x, 160, 480) - 320) * unit];
}
