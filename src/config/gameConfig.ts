// ============================================================
// Speedball 2: Brutal Deluxe — Game Configuration & Formulas
// ============================================================

import { Difficulty } from '../utils/types';

// ------ Viewport & Arena ------

export const VIEWPORT_WIDTH  = 960;
export const VIEWPORT_HEIGHT = 672;

export const ARENA_WIDTH  = 960;
export const ARENA_HEIGHT = 1440;

export const TILE_WIDTH  = 48;
export const TILE_HEIGHT = 48;

// ------ Goals ------

export const GOAL_WIDTH    = 288;
export const GOAL_Y_TOP    = 48;
export const GOAL_Y_BOTTOM = 1344;

// ------ Timing (seconds) ------

export const HALF_DURATION          = 90;    // seconds per half
export const INJURY_TIME_MAX        = 10;    // max injury-time seconds
export const STUN_DURATION          = 0.5;   // seconds a stunned player is inactive
export const TACKLE_RECOVERY_TIME   = 0.3;   // seconds to recover from a missed tackle
export const MULTIPLIER_RESPAWN_TIME = 10;   // seconds before a multiplier power-up reappears

// ------ Scoring ------

export const POINTS_GOAL        = 10;
export const POINTS_TACKLE      = 2;
export const POINTS_STAR_BONUS  = 10;
export const POINTS_DOME        = 2;
export const POINTS_INJURY      = 10;
export const SCORE_MULTIPLIER   = 2;   // 2× when multiplier power-up collected

// ------ Ball Physics ------

export const BALL_PASS_SPEED          = 540;  // px/s
export const BALL_FRICTION            = 90;   // px/s² deceleration
export const BALL_WALL_RESTITUTION    = 0.8;
export const BALL_DOME_RESTITUTION    = 0.9;
export const BALL_DOME_ANGLE_VARIANCE = 15;   // degrees
export const BALL_PICKUP_RANGE        = 36;   // pixels

// ------ Player Movement & Tackling ------

export const PLAYER_TACKLE_LUNGE      = 72;   // px distance of a lunge
export const PLAYER_TACKLE_HIT_RADIUS = 60;   // px hit detection radius
export const KEEPER_RANGE             = 144;  // px keeper wanders from goal centre
export const KEEPER_SAVE_ZONE         = 96;   // px zone around goal line for saves

// ------ Credits / Economy ------

export const CREDITS_WIN          = 5000;
export const CREDITS_DRAW         = 2000;
export const CREDITS_SCORE_MULT   = 10;   // credits per point scored

export const TRAINING_COST_SPEED  = 10_000;
export const TRAINING_COST_STR    = 10_000;
export const TRAINING_COST_DEF    = 10_000;
export const BUY_PLAYER_COST      = 25_000;
export const STAT_CAP             = 15;

// ------ AI Difficulty Parameters ------

export interface AIDifficultyParams {
  reactionTime: number;       // seconds before AI reacts to events
  passAccuracy: number;       // 0–1 probability of accurate pass
  shootAccuracy: number;      // 0–1 probability of on-target shot
  tackleAggressiveness: number; // 0–1 how readily AI attempts tackles
  positioningError: number;   // px of random error in target positions
}

export const AI_PARAMS: Record<Difficulty, AIDifficultyParams> = {
  [Difficulty.EASY]: {
    reactionTime:         0.6,
    passAccuracy:         0.55,
    shootAccuracy:        0.50,
    tackleAggressiveness: 0.35,
    positioningError:     72,
  },
  [Difficulty.MEDIUM]: {
    reactionTime:         0.35,
    passAccuracy:         0.75,
    shootAccuracy:        0.70,
    tackleAggressiveness: 0.55,
    positioningError:     36,
  },
  [Difficulty.HARD]: {
    reactionTime:         0.15,
    passAccuracy:         0.92,
    shootAccuracy:        0.88,
    tackleAggressiveness: 0.80,
    positioningError:     12,
  },
};

// ------ Stat-based Helper Functions ------

/**
 * Returns the maximum movement speed (px/s) for a player with the given speed stat.
 * @param spd  Speed stat value (1–15)
 */
export function getMaxSpeed(spd: number): number {
  return 180 + spd * 24;
}

/**
 * Returns the ball speed (px/s) of a shot kicked by a player with the given strength stat.
 * @param str  Strength stat value (1–15)
 */
export function getShotSpeed(str: number): number {
  return 450 + str * 30;
}

/**
 * Returns the probability (0–1) that a tackle attempt succeeds.
 * Higher attacker strength vs. defender defense.
 * @param attackerStr   Attacker's strength stat
 * @param defenderDef   Defender's defense stat
 */
export function getTackleSuccessChance(attackerStr: number, defenderDef: number): number {
  const raw = 0.3 + (attackerStr - defenderDef) * 0.04;
  return Math.min(0.95, Math.max(0.05, raw));
}

/**
 * Returns the probability (0–1) that a tackled player suffers an injury.
 * Depends on attacker strength.
 * @param attackerStr  Attacker's strength stat
 */
export function getInjuryChance(attackerStr: number): number {
  const raw = 0.02 + attackerStr * 0.008;
  return Math.min(0.25, Math.max(0.02, raw));
}

/**
 * Returns the probability (0–1) that the goalkeeper saves a shot.
 * @param keeperDef   Keeper's defense stat
 * @param shooterStr  Shooter's strength stat
 */
export function getKeeperSaveChance(keeperDef: number, shooterStr: number): number {
  const raw = 0.1 + (keeperDef - shooterStr) * 0.05;
  return Math.min(0.90, Math.max(0.05, raw));
}

/**
 * Calculates credits earned after a match.
 * @param won          True if the player's team won
 * @param drawn        True if the match was drawn
 * @param pointsScored Total arena points scored by the player's team
 */
export function getCreditsEarned(won: boolean, drawn: boolean, pointsScored: number): number {
  const base = won ? CREDITS_WIN : drawn ? CREDITS_DRAW : 0;
  return base + pointsScored * CREDITS_SCORE_MULT;
}
