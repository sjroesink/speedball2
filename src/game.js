import { localInteraction } from "./interaction.js";
import { contactDistances, blockPlayerMovement } from "./collision.js";
import { steerToTarget, predictedTarget } from "./steering.js";
import { goalieTarget, deflectBall } from "./goalie.js";
import { supportTarget } from "./support.js";
import { emit as event } from "./events.js";
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
  actionDuration,
  canJumpAtBall,
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
export const pitchLengthLimit = 544 * (22.4 / 576);
export const goalHalfWidth = 48 * (22.4 / 576);
export const simulationRate = 25;
export const simulationStep = 1 / simulationRate;
// Local training counterpart of server/game.go. Coordinates: X upfield, Z across.
// Launch coordinates from the original player records (terrain X, Y).
const launchPositions = [
  [
    [320, 1104],
    [213, 992],
    [426, 992],
    [213, 768],
    [426, 768],
    [320, 800],
    [106, 576],
    [426, 576],
    [320, 640],
  ],
  [
    [320, 48],
    [426, 160],
    [213, 160],
    [426, 384],
    [213, 384],
    [320, 352],
    [533, 576],
    [213, 576],
    [320, 512],
  ],
];
const terrainUnit = 22.4 / 576;
export const playerLimitX = 528 * terrainUnit;
export const playerLimitZ = 272 * terrainUnit;
export function launchPosition(s, i) {
  const side = Math.floor(i / 9) ^ (s.period === 2 ? 1 : 0);
  const [x, y] = launchPositions[side][i % 9];
  return [(576 - y) * terrainUnit, (x - 320) * terrainUnit];
}
// reset_player_timer, Amiga reaction_time_table at 0x01fa.
export function aiReactionTime(intelligence) {
  const index = Math.max(
    0,
    Math.min(15, Math.floor((intelligence - 100) / 10)),
  );
  return (
    [16, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 9, 8][index] / 25
  );
}
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
    const [x, z] = launchPosition(s, i);
    return {
      x,
      z,
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
      jumping: false,
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
    charged: false,
  };
  s.charge = [0, 0];
}
export const jumpHeight = (p) =>
  p.action === 2 && p.actionTime > 0
    ? Math.sin(
        clamp(
          (actionDuration(2, p.stats[3]) - p.actionTime) /
            (actionDuration(2, p.stats[3]) - 2 / 25),
          0,
          1,
        ) * Math.PI,
      ) * 1.8
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
// Modes: 1 samples human input at release, 2 forces low, 3 forces high.
function beginThrow(s, i, mode) {
  const p = s.players[i];
  p.action = 3;
  p.actionTime = 8 / 25;
  p.throwMode = mode;
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
    charged: false,
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
  p.actionTime = 4 / 25;
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
    if (p.stun < 1e-9) p.stun = 0;
    p.actionTime = Math.max(0, p.actionTime - dt);
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.cooldown < 1e-9) p.cooldown = 0;
    p.aiWait = Math.max(0, (p.aiWait || 0) - dt);
    if (p.actionTime < 1e-9) p.action = p.actionTime = 0;
    if (p.action !== 2) p.jumping = false;
  }
  slowBall(b, dt);
  const inMultiplier =
    b.owner < 0 &&
    (enterMultiplier(b) ? runMultiplier(s, 0) : runMultiplier(s, dt));
  let specialContact = false;
  if (!inMultiplier) {
    specialContact = sideFeature(s);
    wallBonus(s);
    b.domeFraction = (b.domeFraction ?? 0) + dt * 25;
    if (b.domeFraction >= 1 - 1e-9) {
      b.domeFraction = Math.max(
        0,
        b.domeFraction - Math.floor(b.domeFraction + 1e-9),
      );
      domeBounce(s);
    }
  }
  selectPlayers(s);
  const contacts = contactDistances(s.players);
  const catchDistances = s.players.map((p) =>
    referenceDistance(p.x - b.x, p.z - b.z),
  );
  // step_sprites processes team two then team one at each roster index.
  for (let order = 0; order < s.players.length; order++) {
    const i = Math.floor(order / 2) + (order % 2 === 0 ? 9 : 0);
    const p = s.players[i];
    catchBall(s, i, catchDistances);
    // Catching precedes jumping_action_fn, which clears jumping on landing.
    if (p.action === 2 && p.jumping && p.actionTime <= 2 / 25 + 1e-9) {
      p.jumping = false;
      event(s, 18, i, -1, p.x, p.z, 0);
    }
    if (p.action === 1 && !p.slideEnding && p.actionTime <= 1 / 25 + 1e-9) {
      p.slideEnding = true;
      event(s, 19, i, -1, p.x, p.z, 0);
    }
    if (p.stun > 0) {
      p.moveX = p.moveZ = 0;
      if (p.action === 4 && p.health > 0) {
        p.moveX = p.fallX || 0;
        p.moveZ = p.fallZ || 0;
        blockPlayerMovement(s.players, i, contacts[i], dt);
      }
      continue;
    }
    resolveTackle(s, i, contacts[i]);
    const t = p.team,
      human = humans[t] && s.controlled[t] === i;
    let u = inputs[t],
      dx = u.x || 0,
      dz = u.z || 0;
    if (human && active(s, 2, 1 - t)) {
      dx = -dx;
      dz = -dz;
    }
    if (active(s, 1, 1 - t)) {
      p.moveX = p.moveZ = 0;
      continue;
    }
    if (!human) {
      const d = direction(s, t);
      const decide = p.aiWait < 1e-9 && p.actionTime <= 0;
      let tx = p.aiX ?? p.x,
        tz = p.aiZ ?? p.z;
      if (decide) {
        p.aiWait = aiReactionTime(p.stats[7]);

        p.aiAvoid = false;
        const nearby =
          s.controlled[t] !== i || b.owner !== i
            ? localInteraction(s, i, contacts[i], randomByte(s))
            : null;
        if (nearby) {
          if (nearby.x || nearby.z) {
            p.fx = nearby.x;
            p.fz = nearby.z;
          }
          if (nearby.attack) {
            const selected = s.controlled[t] === i;
            p.action = selected
              ? canJumpAtBall(p, b, catchDistances[i], inMultiplier)
                ? 2
                : 1
              : 7;
            p.actionTime = selected
              ? actionDuration(p.action, p.stats[3])
              : 4 / 25;
            p.cooldown = p.actionTime;
            p.tackleResolved = false;
            p.jumping = p.action === 2;
            p.stationaryJump = p.action === 2 && !nearby.x && !nearby.z;
            if (p.action === 1 && !nearby.x && !nearby.z) {
              p.fx = d;
              p.fz = 0;
            }
            p.slideEnding = false;
            p.keeperBlock =
              p.action === 1 &&
              i % 9 === 0 &&
              b.owner < 0 &&
              (b.vx !== 0 || b.vz !== 0) &&
              Math.abs(p.fz) > 0.1;
            event(s, selected ? p.action : 20, i, -1, p.x, p.z, 0);
          } else p.aiAvoid = true;
        } else if (b.owner === i) {
          tx = d * 22;
          tz = clamp(p.z * 0.4, -2, 2);
        } else if (i % 9 === 0) {
          if (s.controlled[t] !== i) [tx, tz] = goalieTarget(s, i);
          else {
            tx = -d * 19.5;
            tz = clamp(b.z, -1.55, 1.55);
          }
        } else if (s.controlled[t] === i) {
          [tx, tz] = predictedTarget(b.x, b.z, b.vx, b.vz, p.stats[7]);
        } else {
          [tx, tz] = supportTarget(s, i);
        }
        p.aiX = tx;
        p.aiZ = tz;
      }
      [dx, dz] =
        p.actionTime > 0 || p.aiAvoid
          ? eightWay(p.fx, p.fz)
          : steerToTarget(p, tx, tz, decide);
      u = {};
      if (
        decide &&
        !p.aiAvoid &&
        p.actionTime <= 0 &&
        s.controlled[t] === i &&
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
      if (decide && b.owner === i) {
        const danger = s.players.some(
          (q) => q.team !== t && Math.hypot(q.x - p.x, q.z - p.z) < 3,
        );
        if (p.x * d > 12 || danger || i % 9 === 0) {
          const receiver = p.x * d < 10 ? passTarget(s, i) : -1;
          const target =
            receiver >= 0 ? s.players[receiver] : { x: d * 23, z: 0 };
          [p.fx, p.fz] = norm(target.x - p.x, target.z - p.z);
          beginThrow(s, i, receiver < 0 && danger && p.x * d < 10 ? 3 : 2);
        }
      }
    }
    if (human) {
      p.aiWait = 1 / 25;
      [dx, dz] = eightWay(dx, dz);
    }
    if (
      p.action !== 1 &&
      p.action !== 2 &&
      p.action !== 3 &&
      p.action !== 6 &&
      p.action !== 7 &&
      Math.hypot(dx, dz) > 0.01
    )
      [p.fx, p.fz] = norm(dx, dz);
    const prev = s.previous[t],
      pressed = human
        ? (u.shoot && !prev.shoot) ||
          (u.tackle && !prev.tackle) ||
          (u.fire || 0) > (prev.fire || 0) ||
          (u.tackleId || 0) > (prev.tackleId || 0)
        : u.shoot || u.tackle;
    if (human && b.owner === i && p.actionTime <= 0) {
      if ((u.lob && !prev.lob) || (u.lobId || 0) > (prev.lobId || 0))
        beginThrow(s, i, 3);
      else if ((u.shoot && !prev.shoot) || (u.fire || 0) > (prev.fire || 0))
        beginThrow(s, i, 1);
    }
    if (p.throwMode) {
      if (b.owner !== i || p.action !== 3) {
        p.throwMode = 0;
        s.charge[t] = 0;
      } else {
        s.charge[t] = 8 / 25 - p.actionTime + dt;
        if (p.actionTime <= 4 / 25 + 1e-9) {
          const high = p.throwMode === 3 || (p.throwMode === 1 && !!u.shoot);
          throwBall(s, i, high, human ? u : {});
          p.throwMode = 0;
          s.charge[t] = 0;
        }
      }
    }
    if (pressed && b.owner !== i && p.cooldown <= 0 && p.actionTime <= 0) {
      if (canJumpAtBall(p, b, catchDistances[i], inMultiplier) && !u.tackle) {
        p.action = 2;
        p.jumping = true;
        p.stationaryJump = !dx && !dz;
        p.actionTime = actionDuration(2, p.stats[3]);
        p.cooldown = p.actionTime;
        event(s, 2, i, -1, p.x, p.z, 0);
      } else if (Math.hypot(dx, dz) < 0.01) {
        p.action = 7;
        p.actionTime = 4 / 25;
        p.cooldown = p.actionTime;
        p.tackleResolved = false;
        p.keeperBlock = false;
        event(s, 20, i, -1, p.x, p.z, 0);
      } else {
        p.action = 1;
        p.tackleResolved = false;
        p.slideEnding = false;
        p.keeperBlock =
          i % 9 === 0 &&
          b.owner < 0 &&
          (b.vx !== 0 || b.vz !== 0) &&
          Math.abs(p.fz) > 0.1;
        p.actionTime = actionDuration(1, p.stats[3]);
        p.cooldown = p.actionTime;
        event(s, 1, i, -1, p.x, p.z, 0);
      }
    }
    if (p.action === 1 || p.action === 2) {
      dx = p.fx;
      dz = p.fz;
    }
    [dx, dz] = eightWay(dx, dz);
    const keeperBlock = p.keeperBlock && p.action === 1;
    const speed = active(s, 1, 1 - t)
      ? 0
      : movementSpeed(p, b.owner === i, keeperBlock);
    p.moveX = dx * speed;
    p.moveZ = dz * speed;
    blockPlayerMovement(s.players, i, contacts[i], dt);
  }
  // The original moves players only after every player's thinking has run.
  for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i];
    if (p.stun > 0) {
      const falling = p.action === 4 && p.health > 0 && p.stun > 1 / 25 + 1e-9;
      p.moveX = falling ? p.fallX || 0 : 0;
      p.moveZ = falling ? p.fallZ || 0 : 0;
    }
    const previousX = p.x;
    p.x = clamp(p.x + p.moveX * dt, -playerLimitX, playerLimitX);
    p.z = clamp(p.z + p.moveZ * dt, -playerLimitZ, playerLimitZ);
    if (i % 9 === 0) {
      const d = direction(s, p.team);
      const advance = (p.x - previousX) * d;
      if (
        (advance > 0 && p.x * d > -384 * (22.4 / 576)) ||
        (advance < 0 && p.x * d < -playerLimitX)
      )
        p.x = previousX;
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
  } else if (inMultiplier) {
    // The original multiplier animation owns the ball position while inside.
  } else {
    if (Math.abs(b.z) > 11.2 && !specialContact) {
      event(s, 5, b.lastTouch, -1, b.x, b.z, b.h);
      b.z = Math.sign(b.z) * 11.2;
      reflectBall(b, "z");
    }
    if (Math.abs(b.x) > pitchLengthLimit) {
      if (
        Math.abs(b.z) <= goalHalfWidth &&
        b.x * b.vx > 0 &&
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
        b.x = Math.sign(b.x) * pitchLengthLimit;
        reflectBall(b, "x");
        event(s, 5, b.lastTouch, -1, b.x, b.z, b.h);
      }
    }
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

// get_ball is called only from control_player for the selected player of each team.
export function catchBall(s, only = -1, distances = null) {
  const b = s.ball;
  if (b.owner >= 0 || b.multiplierPath) return;
  for (let roster = 0; roster < 9; roster++)
    for (const team of [1, 0]) {
      const i = team * 9 + roster,
        p = s.players[i];
      if (only >= 0 && i !== only) continue;
      if (
        s.controlled[team] !== i ||
        p.stun > 0 ||
        p.health <= 0 ||
        p.action === 3
      )
        continue;
      if (
        b.flightKind
          ? b.flightStage > 2 && !(p.action === 2 && p.jumping)
          : b.h > 1.25 + jumpHeight(p)
      )
        continue;
      if (
        (distances ? distances[i] : referenceDistance(p.x - b.x, p.z - b.z)) >
        16
      )
        continue;
      if (
        b.charged &&
        b.electric > 0 &&
        b.lastTouch >= 0 &&
        p.team !== s.players[b.lastTouch].team &&
        !shielded(s, p.team)
      ) {
        if (damage(s, b.lastTouch, i)) {
          // sub_D632 uses nominal ball direction, not the thrower's facing.
          [p.fx, p.fz] =
            b.dirX || b.dirZ ? eightWay(b.dirX, b.dirZ) : eightWay(b.vx, b.vz);
          p.fallX = p.fx * 3 * velocityUnit;
          p.fallZ = p.fz * 3 * velocityUnit;
          b.electric--;
          b.electricBudget = b.electric;
          continue;
        }
      }
      if (p.action === 1 && p.keeperBlock) {
        deflectBall(s, i);
        event(s, 17, i, -1, b.x, b.z, b.h);
        return;
      }
      if (
        (b.vx !== 0 || b.vz !== 0) &&
        b.lastTouch >= 0 &&
        s.players[b.lastTouch].team !== p.team
      ) {
        b.electric = 0;
        b.charged = false;
      }
      if (p.actionTime <= 0 && !(p.moveX || p.moveZ) && (b.vx || b.vz)) {
        const dx =
          Math.round(b.x / terrainUnit) - Math.round(p.x / terrainUnit);
        const dz =
          Math.round(b.z / terrainUnit) - Math.round(p.z / terrainUnit);
        const fx =
          Math.abs(dx) > Math.floor(Math.abs(dz) / 2) ? Math.sign(dx) : 0;
        const fz =
          Math.abs(dz) > Math.floor(Math.abs(dx) / 2) ? Math.sign(dz) : 0;
        if (fx || fz) {
          p.fx = fx;
          p.fz = fz;
          p.action = 6;
          p.actionTime = 3 / 25;
        }
      }
      s.charge[team] = 0;
      b.flightKind = 0;
      b.owner = i;
      b.lastTouch = i;
      b.after = 0;
      event(s, 16, i, -1, b.x, b.z, b.h);
      return;
    }
}

// Invoked during the existing slide's thinking, before later players act.
function resolveTackle(s, i, distances) {
  const p = s.players[i];
  if ((p.action !== 1 && p.action !== 7) || p.tackleResolved) return;
  for (let j = 0; j < s.players.length; j++) {
    const q = s.players[j];
    if (
      q.team === p.team ||
      q.stun > 0 ||
      q.health <= 0 ||
      shielded(s, q.team) ||
      distances[j] > 30
    )
      continue;
    p.tackleResolved = true;
    if (randomByte(s) > tackleThreshold(p, q, j % 9 === 0)) return;
    const hadBall = s.ball.owner === j;
    if (damage(s, i, j)) {
      if (hadBall) giveBall(s, i);
      [q.fx, q.fz] = eightWay(p.fx, p.fz);
      const speed = (p.action === 1 ? 4 : 3) * velocityUnit;
      q.fallX = q.fx * speed;
      q.fallZ = q.fz * speed;
    }
    return;
  }
}
