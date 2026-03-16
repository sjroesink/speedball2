// ============================================================
// Speedball 2: Brutal Deluxe — Team Definitions
// ============================================================
//
// 8 teams in ascending order of difficulty / average stats.
// Each team has 9 players:
//   index 0   = Goalkeeper
//   index 1-2 = Defenders
//   index 3-4 = Midfielders
//   index 5   = Forward
//   index 6-8 = Bench (mixed roles)
//
// Stats are bounded [1, 15] and vary ±2 around the team average.
// ============================================================

import { PlayerRole, PlayerDef, TeamDef } from '../utils/types';

// ------ Helper ------

function clamp(v: number, min = 1, max = 15): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Build a PlayerDef with stats varied ±variance around the base values.
 * offsets[0]=speed, offsets[1]=strength, offsets[2]=defense
 */
function player(
  name: string,
  number: number,
  role: PlayerRole,
  baseSpd: number,
  baseStr: number,
  baseDef: number,
  offsets: [number, number, number] = [0, 0, 0],
): PlayerDef {
  return {
    name,
    number,
    role,
    stats: {
      speed:    clamp(baseSpd + offsets[0]),
      strength: clamp(baseStr + offsets[1]),
      defense:  clamp(baseDef + offsets[2]),
    },
  };
}

// ============================================================
// Team 1 — Brutal Deluxe  (avg stats 4 / 4 / 4)
// ============================================================
const brutalDeluxe: TeamDef = {
  name: 'Brutal Deluxe',
  shortName: 'BDX',
  color: 0x4488ff,
  players: [
    player('Kovacs',   1,  PlayerRole.GOALKEEPER, 4, 4, 4, [ 0,  0,  2]),
    player('Steele',   2,  PlayerRole.DEFENDER,   4, 4, 4, [-1,  1,  1]),
    player('Ramos',    3,  PlayerRole.DEFENDER,   4, 4, 4, [ 1, -1,  2]),
    player('Drake',    4,  PlayerRole.MIDFIELDER, 4, 4, 4, [ 2,  0, -1]),
    player('Vance',    5,  PlayerRole.MIDFIELDER, 4, 4, 4, [-1,  2,  0]),
    player('Burns',    6,  PlayerRole.FORWARD,    4, 4, 4, [ 2,  2, -2]),
    player('Holt',     7,  PlayerRole.MIDFIELDER, 4, 4, 4, [ 0, -2,  1]),
    player('Pierce',   8,  PlayerRole.DEFENDER,   4, 4, 4, [-2,  1, -1]),
    player('Marsh',    9,  PlayerRole.FORWARD,    4, 4, 4, [ 1, -1, -2]),
  ],
};

// ============================================================
// Team 2 — Revengers  (avg 5 / 6 / 5)
// ============================================================
const revengers: TeamDef = {
  name: 'Revengers',
  shortName: 'REV',
  color: 0xff4444,
  players: [
    player('Nakamura',  1,  PlayerRole.GOALKEEPER, 5, 6, 5, [ 0,  0,  2]),
    player('Trask',     2,  PlayerRole.DEFENDER,   5, 6, 5, [-1,  1,  1]),
    player('Orlov',     3,  PlayerRole.DEFENDER,   5, 6, 5, [ 1, -1,  2]),
    player('Yates',     4,  PlayerRole.MIDFIELDER, 5, 6, 5, [ 2,  0, -1]),
    player('Farrow',    5,  PlayerRole.MIDFIELDER, 5, 6, 5, [-1,  2,  0]),
    player('Cruz',      6,  PlayerRole.FORWARD,    5, 6, 5, [ 2,  2, -2]),
    player('Doyle',     7,  PlayerRole.MIDFIELDER, 5, 6, 5, [ 0, -2,  1]),
    player('Ivanov',    8,  PlayerRole.DEFENDER,   5, 6, 5, [-2,  1, -1]),
    player('Quinn',     9,  PlayerRole.FORWARD,    5, 6, 5, [ 1, -1, -2]),
  ],
};

