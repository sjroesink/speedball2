import { enterMultiplier, runMultiplier } from "./multiplier.js";
import {
  setBallSpeed,
  slowBall,
  reflectBall,
  steerRelease,
  startFlight,
  flightStep,
} from "./ball.js";
import {
  defaultStats,
  tackleThreshold,
  randomByte,
  restorePower,
  referenceDistance,
  movementSpeed,
  ensureStats,
  velocityUnit,
} from "./attributes.js";
import {
  initFeatures,
  active,
  shielded,
  goalBlocked,
  damage,
  giveBall,
  medicalStep,
  featureStep,
  sideFeature,
} from "./features.js";
// Local training counterpart of server/game.go. Coordinates: X upfield, Z across.
export const formation = [
  [-19, 0],
  [-14, -6],
  [-14, 0],
  [-14, 6],
  [-8, -7],
  [-8, 0],
  [-8, 7],
  [-3, -4],
  [-3, 4],
];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const norm = (x, z) => {
  const d = Math.hypot(x, z);
  return d < 0.001 ? [0, 0] : [x / d, z / d];
};
export function eightWay(x, z) {
  if (Math.hypot(x, z) < 0.01) return [0, 0];
  const a = (Math.round(Math.atan2(z, x) / (Math.PI / 4)) * Math.PI) / 4;
  return [Math.round(Math.cos(a)), Math.round(Math.sin(a))];
}
export const direction = (s, t) =>
  (t === 0 ? 1 : -1) * (s.period === 2 ? -1 : 1);
export function initial() {
  const s = {
    players: [],
    rng: [0x31415926, 0x53589793],
    ball: {},
    score: [0, 0],
    time: 90,
    tick: 0,
    over: false,
    period: 1,
    pause: 0,
    controlled: [7, 16],
    charge: [0, 0],
    event: { id: 0, kind: 0, x: 0, z: 0, h: 0, actor: -1, target: -1 },
    previous: [{}, {}],
    stars: [0, 0],
    multiplier: 0,
  };
  resetPitch(s);
  initFeatures(s);
  return s;
}
export function resetPitch(s) {
  const old = s.players;
  s.players = Array.from({ length: 18 }, (_, i) => {
    const team = Math.floor(i / 9),
      d = direction(s, team);
    return {
      x: formation[i % 9][0] * d,
      z: formation[i % 9][1],
      team,
      fx: d,
      fz: 0,
      stats: s.tick > 0 ? [...old[i].stats] : defaultStats(),
      statBackup:
        s.tick > 0
          ? [...(old[i].statBackup ?? Array(8).fill(0))]
          : Array(8).fill(0),
      gearBackup: s.tick > 0 ? old[i].gearBackup : 0,
      gearPowerBackup: s.tick > 0 ? old[i].gearPowerBackup : 0,
      health: s.tick > 0 ? old[i].health : 100,
      gear: s.tick > 0 ? old[i].gear : 0,
      injury: 0,
      stun: s.tick > 0 && old[i].health <= 0 ? 10 : 0,
      actionTime: 0,
      cooldown: 0,
      action: 0,
    };
  });
  s.ball = {
    x: 0,
    z: 0,
    h: 3,
    vx: 0,
    vz: 0,
    vh: 0,
    owner: -1,
    lastTouch: -1,
    lock: 0,
    after: 0,
    electric: 0,
  };
  s.charge = [0, 0];
}
function event(s, kind, actor, target, x, z, h) {
  s.event = { id: s.event.id + 1, kind, actor, target, x, z, h };
}
export const jumpHeight = (p) =>
  p.action === 2 && p.actionTime > 0
    ? Math.sin(((0.7 - p.actionTime) / 0.7) * Math.PI) * 1.8
    : 0;
