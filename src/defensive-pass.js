import { predictedTarget } from "./steering.js";
const unit = 22.4 / 576;
const role = (i) => [0, 1, 1, 2, 2, 2, 4, 4, 3][i % 9];
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
  const blocked = s.ball.charged
    ? [0, 0]
    : [
        eligible(selected) ? aim(selected).key : 0,
        other >= 0 ? aim(other).key : 0,
      ];
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
