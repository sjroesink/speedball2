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

// ── Online multiplayer state interfaces ─────────────────────────

export interface BallState {
  x: number; y: number;
  vx: number; vy: number;
  ownerSide: TeamSide | null;
  ownerIndex: number;
}

export interface ServerPlayerState {
  x: number; y: number;
  vx: number; vy: number;
  state: PlayerState;
  hasBall: boolean;
  facingAngle: number;
  role: PlayerRole;
  stats: PlayerStats;
  injuryTimer: number;
  stateTimer: number;
  homeX: number; homeY: number;
}

export interface StarState {
  x: number; y: number;
  side: 'top' | 'bottom';
  activated: boolean;
  activatedBy: TeamSide | null;
}

export interface MultiplierState {
  x: number; y: number;
  side: 'top' | 'bottom';
  activeForTeam: TeamSide | null;
  respawnTimer: number;
}

export interface TeamState {
  score: number;
  goals: number;
  tackles: number;
  hasMultiplier: boolean;
  controlledPlayerIndex: number;
  players: ServerPlayerState[];
}

export interface GameStateMsg {
  ball: BallState;
  home: TeamState;
  away: TeamState;
  stars: StarState[];
  multipliers: MultiplierState[];
  timer: number;
  half: number;
  matchState: MatchState;
  tick: number;
}

export interface ClientInput {
  dx: number; dy: number;
  fire: boolean; pass: boolean;
}