// ============================================================
// Team 3 — Mean Machines  (avg 6 / 5 / 6)
// ============================================================
const meanMachines: TeamDef = {
  name: 'Mean Machines',
  shortName: 'MMX',
  color: 0x44cc44,
  players: [
    player('Hollis',    1,  PlayerRole.GOALKEEPER, 6, 5, 6, [ 0,  0,  2]),
    player('Santos',    2,  PlayerRole.DEFENDER,   6, 5, 6, [-1,  1,  1]),
    player('Kowalski',  3,  PlayerRole.DEFENDER,   6, 5, 6, [ 1, -1,  2]),
    player('Reeves',    4,  PlayerRole.MIDFIELDER, 6, 5, 6, [ 2,  0, -1]),
    player('Malone',    5,  PlayerRole.MIDFIELDER, 6, 5, 6, [-1,  2,  0]),
    player('Ford',      6,  PlayerRole.FORWARD,    6, 5, 6, [ 2,  2, -2]),
    player('Tanner',    7,  PlayerRole.MIDFIELDER, 6, 5, 6, [ 0, -2,  1]),
    player('Weiss',     8,  PlayerRole.DEFENDER,   6, 5, 6, [-2,  1, -1]),
    player('Patel',     9,  PlayerRole.FORWARD,    6, 5, 6, [ 1, -1, -2]),
  ],
};

// ============================================================
// Team 4 — Iron Fist  (avg 7 / 6 / 6)
// ============================================================
const ironFist: TeamDef = {
  name: 'Iron Fist',
  shortName: 'IFT',
  color: 0xcc8800,
  players: [
    player('Briggs',    1,  PlayerRole.GOALKEEPER, 7, 6, 6, [ 0,  0,  2]),
    player('Lowe',      2,  PlayerRole.DEFENDER,   7, 6, 6, [-1,  1,  1]),
    player('Russo',     3,  PlayerRole.DEFENDER,   7, 6, 6, [ 1, -1,  2]),
    player('Park',      4,  PlayerRole.MIDFIELDER, 7, 6, 6, [ 2,  0, -1]),
    player('Novak',     5,  PlayerRole.MIDFIELDER, 7, 6, 6, [-1,  2,  0]),
    player('Stein',     6,  PlayerRole.FORWARD,    7, 6, 6, [ 2,  2, -2]),
    player('Gibbs',     7,  PlayerRole.MIDFIELDER, 7, 6, 6, [ 0, -2,  1]),
    player('Okafor',    8,  PlayerRole.DEFENDER,   7, 6, 6, [-2,  1, -1]),
    player('Lindqvist', 9,  PlayerRole.FORWARD,    7, 6, 6, [ 1, -1, -2]),
  ],
};

// ============================================================
// Team 5 — Steel Fury  (avg 7 / 7 / 7)
// ============================================================
const steelFury: TeamDef = {
  name: 'Steel Fury',
  shortName: 'SFY',
  color: 0x00cccc,
  players: [
    player('Archer',    1,  PlayerRole.GOALKEEPER, 7, 7, 7, [ 0,  0,  2]),
    player('Nunes',     2,  PlayerRole.DEFENDER,   7, 7, 7, [-1,  1,  1]),
    player('Petrov',    3,  PlayerRole.DEFENDER,   7, 7, 7, [ 1, -1,  2]),
    player('Brennan',   4,  PlayerRole.MIDFIELDER, 7, 7, 7, [ 2,  0, -1]),
    player('Svensson',  5,  PlayerRole.MIDFIELDER, 7, 7, 7, [-1,  2,  0]),
    player('Okoro',     6,  PlayerRole.FORWARD,    7, 7, 7, [ 2,  2, -2]),
    player('Mercer',    7,  PlayerRole.MIDFIELDER, 7, 7, 7, [ 0, -2,  1]),
    player('Hagen',     8,  PlayerRole.DEFENDER,   7, 7, 7, [-2,  1, -1]),
    player('Wolfe',     9,  PlayerRole.FORWARD,    7, 7, 7, [ 1, -1, -2]),
  ],
};

