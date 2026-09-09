import { playerPointDistance } from "./physical-pose.js";
import { predictedTarget } from "./steering.js";
const unit = 22.4 / 576;
const role = (i) => [0, 1, 1, 2, 2, 2, 4, 4, 3][i % 9];
export function directionKey(p, x, z) {
  const dx = Math.round(x / unit) - Math.round(p.x / unit);
  const dz = Math.round(z / unit) - Math.round(p.z / unit);
  return (
    (Math.abs(dx) > Math.floor(Math.abs(dz) / 2) ? Math.sign(dx) * 3 : 0) +
    (Math.abs(dz) > Math.floor(Math.abs(dx) / 2) ? Math.sign(dz) : 0)
  );
}

// Amiga do_throw_punt_ai / set_goal_throw_location, normal match mode.
export function defensivePunt(s, i, random) {
  const p = s.players[i];
  const d = (p.team === 0 ? 1 : -1) * (s.period === 2 ? -1 : 1);
  let { x, z, steer } = goalThrow(s, i, random);
  const q = s.players[s.controlled[1 - p.team]];
  const blocked =
    q && q.stun <= 0 && q.health > 0
      ? directionKey(
          p,
          ...predictedTarget(q.x, q.z, q.moveX || 0, q.moveZ || 0, p.stats[7]),
        )
      : 0;
  // The Amiga reloads opponent_directions here, even for an electroball.
  if (directionKey(p, x, z) === blocked) {
    z = (random & 16 ? 288 : -288) * unit;
    x = p.x + d * Math.abs(z - p.z);
  }
  return { receiver: -1, x, z, key: directionKey(p, x, z), high: true, steer };
}
// get_opposing_player_directions and active_defensive_player_pass_ai.
export function defensivePass(s, i, distances) {
  const p = s.players[i];
  const aim = (j) => {
    const q = s.players[j];
    const [x, z] = predictedTarget(
      q.x,
      q.z,
      q.moveX || 0,
      q.moveZ || 0,
      p.stats[7],
    );
    const dx = Math.round(x / unit) - Math.round(p.x / unit),
      dz = Math.round(z / unit) - Math.round(p.z / unit);
    const fx = Math.abs(dx) > Math.floor(Math.abs(dz) / 2) ? Math.sign(dx) : 0;
    const fz = Math.abs(dz) > Math.floor(Math.abs(dx) / 2) ? Math.sign(dz) : 0;
    return { x, z, key: fx * 3 + fz };
  };
  const blocked = s.ball.charged ? [0, 0] : opponentDirections(s, i, distances);
  let receiver = -1,
    distance = p.stats[7] * 2;
  for (let minimum = role(i) === 0 ? 2 : role(i) + 1; minimum > 0; minimum--) {
    for (let j = 0; j < s.players.length; j++) {
      const q = s.players[j];
      if (
        q.team !== p.team ||
        j === i ||
        q.stun > 0 ||
        q.health <= 0 ||
        role(j) < minimum ||
        distances[j] > distance ||
        blocked.includes(aim(j).key)
      )
        continue;
      receiver = j;
      distance = distances[j];
    }
    if (receiver >= 0 || minimum < role(i)) break;
  }
  if (receiver < 0) return null;
  return {
    receiver,
    ...aim(receiver),
    high:
      !(role(i) !== 0 || role(receiver) === 1) || p.stats[4] * 2 <= distance,
  };
}

export function opponentDirections(s, i, distances) {
  const p = s.players[i];
  const aim = (j) => {
    const q = s.players[j];
    return directionKey(
      p,
      ...predictedTarget(q.x, q.z, q.moveX || 0, q.moveZ || 0, p.stats[7]),
    );
  };
  const selected = s.controlled[1 - p.team];
  let other = -1,
    limit = p.stats[7] * 2;
  for (let j = 0; j < s.players.length; j++) {
    const q = s.players[j];
    if (
      q.team === p.team ||
      j === selected ||
      q.stun > 0 ||
      q.health <= 0 ||
      distances[j] > limit
    )
      continue;
    other = j;
    limit = distances[j];
  }
  const eligible = (j) =>
    j >= 0 && s.players[j].stun <= 0 && s.players[j].health > 0;
  return [eligible(selected) ? aim(selected) : 0, other >= 0 ? aim(other) : 0];
}

// do_goal_throw_ai: equality is low, unlike the strict teammate-pass threshold.
export function goalThrow(s, i, random) {
  const p = s.players[i];
  const d = (p.team === 0 ? 1 : -1) * (s.period === 2 ? -1 : 1);
  const lateral = Math.round(p.z / unit);
  let z =
    (lateral > 0 ? -16 : lateral < 0 ? 16 : random & 64 ? 48 : -48) * unit;
  let x = d * 576 * unit;
  const steer = Math.floor(p.stats[7] / 2) > random ? Math.sign(z - p.z) : 0;
  return {
    receiver: -1,
    x,
    z,
    key: directionKey(p, x, z),
    high: playerPointDistance(p, x, z) > p.stats[4] * 2,
    steer,
  };
}
