import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, selectPlayers, possessionDistances } from './game.js';
import { advancePhysicalPose, physicalBallOffset } from './physical-pose.js';

function fixture(period) {
  const s = initial();
  s.period = period;
  for (const p of s.players) Object.assign(p, {x: 20, z: 10, stun: 0});
  return s;
}
test('held-ball selection targets carrier terrain across teams, halves and facing', () => {
  for (const period of [1, 2]) for (const team of [0, 1]) for (const [fx,fz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const s = fixture(period), owner = team * 9 + 7, a = (1-team)*9+6, b = a+1;
    Object.assign(s.players[owner], {x:0,z:0,fx,fz});
    advancePhysicalPose(s.players[owner], owner, period, .04);
    const offset = physicalBallOffset(s.players[owner], s.ball);
    Object.assign(s.ball, {owner, x:offset.x, z:offset.z});
    Object.assign(s.players[a], {x:0,z:0});
    Object.assign(s.players[b], {x:offset.x,z:offset.z});
    const distances = possessionDistances(s);
    assert.equal(distances[a], 0);
    assert.ok(distances[b] > 0);
    selectPlayers(s);
    assert.equal(s.controlled[1-team], a);
    assert.equal(s.controlled[team], owner);
    s.ball.owner = -1;
    selectPlayers(s);
    assert.equal(s.controlled[1-team], b, 'loose ball becomes the distance target');
  }
});
test('nearest fallen player remains selected and equal distances favor later roster slot', () => {
  for (const team of [0,1]) {
    const s = fixture(1), a = team*9+7, b = a+1;
    Object.assign(s.ball, {owner:-1,x:0,z:0});
    Object.assign(s.players[a], {x:0,z:0,stun:.5,action:4});
    Object.assign(s.players[b], {x:2,z:0});
    selectPlayers(s);
    assert.equal(s.controlled[team], a);
    s.players[b].x = 0;
    selectPlayers(s);
    assert.equal(s.controlled[team], b);
  }
});
