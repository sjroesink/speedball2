// Amiga attribute order: aggression, attack, defense, speed, throw, power, stamina, intelligence.
export const defaultStats = () => Array(8).fill(100);
export function ensureStats(p) {
  p.stats ??= defaultStats();
  p.statBackup ??= Array(8).fill(0);
}
export function restorePower(s) {
  for (const p of s.players) {
    ensureStats(p);
    p.statBackup.forEach((v, i) => {
      if (v) p.stats[i] = v;
    });
    p.statBackup.fill(0);
  }
}
export function applyPowerStats(s, kind, team) {
  for (const p of s.players) {
    ensureStats(p);
    if (!(
      ((kind === 3 || kind === 6) && p.team !== team) ||
      (kind === 4 && p.team === team) ||
      kind === 5
    ))
      continue;
    for (let i = 0; i < 8; i++) {
      if (kind === 6 && i !== 3) continue;
      p.statBackup[i] = p.stats[i];
      p.stats[i] = kind === 3 || kind === 6 ? 100 : 250;
    }
  }
}
export function equip(p, kind) {
  ensureStats(p);
  const i = kind - 14;
  p.gear = kind;
  p.gearBackup = p.statBackup[i] || p.stats[i];
  if (p.statBackup[i]) {
    p.gearPowerBackup = p.stats[i];
    p.statBackup[i] = 250;
  }
  p.stats[i] = 250;
}
export function unequip(p) {
  if (!p.gear) return;
  ensureStats(p);
  const i = p.gear - 14;
  if (p.statBackup[i]) {
    p.stats[i] = p.gearPowerBackup || 100;
    p.statBackup[i] = p.gearBackup || 100;
  } else p.stats[i] = p.gearBackup || 100;
  p.gear = 0;
  p.gearBackup = 0;
}
export function hitDamage(p, q) {
  ensureStats(p);
  ensureStats(q);
  return Math.max(1, (p.stats[5] + 150 - q.stats[6]) >>> 4);
}
export function deteriorate(p, hit) {
  ensureStats(p);
  const loss = Math.max(1, hit >>> 1);
  p.stats = p.stats.map((v) => Math.max(100, v - loss));
  unequip(p);
}
export function tackleThreshold(p, q, keeper) {
  ensureStats(p);
  ensureStats(q);
  let defense = q.stats[2];
  if (keeper) defense = Math.min(255, defense + (defense >>> 2));
  const dir = (p) => Math.round(Math.atan2(p.fz, p.fx) / (Math.PI / 4));
  defense =
    (defense -
      [32, 24, 16, 8, 0, 8, 16, 24][(dir(q) - dir(p) + 8) & 7] -
      (p.action === 1 ? 16 : 0) -
      (q.action === 2 ? 32 : 0)) &
    255;
  return ((p.stats[1] + 256 - defense) >>> 1) & 255;
}
// Port of the reference add-with-extend/word-swap random generator.
export function randomByte(s) {
  const a = s.rng[0] >>> 0,
    b = s.rng[1] >>> 0;
  const doubled = (a & 65535) * 2;
  const lo = (doubled & 65535) + (b & 65535) + (doubled >>> 16);
  const hi = (a >>> 16) + (b >>> 16) + (lo >>> 16);
  s.rng = [
    (((hi & 65535) << 16) | (lo & 65535)) >>> 0,
    ((a & 0xffff0000) | (doubled & 65535)) >>> 0,
  ];
  return s.rng[0] & 255;
}

// Terrain width 576 maps to 22.4 world units; PAL match logic runs at 25 Hz.
export const velocityUnit = (25 * 22.4) / 576;
export function movementSpeed(p, carrying, keeperBlock = false) {
  ensureStats(p);
  const speed = p.stats[3];
  let level =
    4 + (speed > 140 ? 1 : 0) + (speed > 200 ? 1 : 0) + (carrying ? 0 : 1);
  if (p.action === 1 || p.action === 2)
    level =
      (p.action === 1 ? 5 : 4) +
      (speed > 140 ? 1 : 0) +
      (speed > 170 ? 1 : 0) +
      (speed > 200 ? 1 : 0);
  if (p.action === 1 && keeperBlock) level = 8;
  if (p.action === 3) level = 0;
  return level * velocityUnit;
}

export function referenceDistance(dx, dz) {
  let a = Math.round((Math.abs(dx) * 576) / 22.4),
    b = Math.round((Math.abs(dz) * 576) / 22.4);
  if (a < b) [a, b] = [b, a];
  let distance = a + (b >> 1),
    quarter = b >> 2;
  if (distance >= b * 2) {
    if (distance >= b * 4) quarter += quarter >> 1;
  } else quarter >>= 1;
  return distance - quarter;
}

// get_sustain (Amiga 0xf564), table 0x022a.
export function actionSustain(speed) {
  return [8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 11, 12, 12][
    Math.max(0, Math.min(15, Math.floor((speed - 100) / 10)))
  ];
}
export function canJumpAtBall(p, b, distance, inMultiplier) {
  return (
    b.owner < 0 &&
    !inMultiplier &&
    (b.flightKind ? b.flightStage > 2 : b.h > 1.25) &&
    distance <= 6 * actionSustain(p.stats[3])
  );
}