export function selectPlayers(s) {
  for (let t = 0; t < 2; t++) {
    const b = s.ball;
    if (b.owner >= 0 && s.players[b.owner].team === t) {
      s.controlled[t] = b.owner;
      continue;
    }
    let best = -1,
      dist = Infinity;
    s.players.forEach((p, i) => {
      if (p.team !== t || p.stun > 0) return;
      const d = referenceDistance(p.x - b.x, p.z - b.z);
      if (d <= dist) {
        best = i;
        dist = d;
      }
    });
    if (best >= 0) s.controlled[t] = best;
  }
}
export function throwBall(s, i, lob, input = {}) {
  const p = s.players[i],
    b = s.ball,
    speed = 8 * velocityUnit;
  ensureStats(p);
  const [fx, fz] = eightWay(p.fx, p.fz);
  Object.assign(b, {
    x: p.x + p.fx * 0.9,
    z: p.z + p.fz * 0.9,
    h: 1,
    dirX: fx,
    dirZ: fz,
    vx: fx * speed,
    vz: fz * speed,
    vh: lob ? 11 : 2,
    owner: -1,
    lastTouch: i,
    lock: 0.18,
    after: 0,
    electric: 0,
    electricBudget:
      1 +
      ((p.team === 0 && s.multiplier > 0) || (p.team === 1 && s.multiplier < 0)
        ? Math.abs(s.multiplier)
        : 0),
  });
  steerRelease(b, input);
  setBallSpeed(b, p.stats[4]);
  startFlight(b, lob);
  p.action = 3;
  p.actionTime = 0.32;
  event(s, 3, i, -1, b.x, b.z, b.h);
}
// Advance the ball to a free teammate when a carrier is pressed in its own half.
export function passTarget(s, i) {
  const p = s.players[i],
    d = direction(s, p.team);
  let best = -1,
    value = -Infinity;
  s.players.forEach((q, j) => {
    const advance = (q.x - p.x) * d,
      distance = Math.hypot(q.x - p.x, q.z - p.z);
    if (
      j === i ||
      q.team !== p.team ||
      q.stun > 0 ||
      advance < 2 ||
      distance > 15
    )
      return;
    const space = Math.min(
      ...s.players
        .filter((r) => r.team !== p.team && r.stun <= 0)
        .map((r) => Math.hypot(r.x - q.x, r.z - q.z)),
      10,
    );
    const score = space * 2 + advance - distance * 0.4;
    if (space > 2.5 && score > value) {
      value = score;
      best = j;
    }
  });
  return best;
}
export function points(s, t, base) {
  return (t === 0 && s.multiplier > 0) || (t === 1 && s.multiplier < 0)
    ? base + (base * Math.abs(s.multiplier)) / 2
    : base;
}
export function wallBonus(s) {
  const b = s.ball;
  if (b.lastTouch < 0) return;
  const t = s.players[b.lastTouch].team;
  if (b.owner >= 0 && s.players[b.owner].action !== 3) return;
  const unit = 22.4 / 576;
  const terrainX = Math.round(320 + b.z / unit),
    terrainY = Math.round(576 - b.x / unit);
  const group = terrainX <= 32 ? 0 : terrainX >= 608 ? 1 : -1;
  if (group < 0) return;
  const start = group === 0 ? 384 : 608;
  if (terrainY < start || terrainY >= start + 160) return;
  const index = (terrainY - start) >> 5;
  const owner = s.period === 2 ? 1 - group : group,
    mask = 1 << index;
  if (t === owner && !(s.stars[group] & mask)) {
    s.stars[group] |= mask;
    const n = points(s, t, 2);
    s.score[t] += n;
    event(s, 8, t, n, b.x, b.z, 1);
  } else if (t !== owner && s.stars[group] & mask) {
    s.stars[group] &= ~mask;
    const n = 2;
    s.score[owner] = Math.max(0, s.score[owner] - n);
    event(s, 10, owner, n, b.x, b.z, 1);
  }
}
export function domeBounce(s) {
  const b = s.ball,
    unit = 22.4 / 576;
  if (b.owner >= 0 || (b.flightKind ? b.flightStage > 2 : b.h > 1.25)) return;
  for (const center of [256 * unit, -256 * unit]) {
    const dx = Math.round((b.x - center) / unit),
      dz = Math.round(b.z / unit);
    if (
      Math.abs(dx) > 16 ||
      Math.abs(dz) > 16 ||
      referenceDistance(dx * unit, dz * unit) > 16
    )
      continue;
    // get_object_to_point_direction uses strict half-axis tests, not atan2.
    const fx = Math.abs(dx) > Math.abs(dz) >> 1 ? Math.sign(dx) : 0;
    const fz = Math.abs(dz) > Math.abs(dx) >> 1 ? Math.sign(dz) : 0;
    if (!fx && !fz) continue;
    b.dirX = fx;
    b.dirZ = fz;
    b.vx = fx * 8 * velocityUnit;
    b.vz = fz * 8 * velocityUnit;
    if (b.flightKind) startFlight(b, b.flightKind === 2);
    setBallSpeed(b, s.players[b.lastTouch]?.stats?.[4] ?? 100);
    if (b.lastTouch >= 0) {
      const t = s.players[b.lastTouch].team,
        n = points(s, t, 2);
      s.score[t] += n;
      event(s, 8, t, n, b.x, b.z, b.h);
    }
  }
}
export function step(
  s,
  dt,
  input = {},
  humans = [true, false],
  secondInput = {},
) {
  const inputs = [input, secondInput];
  s.tick++;
  if (s.over) return;
  matchClock(s, dt);
  if (medicalStep(s, dt)) {
    s.previous = inputs.map((u) => ({ ...u }));
    return;
  }
  if (s.pause > 0) {
    s.pause = Math.max(0, s.pause - dt);
    s.previous = inputs.map((u) => ({ ...u }));
    return;
  }
  featureStep(s, dt);
  if (s.players.some((p) => p.injury > 0)) {
    s.previous = inputs.map((u) => ({ ...u }));
    return;
  }
  if (s.time === 0) {
    if (s.period === 1) {
      s.period = 2;
      s.time = 90;
      s.stars = [0, 0];
      s.multiplier = 0;
      s.pause = 3;
      resetPitch(s);
      event(s, 6, -1, -1, 0, 0, 0);
    } else s.over = true;
    return;
  }
  const b = s.ball;
  b.lock = Math.max(0, b.lock - dt);
  b.after = Math.max(0, b.after - dt);
  for (const p of s.players) {
    p.stun = Math.max(0, p.stun - dt);
    p.actionTime = Math.max(0, p.actionTime - dt);
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.actionTime === 0) p.action = 0;
  }
  selectPlayers(s);
  for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i];
    if (p.stun > 0) continue;
    const t = p.team,
      human = humans[t] && s.controlled[t] === i;
    let u = inputs[t],
      dx = u.x || 0,
      dz = u.z || 0;
    if (human && active(s, 2, 1 - t)) {
      dx = -dx;
      dz = -dz;
    }
    if (active(s, 1, 1 - t)) continue;
    if (!human) {
      const d = direction(s, t);
      let tx = formation[i % 9][0] * d,
        tz = formation[i % 9][1];
      if (b.owner === i) {
        tx = d * 22;
        tz = clamp(p.z * 0.4, -2, 2);
      } else if (i % 9 === 0) {
        tx = -d * 19.5;
        tz = clamp(b.z, -1.55, 1.55);
      } else if (s.controlled[t] === i) {
        tx = b.x + b.vx * (p.gear === 21 ? 0.3 : 0.15);
        tz = b.z + b.vz * (p.gear === 21 ? 0.3 : 0.15);
      } else {
        tx += clamp(b.x * 0.35, -6, 6);
        if (b.owner >= 0 && s.players[b.owner].team === t) tx += d * 5;
        tz += b.z * 0.18;
      }
      [dx, dz] = norm(tx - p.x, tz - p.z);
      if (Math.hypot(tx - p.x, tz - p.z) < 0.3) {
        dx = 0;
        dz = 0;
      }
      u = {};
      if (
        p.cooldown <= 0 &&
        Math.hypot(b.x - p.x, b.z - p.z) < (p.gear === 14 ? 4 : 3) &&
        b.owner !== i
      ) {
        if (b.h > 1.4) u.shoot = true;
        else if (
          (b.owner >= 0 && s.players[b.owner].team !== t) ||
          (i % 9 === 0 && b.owner < 0 && Math.hypot(b.vx, b.vz) > 4)
        )
          u.tackle = true;
      }
      if (b.owner === i) {
        const danger = s.players.some(
          (q) => q.team !== t && Math.hypot(q.x - p.x, q.z - p.z) < 3,
        );
        if (p.x * d > 12 || danger || i % 9 === 0) {
          const receiver = p.x * d < 10 ? passTarget(s, i) : -1;
          const target =
            receiver >= 0 ? s.players[receiver] : { x: d * 23, z: 0 };
          [p.fx, p.fz] = norm(target.x - p.x, target.z - p.z);
          throwBall(s, i, receiver < 0 && danger && p.x * d < 10);
        }
      }
    }
    if (human) [dx, dz] = eightWay(dx, dz);
    if (p.action !== 1 && p.action !== 3 && Math.hypot(dx, dz) > 0.01)
      [p.fx, p.fz] = norm(dx, dz);
    const prev = s.previous[t],
      pressed = human
        ? (u.shoot && !prev.shoot) ||
          (u.tackle && !prev.tackle) ||
          (u.fire || 0) > (prev.fire || 0) ||
          (u.tackleId || 0) > (prev.tackleId || 0)
        : u.shoot || u.tackle;
    if (human && b.owner === i) {
      if ((u.lob && !prev.lob) || (u.lobId || 0) > (prev.lobId || 0)) {
        throwBall(s, i, true, u);
        s.charge[t] = 0;
      } else {
        const fire =
          (u.shoot && !prev.shoot) || (u.fire || 0) > (prev.fire || 0);
        if (fire && s.charge[t] === 0 && p.actionTime <= 0) {
          s.charge[t] = dt;
          p.action = 3;
          p.actionTime = 0.32;
          p.lowThrow = !u.shoot;
        } else if (s.charge[t] > 0) s.charge[t] += dt;
        if (s.charge[t] > 0) {
          p.lowThrow ||= !u.shoot;
          if (s.charge[t] >= 0.16) {
            throwBall(s, i, !p.lowThrow, u);
            s.charge[t] = 0;
          }
        }
      }
    } else if (human) s.charge[t] = 0;
    if (pressed && b.owner !== i && p.cooldown <= 0 && p.actionTime <= 0) {
      if (b.h > 1.5 && Math.hypot(b.x - p.x, b.z - p.z) < 4 && !u.tackle) {
        p.action = 2;
        p.actionTime = 0.7;
        p.cooldown = 0.85;
        event(s, 2, i, -1, p.x, p.z, 0);
      } else {
        p.action = 1;
        p.tackleResolved = false;
        p.actionTime = 0.38;
        p.cooldown = 0.85;
        event(s, 1, i, -1, p.x, p.z, 0);
      }
    }
    if (p.action === 1) {
      dx = p.fx;
      dz = p.fz;
    }
    [dx, dz] = eightWay(dx, dz);
    const keeperBlock =
      i % 9 === 0 &&
      b.owner < 0 &&
      Math.hypot(b.vx, b.vz) > 0 &&
      Math.abs(p.fz) > 0.1;
    const speed = active(s, 1, 1 - t)
      ? 0
      : movementSpeed(p, b.owner === i, keeperBlock);
    p.x = clamp(p.x + dx * speed * dt, -20.5, 20.5);
    p.z = clamp(p.z + dz * speed * dt, -10.7, 10.7);
    if (i % 9 === 0) {
      const d = direction(s, t);
      p.x = d * clamp(p.x * d, -20.5, -15);
    }
  }
  for (let o = 0; o < 18; o++) {
    const i = s.tick % 2 === 0 ? 17 - o : o,
      p = s.players[i];
    if (p.stun > 0) continue;
    if (p.action === 1 && !p.tackleResolved)
      s.players.some((q, j) => {
        if (
          q.team === p.team ||
          q.stun > 0 ||
          q.health <= 0 ||
          shielded(s, q.team)
        )
          return false;
        const dx = q.x - p.x,
          dz = q.z - p.z;
        if (Math.hypot(dx, dz) < 1.15) {
          // sub_ED92 switches out of contact checks at the first eligible opponent.
          p.tackleResolved = true;
          if (randomByte(s) > tackleThreshold(p, q, j % 9 === 0)) return true;
          const hadBall = s.ball.owner === j;
          if (damage(s, i, j)) {
            if (hadBall) giveBall(s, i);
            q.x = clamp(q.x + p.fx * 0.7, -20.5, 20.5);
            q.z = clamp(q.z + p.fz * 0.7, -10.7, 10.7);
          }
          return true;
        }
      });
  }
  for (let i = 0; i < 18; i++) {
    const p = s.players[i];
    for (let j = i + 1; j < 18; j++) {
      const q = s.players[j];
      if (p.stun > 0 || q.stun > 0 || p.action === 1 || q.action === 1)
        continue;
      const dx = q.x - p.x,
        dz = q.z - p.z,
        d = Math.hypot(dx, dz);
      if (d > 0.001 && d < 0.85) {
        const push = (0.85 - d) * 0.5;
        p.x = clamp(p.x - (dx / d) * push, -20.5, 20.5);
        p.z = clamp(p.z - (dz / d) * push, -10.7, 10.7);
        q.x = clamp(q.x + (dx / d) * push, -20.5, 20.5);
        q.z = clamp(q.z + (dz / d) * push, -10.7, 10.7);
      }
    }
  }
  if (s.players.some((p) => p.injury > 0)) {
    s.previous = inputs.map((u) => ({ ...u }));
    return;
  }
  if (b.owner >= 0) {
    b.multiplierPath = 0;
    const p = s.players[b.owner];
    b.x = p.x + p.fx * 0.5;
    b.z = p.z + p.fz * 0.5;
    b.h = 1;
    b.vx = b.vz = b.vh = 0;
  } else if (enterMultiplier(b) ? runMultiplier(s, 0) : runMultiplier(s, dt)) {
    // The original multiplier animation owns the ball position while inside.
  } else {
    slowBall(b, dt);
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    if (!flightStep(b, dt)) {
      b.h += b.vh * dt;
      b.vh -= 18 * dt;
      if (b.h < 0.25) {
        b.h = 0.25;
        b.vh = b.vh < -2 ? -b.vh * 0.5 : 0;
      }
    }
    const specialContact = sideFeature(s);
    if (Math.abs(b.z) > 11.2 && !specialContact) {
      event(s, 5, b.lastTouch, -1, b.x, b.z, b.h);
      wallBonus(s);
      b.z = Math.sign(b.z) * (22.4 - Math.abs(b.z));
      reflectBall(b, "z");
    } else wallBonus(s);
    if (Math.abs(b.x) > 21) {
      if (
        Math.abs(b.z) < 1.85 &&
        (b.flightKind ? b.flightStage <= 2 : b.h < 2) &&
        !goalBlocked(s, b.x, direction(s, 0))
      ) {
        const scorer = b.x * direction(s, 0) < 0 ? 1 : 0;
        s.score[scorer] += points(s, scorer, 10);
        event(s, 7, scorer, -1, b.x, b.z, b.h);
        resetPitch(s);
        s.pause = 1.4;
        s.previous = inputs.map((u) => ({ ...u }));
        return;
      } else {
        b.x = Math.sign(b.x) * (42 - Math.abs(b.x));
        reflectBall(b, "x");
        event(s, 5, b.lastTouch, -1, b.x, b.z, b.h);
      }
    }
    b.domeFraction = (b.domeFraction ?? 0) + dt * 25;
    if (b.domeFraction >= 1 - 1e-9) {
      b.domeFraction = Math.max(
        0,
        b.domeFraction - Math.floor(b.domeFraction + 1e-9),
      );
      domeBounce(s);
    }
    if (b.lock <= 0) {
      let best = -1,
        dist = 0.8;
      s.players.forEach((p, i) => {
        if (
          p.stun > 0 ||
          (b.flightKind
            ? b.flightStage > 2 && p.action !== 2
            : b.h > 1.25 + jumpHeight(p))
        )
          return;
        const d = Math.hypot(p.x - b.x, p.z - b.z);
        if (
          d < 0.8 &&
          b.electric > 0 &&
          b.lastTouch >= 0 &&
          p.team !== s.players[b.lastTouch].team &&
          !shielded(s, p.team)
        ) {
          if (damage(s, b.lastTouch, i)) {
            b.electric--;
            b.electricBudget = b.electric;
            return;
          }
        }
        if (d < dist) {
          best = i;
          dist = d;
        }
      });
      if (best >= 0) {
        b.electric = 0;
        s.charge[s.players[best].team] = 0;
        b.flightKind = 0;
        b.owner = best;
        b.lastTouch = best;
        b.after = 0;
        s.controlled[s.players[best].team] = best;
        event(s, 16, best, -1, b.x, b.z, b.h);
      }
    }
  }
  s.previous = inputs.map((u) => ({ ...u }));
}

export function matchClock(s, dt) {
  s.matchClock = (s.matchClock ?? 0) + dt;
  while (s.matchClock >= 1 - 1e-9) {
    s.matchClock = Math.max(0, s.matchClock - 1);
    s.stars.forEach((bits, group) => {
      if (bits !== 31) return;
      s.stars[group] = 0;
      const owner = s.period === 2 ? 1 - group : group,
        n = points(s, owner, 10);
      s.score[owner] += n;
      event(s, 8, owner, n, 0, 0, 1);
    });
    if (s.pause <= 0 && !s.players.some((p) => p.injury > 0))
      s.time = Math.max(0, s.time - 1);
    if (s.effect.kind) {
      s.effect.time = Math.max(0, s.effect.time - 1);
      if (s.effect.time === 0) {
        restorePower(s);
        s.effect.kind = 0;
      }
    }
  }
}
