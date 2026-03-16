// ============================================================
// Speedball 2: Brutal Deluxe — Shared Types & Enums
// ============================================================

// ------ Match / Game State ------

export enum TeamSide {
  HOME = 'HOME',
  AWAY = 'AWAY',
}

export enum MatchState {
  KICKOFF = 'KICKOFF',
  PLAYING = 'PLAYING',
  GOAL_SCORED = 'GOAL_SCORED',
  HALFTIME = 'HALFTIME',
  MATCH_END = 'MATCH_END',
}

// ------ Player ------

export enum PlayerRole {
  GOALKEEPER = 'GOALKEEPER',
  DEFENDER = 'DEFENDER',
  MIDFIELDER = 'MIDFIELDER',
  FORWARD = 'FORWARD',
}

export enum PlayerState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  TACKLING = 'TACKLING',
  STUNNED = 'STUNNED',
  INJURED = 'INJURED',
  SHOOTING = 'SHOOTING',
  PASSING = 'PASSING',
}

// ------ AI ------

export enum AITeamState {
  ATTACKING = 'ATTACKING',
  DEFENDING = 'DEFENDING',
  LOOSE_BALL = 'LOOSE_BALL',
}

export enum AIPlayerBehavior {
  SEEK_BALL = 'SEEK_BALL',
  RUN_TO_POSITION = 'RUN_TO_POSITION',
  PASS = 'PASS',
  SHOOT = 'SHOOT',
  TACKLE = 'TACKLE',
  MARK_OPPONENT = 'MARK_OPPONENT',
  GUARD_GOAL = 'GUARD_GOAL',
  COLLECT_STAR = 'COLLECT_STAR',
}

// ------ Difficulty ------

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

// ------ Player / Team Definitions ------

export interface PlayerStats {
  speed: number;
  strength: number;
  defense: number;
}

export interface PlayerDef {
  name: string;
  number: number;
  role: PlayerRole;
  stats: PlayerStats;
}

export interface TeamDef {
  name: string;
  shortName: string;
  /** Phaser-compatible hex colour, e.g. 0xff0000 */
  color: number;
  players: PlayerDef[];
}

// ------ Match Result ------

export interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeTackles: number;
  awayTackles: number;
  /** Individual goal-scorer names (home side) */
  homeGoals: string[];
  /** Individual goal-scorer names (away side) */
  awayGoals: string[];
  mvp: string;
  creditsEarned: number;
}

// ------ League ------

export interface LeagueStanding {
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
}