// ============================================================
// Team 6 — Lethal Zone  (avg 8 / 7 / 8)
// ============================================================
const lethalZone: TeamDef = {
  name: 'Lethal Zone',
  shortName: 'LZN',
  color: 0xcc44cc,
  players: [
    player('Crane',     1,  PlayerRole.GOALKEEPER, 8, 7, 8, [ 0,  0,  2]),
    player('Ito',       2,  PlayerRole.DEFENDER,   8, 7, 8, [-1,  1,  1]),
    player('Graves',    3,  PlayerRole.DEFENDER,   8, 7, 8, [ 1, -1,  2]),
    player('Rourke',    4,  PlayerRole.MIDFIELDER, 8, 7, 8, [ 2,  0, -1]),
    player('Diallo',    5,  PlayerRole.MIDFIELDER, 8, 7, 8, [-1,  2,  0]),
    player('Voss',      6,  PlayerRole.FORWARD,    8, 7, 8, [ 2,  2, -2]),
    player('Salazar',   7,  PlayerRole.MIDFIELDER, 8, 7, 8, [ 0, -2,  1]),
    player('Nkosi',     8,  PlayerRole.DEFENDER,   8, 7, 8, [-2,  1, -1]),
    player('Eriksen',   9,  PlayerRole.FORWARD,    8, 7, 8, [ 1, -1, -2]),
  ],
};

// ============================================================
// Team 7 — Titanium Dogs  (avg 8 / 9 / 8)
// ============================================================
const titaniumDogs: TeamDef = {
  name: 'Titanium Dogs',
  shortName: 'TDG',
  color: 0xffaa00,
  players: [
    player('Boyle',     1,  PlayerRole.GOALKEEPER, 8, 9, 8, [ 0,  0,  1]),
    player('Vargas',    2,  PlayerRole.DEFENDER,   8, 9, 8, [-1,  1,  1]),
    player('Kimura',    3,  PlayerRole.DEFENDER,   8, 9, 8, [ 1, -1,  2]),
    player('Muller',    4,  PlayerRole.MIDFIELDER, 8, 9, 8, [ 2,  0, -1]),
    player('Osei',      5,  PlayerRole.MIDFIELDER, 8, 9, 8, [-1,  2,  0]),
    player('Harker',    6,  PlayerRole.FORWARD,    8, 9, 8, [ 2,  2, -2]),
    player('Castillo',  7,  PlayerRole.MIDFIELDER, 8, 9, 8, [ 0, -2,  1]),
    player('Novotny',   8,  PlayerRole.DEFENDER,   8, 9, 8, [-2,  1, -1]),
    player('Asante',    9,  PlayerRole.FORWARD,    8, 9, 8, [ 1, -1, -2]),
  ],
};

// ============================================================
// Team 8 — Super Nashwan  (avg 9 / 9 / 9) — final boss
// ============================================================
const superNashwan: TeamDef = {
  name: 'Super Nashwan',
  shortName: 'SNW',
  color: 0xffffff,
  players: [
    player('Nashwan',   1,  PlayerRole.GOALKEEPER, 9, 9, 9, [ 0,  0,  2]),
    player('Xander',    2,  PlayerRole.DEFENDER,   9, 9, 9, [-1,  1,  1]),
    player('Zidane',    3,  PlayerRole.DEFENDER,   9, 9, 9, [ 1, -1,  2]),
    player('Blaze',     4,  PlayerRole.MIDFIELDER, 9, 9, 9, [ 2,  0, -1]),
    player('Apex',      5,  PlayerRole.MIDFIELDER, 9, 9, 9, [-1,  2,  0]),
    player('Titan',     6,  PlayerRole.FORWARD,    9, 9, 9, [ 2,  2, -2]),
    player('Fury',      7,  PlayerRole.MIDFIELDER, 9, 9, 9, [ 0, -2,  1]),
    player('Omega',     8,  PlayerRole.DEFENDER,   9, 9, 9, [-2,  1, -1]),
    player('Nova',      9,  PlayerRole.FORWARD,    9, 9, 9, [ 1, -1, -2]),
  ],
};

// ============================================================
// Exported roster
// ============================================================

export const ALL_TEAMS: TeamDef[] = [
  brutalDeluxe,
  revengers,
  meanMachines,
  ironFist,
  steelFury,
  lethalZone,
  titaniumDogs,
  superNashwan,
];

export {
  brutalDeluxe,
  revengers,
  meanMachines,
  ironFist,
  steelFury,
  lethalZone,
  titaniumDogs,
  superNashwan,
};
