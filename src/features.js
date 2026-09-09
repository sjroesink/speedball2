import { worldInViewport } from "./visibility.js";
import { spawnPickup } from "./pickup-spawn.js";
import { beginRestart } from "./restart.js";
import { createMedical, advanceMedical } from "./medical.js";
import { emit } from "./events.js";
import { warpBall, setBallSpeed, startFlight } from "./ball.js";
import {
  referenceDistance,
  fallDuration,
  defaultStats,
  velocityUnit,
  restorePower,
  applyPowerStats,
  equip,
  hitDamage,
  deteriorate,
} from "./attributes.js";
// Match features shared in behavior with server/features.go.
export const powerNames = [
  "",
  "FREEZE",
  "REVERSE CONTROLS",
  "WEAKEN",
  "BOOST",
  "MANIC",
  "SLOW",
  "BALL MAGNET",
  "BALL TRANSPORT",
  "GOAL LOCK",
  "SHIELD",
  "FULL ENERGY",
  "ZAP",
  "CREDITS",
  "AGGRESSION",
  "ATTACK",
  "DEFENCE",
  "SPEED",
  "THROW",
  "POWER",
  "STAMINA",
  "INTELLIGENCE",
];

const cap = (x, a, b) => Math.max(a, Math.min(b, x));
export function initFeatures(s) {
  s.effect = { kind: 0, team: -1, time: 0 };
  s.credits = [0, 0];
  s.cashLimits = s.training ? [10000, 10000] : [2000, 2000];
  s.reserves = [3, 3];
  s.bench = Array.from({ length: 2 }, () =>
    Array.from({ length: 3 }, () => defaultStats()),
  );
  s.pickupSerial = 0;
  s.pickups = Array.from({ length: 7 }, (_, i) => ({
    kind: i < 2 ? i + 1 : i < 6 ? 13 : 14,
    x: i % 2 ? -5 : 5,
    z: ((i % 3) - 1) * 6,
    wait: 2 + i * 1.5,
    life: 14,
  }));
  for (const slot of [2, 3, 4, 5]) spawnPickup(s, slot);
  for (const slot of [3, 4, 5]) s.pickups[slot].wait = s.pickups[2].wait;
  for (const slot of [0, 1, 6]) spawnPickup(s, slot);
}
export const active = (s, k, t) =>
  s.effect.time > 0 &&
  s.effect.kind === k &&
  (t === undefined || s.effect.team === t);
