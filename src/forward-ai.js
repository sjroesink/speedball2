import {
  directionKey,
  opponentDirections,
  goalThrow,
} from "./defensive-pass.js";
import { predictedTarget } from "./steering.js";
import { supportTarget } from "./support.js";
const role = (i) => [0, 1, 1, 2, 2, 2, 4, 4, 3][i % 9];

// active_forward_player_with_ball_ai (0xf60a..0xf736).
export function forwardDecision(s, i, random, distances) {
  const p = s.players[i],
    goal = goalThrow(s, i, random);
  if (s.ball.charged) return goal;
  const blocked = opponentDirections(s, i, distances);
  if (goal.key !== blocked[0] && Math.abs(goal.key) > 1) return goal;
  const j = s.controlled[1 - p.team],
    q = s.players[j];
  if (!q || q.stun > 0 || q.health <= 0 || distances[j] > 64) {
    const [x, z] = supportTarget(s, i, true),
      key = directionKey(p, x, z);
    if (key !== 0 && !blocked.includes(key)) return { x, z, key, move: true };
  }
  let receiver = -1,
    distance = p.stats[7] * 2;
  const aim = (j) => {
    const q = s.players[j];
    const [x, z] = predictedTarget(
      q.x,
      q.z,
      q.moveX || 0,
      q.moveZ || 0,
      p.stats[7],
    );
    return { x, z, key: directionKey(p, x, z) };
  };
  for (const minimum of [3, 2]) {
    for (let j = 0; j < s.players.length; j++) {
      const q = s.players[j];
      if (
        j === i ||
        q.team !== p.team ||
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
    if (receiver >= 0) break;
  }
  if (receiver < 0) return goal;
  // set_goal_throw_location has already set the AI controller's lateral bias.
  return {
    receiver,
    ...aim(receiver),
    high: p.stats[4] * 2 <= distance,
    steer: goal.steer,
  };
}
