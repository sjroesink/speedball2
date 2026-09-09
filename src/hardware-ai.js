import { directionKey, opponentDirections } from "./defensive-pass.js";
const unit = 22.4 / 576;

// Amiga use_court_hardware_ai (0xf3a8), before carrier movement/pass choices.
export function hardwareThrow(s, i, random, distances) {
  if (i % 9 === 0) return null;
  const p = s.players[i];
  const x = Math.round(320 + p.z / unit),
    y = Math.round(576 - p.x / unit);
  const blocked = opponentDirections(s, i, distances);
  const plan = (tx, ty, high) => {
    const x = (576 - ty) * unit,
      z = (tx - 320) * unit;
    return { receiver: -1, x, z, high, key: directionKey(p, x, z) };
  };
  const clear = (p) => s.ball.charged || !blocked.includes(p.key);
  const maximum = s.multiplier === (p.team === 0 ? 2 : -2);
  if (
    !maximum &&
    ((x >= 48 && x <= 64 && (y < 576 || y > 640)) ||
      (x >= 576 && x <= 592 && (y < 512 || y > 576)))
  ) {
    const target = plan(x, 576, false);
    if (clear(target)) return target;
  }
  if (x <= 213 || x > 426) {
    const target = x <= 213 ? plan(32, 464, true) : plan(608, 688, true);
    const d = (p.team === 0 ? 1 : -1) * (s.period === 2 ? -1 : 1);
    if (clear(target) && (target.key === d * 3 - 1 || target.key === d * 3 + 1))
      return target;
  }
  if (!s.ball.charged && Math.floor(p.stats[0] / 2) > random) {
    for (const [tx, ty] of [
      [20, 880],
      [620, 272],
    ]) {
      if (Math.abs(tx - x) > 106 || Math.abs(ty - y) > 106) continue;
      const target = plan(tx, ty, false);
      if (
        !blocked.includes(target.key) &&
        target.key !== 3 &&
        target.key !== -3
      )
        return target;
    }
  }
  return null;
}
