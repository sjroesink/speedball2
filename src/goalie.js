const unit = 22.4 / 576;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Amiga base_goalie_set_intercept_position (0xfb30), prediction at 0xfed0.
// This is the unselected keeper's positioning branch, not the dive decision.
export function goalieTarget(s, i) {
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
  const line = side === 0 ? ymax : ymin;
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
    intercept = plus > 352 ? 320 : Math.max(256, plus);
    type = 2;
  } else if (x > 368) {
    intercept = minus < 288 ? 320 : Math.min(384, minus);
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
      if (mode === 2 && intercept > 352) {
        intercept = minus;
        type = intercept >= 288 ? 3 : 1;
      }
      if (mode === 3 && intercept < 288) {
        intercept = plus;
        type = intercept <= 352 ? 3 : 1;
      }
      if (type < 0) type = released ? 2 : 3;
    }
    if (type < 0) {
      intercept = minus;
      if (intercept < 288) {
        intercept = plus;
        type = intercept > 352 ? 1 : 3;
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
  if (type >= 2) x = intercept;
  return [(576 - line) * unit, (clamp(x, 160, 480) - 320) * unit];
}
