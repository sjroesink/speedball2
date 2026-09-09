import { initial, selectPlayers } from '../src/game.js';
import { advancePhysicalPose, physicalBallOffset, playerPointDistance } from '../src/physical-pose.js';

// Source audit probes, not pass/fail parity tests. Indices are zero-based.
// Reference: Amiga 0xd95e..0xda00, WIP Match.SetPlayersHavingInput.
function referenceSelected(s, team) {
  if (s.controlled[team] === s.ball.owner) return s.ball.owner;
  const target = s.ball.owner >= 0 ? s.players[s.ball.owner] : s.ball;
  let selected = -1, distance = Infinity;
  s.players.forEach((p, i) => {
    if (p.team !== team) return;
    const d = playerPointDistance(p, target.x, target.z);
    if (d <= distance) { distance = d; selected = i; }
  });
  return selected;
}
function fixture() {
  const s = initial();
  for (const p of s.players) Object.assign(p, { x: 15, z: 8, stun: 0 });
  return s;
}
const held = fixture();
Object.assign(held.players[7], { x: 0, z: 0, fx: 1, fz: 0 });
advancePhysicalPose(held.players[7], 7, 1, .04);
const offset = physicalBallOffset(held.players[7], held.ball);
Object.assign(held.ball, { owner: 7, x: offset.x, z: offset.z });
Object.assign(held.players[15], { x: 0, z: 0 });
Object.assign(held.players[16], { x: offset.x, z: offset.z });
const heldExpected = referenceSelected(held, 1);
selectPlayers(held);

const fallen = fixture();
Object.assign(fallen.ball, { owner: -1, x: 0, z: 0 });
Object.assign(fallen.players[7], { x: 0, z: 0, stun: .5, action: 4 });
Object.assign(fallen.players[8], { x: 2, z: 0 });
const fallenExpected = referenceSelected(fallen, 0);
selectPlayers(fallen);
console.log(JSON.stringify({
  note: 'Reduced source-branch comparison; not an emulated Amiga match.',
  heldBallTarget: { offset, referencePlayer: heldExpected, currentPlayer: held.controlled[1] },
  fallenNearest: { referencePlayer: fallenExpected, currentPlayer: fallen.controlled[0] },
}, null, 2));
