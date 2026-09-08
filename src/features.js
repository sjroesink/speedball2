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
const emit = (s, kind, actor, target, x = 0, z = 0, h = 0.5) =>
  (s.event = { id: s.event.id + 1, kind, actor, target, x, z, h });
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
export function strength(s, p) {
  let n = 0.8 + (0.2 * p.health) / 100;
  if (active(s, 3, 1 - p.team)) n *= 0.7;
  if (active(s, 4, p.team) || active(s, 5)) n *= 1.3;
  return n;
}
export const movementFactor = (s, p) =>
  active(s, 1, 1 - p.team)
    ? 0
    : strength(s, p) *
      (active(s, 6, 1 - p.team) ? 0.5 : 1) *
      (p.gear === 17 ? 1.25 : 1);
export const shielded = (s, t) => active(s, 10, t);
export function goalBlocked(s, x, direction0) {
  const defender = x * direction0 > 0 ? 1 : 0;
  return active(s, 9, defender);
}
export function damage(s, i, j, amount = 20) {
  const p = s.players[i],
    q = s.players[j];
  if (q.health <= 0 || q.stun > 0 || shielded(s, q.team)) return false;
  const hit =
    (amount * strength(s, p) * (p.gear === 19 ? 1.4 : 1)) /
    (strength(s, q) * (q.gear === 16 || q.gear === 20 ? 1.3 : 1));
  q.health = Math.max(0, q.health - hit);
  q.gear = 0;
  q.stun = 1.35;
  q.action = 4;
  q.actionTime = 1.35;
  s.charge[q.team] = 0;
  if (s.ball.owner === j)
    Object.assign(s.ball, {
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
function giveBall(s, i) {
  if (s.players[i].health <= 0 || s.players[i].stun > 0) return;
  const p = s.players[i];
  s.charge = [0, 0];
  Object.assign(s.ball, {
    owner: i,
    lastTouch: i,
    x: p.x,
    z: p.z,
    h: 1,
    vx: 0,
    vz: 0,
    vh: 0,
    electric: 0,
    after: 0,
  });
  s.controlled[p.team] = i;
}
export function pickup(s, i, k) {
  const p = s.players[i],
    t = p.team;
  if (k === 13) s.credits[t] += 10;
  else if (k >= 14) p.gear = k;
  else if (k === 7) giveBall(s, i);
  else if (k === 8) {
    const candidates = s.players
      .map((q, j) => ({ q, j }))
      .filter(({ q }) => q.team === t && q.health > 0 && q.stun <= 0);
    const d = (t === 0 ? 1 : -1) * (s.period === 2 ? -1 : 1);
    candidates.sort((a, b) => (b.q.x - a.q.x) * d);
    if (candidates[0]) giveBall(s, candidates[0].j);
  } else if (k === 11) p.health = 100;
  else if (k === 12)
    s.players.forEach((q, j) => {
      if (q.team !== t) damage(s, i, j, 12);
    });
  else {
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
      }
    } else if (p.health <= 0) p.stun = 10;
  });
  return stopped;
}
export function featureStep(s, dt) {
  s.effect.time = Math.max(0, s.effect.time - dt);
  if (s.effect.time === 0) s.effect.kind = 0;
  for (let slot = 0; slot < s.pickups.length; slot++) {
    const item = s.pickups[slot];
    if (item.wait > 0) {
      item.wait = Math.max(0, item.wait - dt);
      continue;
    }
    item.life -= dt;
    let who = -1,
      nearest = 0.85;
    s.players.forEach((p, i) => {
      if (p.stun > 0 || p.health <= 0) return;
      const d = Math.hypot(p.x - item.x, p.z - item.z);
      if (d < nearest) {
        nearest = d;
        who = i;
      }
    });
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
  if (b.h > 1.4) return false;
  if (Math.abs(Math.abs(b.x) - 8) < 0.55) {
    b.z = -Math.sign(b.z) * (11.2 - (Math.abs(b.z) - 11.2));
    emit(s, 12, b.lastTouch, -1, b.x, b.z, b.h);
    return true;
  }
  // Two electro-bounces occupy the walls opposite the star banks.
  if (Math.abs(b.x - 16 * Math.sign(b.z)) < 0.7 && b.lastTouch >= 0) {
    const t = s.players[b.lastTouch].team;
    b.electric =
      1 +
      ((t === 0 && s.multiplier > 0) || (t === 1 && s.multiplier < 0)
        ? Math.abs(s.multiplier)
        : 0);
    emit(s, 13, b.lastTouch, b.electric, b.x, b.z, b.h);
  }
  return false;
}