export const shielded = (s, t) => active(s, 10, t);
export function goalBlocked(s, x, direction0) {
  const defender = x * direction0 > 0 ? 1 : 0;
  return active(s, 9, defender);
}
export function damage(s, i, j, ignoreShield = false) {
  const p = s.players[i],
    q = s.players[j];
  if (q.health <= 0 || q.stun > 0 || (!ignoreShield && shielded(s, q.team))) return false;
  const hit = hitDamage(p, q);
  // The renderer exposes energy as a percentage; original full energy is 128.
  q.health = Math.max(0, q.health - (hit * 100) / 128);
  const gear = q.gear;
  deteriorate(q, hit);
  if (gear) {
    const unit = 22.4 / 576;
    const x = (Math.round(320 + q.z / unit) & 0xfe0) + 16;
    const y = (Math.round(576 - q.x / unit) & 0xfe0) + 16;
    Object.assign(s.pickups[6], {kind: gear, x: (576-y)*unit, z: (x-320)*unit, wait: 0, life: 0});
    if (s.armourPickupsLeft === 0) spawnPickup(s, 6);
  }
  q.stun = fallDuration;
  q.fallAttack = 0;
  q.fallAttackTime = 0;
  q.fallFinishing = false;
  q.fallX = q.fallZ = 0;
  q.action = 4;
  q.actionTime = fallDuration;
  q.fallPosePending = true;
  s.charge[q.team] = 0;
  // damage_player leaves possession and ball motion to the attack caller.
  emit(s, 4, i, j, q.x, q.z);
  return true;
}
export function giveBall(s, i) {
  if (s.players[i].health <= 0 || s.players[i].stun > 0) return;
  const p = s.players[i];
  s.charge = [0, 0];
  // Possession transfer starts a held ball, including fresh flight metadata.
  // Keep the object identity: the current simulation tick holds a reference.
  for (const key of Object.keys(s.ball)) delete s.ball[key];
  Object.assign(s.ball, {
    flightKind: 0,
    owner: i,
    lastTouch: i,
    x: p.x,
    z: p.z,
    h: 1,
    vx: 0,
    vz: 0,
    vh: 0,
    electric: 0,
    charged: false,
    after: 0,
    lock: 0,
  });
  s.controlled[p.team] = i;
}
export function pickup(s, i, k) {
  const p = s.players[i],
    t = p.team;
  if (k === 13) s.credits[t] += 100;
  else if (k >= 14) {
    equip(p, k);
    s.pickups[6].kind = 0; // Held equipment has no floor sprite.
    s.armourPickupsLeft = Math.max(0, s.armourPickupsLeft - 1);
  }
  else if (k === 7) giveBall(s, i);
  else if (k === 8) {
    // Token.Init_Transport targets roster slot 8, regardless of field position.
    giveBall(s, t * 9 + 8);
  } else if (k === 11) {
    p.health = 100;
    p.stats = [...(p.baseStats ?? defaultStats())];
    p.gear = 0;
  } else if (k === 12)
    s.players.forEach((q, j) => {
      if (q.team === t || !worldInViewport(s, q)) return;
      const speed = ((q.moveX || q.moveZ) ? 4 : 3) * velocityUnit;
      if (damage(s, i, j)) {
        q.fallX = Math.sign(q.fx) * speed;
        q.fallZ = Math.sign(q.fz) * speed;
        // powerup_zap only releases possession, retaining the ball's motion.
        if (s.ball.owner === j) s.ball.owner = -1;
      }
    });
  else {
    restorePower(s);
    applyPowerStats(s, k, t);
    s.effect = { kind: k, team: t, time: 6 };
    if (k === 1)
      s.players.forEach((q) => {
        if (q.team !== t && q.health > 0) {
          q.action = 0;
          q.actionTime = 0;
          s.charge[q.team] = 0;
        }
      });
  }
  // Injury notifications take precedence over the pickup toast.
  if (s.event.kind !== 14) emit(s, 11, i, k, p.x, p.z);
}
// start_injury runs when the fatal fall animation finishes, not on impact.
export function startInjury(s, i) {
  const p = s.players[i];
  if (
    p.health > 0 ||
    p.actionTime > 1e-9 ||
    s.players.some((q) => q.injury > 0)
  )
    return false;
  const unit = 22.4 / 576;
  const x = Math.max(48, Math.min(592, Math.round(320 + p.z / unit) & ~1));
  const y = Math.max(48, Math.min(1104, Math.round(576 - p.x / unit) & ~1));
  p.x = (576 - y) * unit;
  p.z = (x - 320) * unit;
  p.injury = p.stun = p.actionTime = 1;
  s.medical = createMedical(i, x, y);
  // start_injury 0x10ea6: the stationary injury anchor takes possession.
  // Medical state owns the ball until play can restart, never a roster player.
  Object.assign(s.ball, {
    owner: -1,
    x: p.x,
    z: p.z,
    h: 0.25,
    vx: 0,
    vz: 0,
    vh: 0,
    dirX: 0,
    dirZ: 0,
    flightKind: 0,
    flightIndex: 0,
    flightStage: 0,
    flightFraction: 0,
    multiplierPath: 0,
    multiplierIndex: 0,
    multiplierFraction: 0,
    lock: 0,
    after: 0,
  });
  s.charge = [0, 0];
  p.action = 4;
  p.moveX = p.moveZ = p.fallX = p.fallZ = 0;
  s.controlled[p.team] = i;
  const t = 1 - p.team;
  const mult =
    (t === 0 && s.multiplier > 0) || (t === 1 && s.multiplier < 0)
      ? 1 + Math.abs(s.multiplier) / 2
      : 1;
  s.score[t] += 10 * mult;
  emit(s, 14, i, t, p.x, p.z);
  return true;
}
export function medicalStep(s, dt) {
  const m = s.medical;
  if (!m) return false;
  const p = s.players[m.player],
    i = m.player,
    unit = 22.4 / 576;
  const done = advanceMedical(m, dt);
  p.x = (576 - m.patient[1]) * unit;
  p.z = (m.patient[0] - 320) * unit;
  if (done) {
    const bench = s.bench[p.team];
    const outgoing = p.stats.map((value) => Math.floor(value / 10) * 10);
    p.baseStats = [...bench.shift()];
    p.stats = [...p.baseStats];
    bench.push(outgoing);
    s.reserves[p.team] = bench.length;
    p.health = 100;
    p.injury = 0;
    p.statBackup = Array(8).fill(0);
    p.gearBackup = p.gearPowerBackup = 0;
    p.stun = p.action = p.actionTime = p.cooldown = p.gear = 0;
    p.keeperBlock = false;
    p.tackleResolved = false;
    const direction = (p.team === 0 ? 1 : -1) * (s.period === 2 ? -1 : 1);
    p.x = -direction * 32 * (22.4 / 576);
    p.z = (p.z <= 0 ? -1 : 1) * 272 * (22.4 / 576);
    p.fx = 0;
    p.fz = -Math.sign(p.z);
    p.aiX = p.aiZ = 0;
    p.aiWait = 1;
    emit(s, 15, i, bench.length, p.x, p.z);
    s.ball.electric = 0;
    s.ball.charged = false;
    s.medical = null;
    beginRestart(s);
  }
  return true;
}
export function featureStep(s, dt) {
  for (let slot = 0; slot < s.pickups.length; slot++) {
    const item = s.pickups[slot];
    if (item.wait > 0) {
      item.wait = Math.max(0, item.wait - dt);
      if (item.wait > 1e-9) continue;
      if (slot >= 2 && slot < 6 &&
          s.credits[0] >= s.cashLimits[0] &&
          (s.training || s.credits[1] >= s.cashLimits[1])) {
        item.wait = 256 / 25; // Original byte timer wraps before retrying.
        continue;
      }
      item.wait = 0;
      if (item.kind) emit(s, 21, -1, -1, item.x, item.z, 0.1);
    }
    if (!item.kind) continue;
    let who = -1;
    // Entity item handlers test team 1's selected player before team 2's.
    for (const i of s.controlled) {
      const p = s.players[i];
      if (!p || p.stun > 0 || p.health <= 0 || p.action === 2) continue;
      if (referenceDistance(p.x - item.x, p.z - item.z) <= 16) {
        who = i;
        break;
      }
    }
    if (who >= 0) pickup(s, who, item.kind);
    if (slot < 6) {
      if (who >= 0) spawnPickup(s, slot);
      continue;
    }

  }
}
// Four low-ball tunnels. Preserve direction through the opposite side wall.
export function sideFeature(s) {
  const b = s.ball;
  if (b.flightKind ? b.flightStage > 2 : b.h > 1.25) return false;
  const unit = 22.4 / 576;
  const terrainX = Math.round(320 + b.z / unit),
    terrainY = Math.round(576 - b.x / unit);
  if (
    b.owner < 0 &&
    (terrainX < 32 || terrainX > 608) &&
    ((terrainY >= 355 && terrainY <= 385) ||
      (terrainY >= 767 && terrainY <= 797))
  ) {
    const thrower = s.players[b.lastTouch];
    warpBall(b, thrower?.stats?.[4] ?? 100);
    emit(s, 12, b.lastTouch, -1, b.x, b.z, b.h);
    return true;
  }
  if (b.owner >= 0 && s.players[b.owner].action !== 3) return false;
  for (const [cx, cy] of [
    [20, 880],
    [620, 272],
  ]) {
    const dx = cy - terrainY,
      dz = terrainX - cx;
    if (Math.abs(dx) > 15 || Math.abs(dz) > 15) continue;
    const fx = Math.abs(dx) > Math.abs(dz) >> 1 ? Math.sign(dx) : 0;
    const fz = Math.abs(dz) > Math.abs(dx) >> 1 ? Math.sign(dz) : 0;
    if (!fx && !fz) continue;
    b.z = terrainX <= 320 ? -11.2 : 11.2;
    b.dirX = fx;
    b.dirZ = fz;
    b.vx = fx * 8 * velocityUnit;
    b.vz = fz * 8 * velocityUnit;
    if (b.flightKind) startFlight(b, b.flightKind === 2);
    setBallSpeed(b, s.players[b.lastTouch]?.stats?.[4] ?? 100);
    b.electric = b.electricBudget ?? 0;
    b.charged = true;
    emit(s, 13, b.lastTouch, b.electric, b.x, b.z, b.h);
    return true;
  }
  return false;
}
