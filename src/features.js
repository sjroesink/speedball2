import { emit } from "./events.js";
import { warpBall, setBallSpeed, startFlight } from "./ball.js";
import {
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
  s.reserves = [3, 3];
  s.pickupSerial = 0;
  s.pickups = Array.from({ length: 7 }, (_, i) => ({
    kind: i < 2 ? i + 1 : i < 6 ? 13 : 14,
    x: i % 2 ? -5 : 5,
    z: ((i % 3) - 1) * 6,
    wait: 2 + i * 1.5,
    life: 14,
  }));
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
export function damage(s, i, j) {
  const p = s.players[i],
    q = s.players[j];
  if (q.health <= 0 || q.stun > 0 || shielded(s, q.team)) return false;
  const hit = hitDamage(p, q);
  // The renderer exposes energy as a percentage; original full energy is 128.
  q.health = Math.max(0, q.health - (hit * 100) / 128);
  deteriorate(q, hit);
  q.stun = 1.35;
  q.action = 4;
  q.actionTime = 1.35;
  s.charge[q.team] = 0;
  if (s.ball.owner === j)
    Object.assign(s.ball, {
      flightKind: 0,
      owner: -1,
      lastTouch: i,
      x: q.x,
      z: q.z,
      h: 0.5,
      vx: p.fx * 5,
      vz: p.fz * 5,
      vh: 3,
      lock: 0.12,
      after: 0,
      electric: 0,
      charged: false,
    });
  emit(s, 4, i, j, q.x, q.z);
  if (q.health <= 0) {
    q.injury = 6;
    q.stun = 6;
    q.actionTime = 6;
    const t = 1 - q.team;
    const mult =
      (t === 0 && s.multiplier > 0) || (t === 1 && s.multiplier < 0)
        ? 1 + Math.abs(s.multiplier) / 2
        : 1;
    s.score[t] += 10 * mult;
    emit(s, 14, j, t, q.x, q.z);
  }
  return true;
}
export function giveBall(s, i) {
  if (s.players[i].health <= 0 || s.players[i].stun > 0) return;
  const p = s.players[i];
  s.charge = [0, 0];
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
  });
  s.controlled[p.team] = i;
}
export function pickup(s, i, k) {
  const p = s.players[i],
    t = p.team;
  if (k === 13) s.credits[t] += 10;
  else if (k >= 14) equip(p, k);
  else if (k === 7) giveBall(s, i);
  else if (k === 8) {
    // Token.Init_Transport targets roster slot 8, regardless of field position.
    giveBall(s, t * 9 + 8);
  } else if (k === 11) {
    p.health = 100;
    p.stats = defaultStats();
    p.gear = 0;
  } else if (k === 12)
    s.players.forEach((q, j) => {
      if (q.team !== t) damage(s, i, j);
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
export function medicalStep(s, dt) {
  let stopped = false;
  s.players.forEach((p, i) => {
    if (p.injury > 0) {
      stopped = true;
      p.injury = Math.max(0, p.injury - dt);
      p.stun = p.injury;
      p.actionTime = p.injury;
      if (p.injury === 0) {
        if (s.reserves[p.team] > 0) {
          s.reserves[p.team]--;
          p.health = 100;
          p.stats = defaultStats();
          p.statBackup = Array(8).fill(0);
          p.stun = 0;
          p.action = 0;
          p.gear = 0;
          p.z = p.z < 0 ? -10 : 10;
          emit(s, 15, i, s.reserves[p.team], p.x, p.z);
        } else {
          p.stun = 10;
          p.action = 4;
        }
        s.ball.electric = 0;
        s.ball.charged = false;
      }
    } else if (p.health <= 0) p.stun = 10;
  });
  return stopped;
}
export function featureStep(s, dt) {
  for (let slot = 0; slot < s.pickups.length; slot++) {
    const item = s.pickups[slot];
    if (item.wait > 0) {
      item.wait = Math.max(0, item.wait - dt);
      continue;
    }
    item.life -= dt;
    let who = -1;
    // Entity item handlers test team 1's selected player before team 2's.
    for (const i of s.controlled) {
      const p = s.players[i];
      if (!p || p.stun > 0 || p.health <= 0 || p.action === 2) continue;
      if (Math.hypot(p.x - item.x, p.z - item.z) <= 0.85) {
        who = i;
        break;
      }
    }
    if (who >= 0) pickup(s, who, item.kind);
    if (who >= 0 || item.life <= 0) {
      s.pickupSerial++;
      const n = s.pickupSerial + slot;
      item.x = [-12, -5, 5, 12][n % 4];
      item.z = [-7, -3, 3, 7][Math.floor(n / 4) % 4];
      item.wait = who >= 0 ? 8 : 2;
      item.life = 14;
      if (slot < 2) item.kind = 1 + ((item.kind + 1) % 12);
      else if (slot === 6) item.kind = 14 + ((item.kind - 13) % 8);
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
