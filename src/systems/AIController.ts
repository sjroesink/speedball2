// ============================================================
// Speedball 2: Brutal Deluxe — AI Controller
// ============================================================

import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { PhysicsManager } from './PhysicsManager';
import { MatchEngine } from './MatchEngine';
import {
  TeamSide,
  AITeamState,
  Difficulty,
} from '../utils/types';
import {
  AI_PARAMS,
  AIDifficultyParams,
  KEEPER_RANGE,
  GOAL_Y_TOP,
  GOAL_Y_BOTTOM,
  ARENA_WIDTH,
  ARENA_HEIGHT,
} from '../config/gameConfig';

// ================================================================
// AIController
// ================================================================

export class AIController {
  private teamSide:       TeamSide;
  private players:        Player[];
  private opponents:      Player[];
  private ball:           Ball;
  private physics:        PhysicsManager;
  private engine:         MatchEngine;
  private params:         AIDifficultyParams;

  /** Seconds remaining before the AI next takes action. */
  private reactionTimer:  number = 0;

  /** Seconds the team has been holding the ball without acting. */
  private ballHoldTimer: number = 0;

  /** Keeper's goal-line Y (locked for keeper movement). */
  private goalY:          number;

  /** X centre of the arena (keeper clamps around this). */
  private readonly centreX = ARENA_WIDTH / 2;

  constructor(
    teamSide:    TeamSide,
    players:     Player[],
    opponents:   Player[],
    ball:        Ball,
    physics:     PhysicsManager,
    engine:      MatchEngine,
    difficulty:  Difficulty = Difficulty.MEDIUM,
  ) {
    this.teamSide  = teamSide;
    this.players   = players;
    this.opponents = opponents;
    this.ball      = ball;
    this.physics   = physics;
    this.engine    = engine;
    this.params    = AI_PARAMS[difficulty];

    // Keeper sits at the near goal line for his team
    this.goalY = teamSide === TeamSide.HOME ? GOAL_Y_BOTTOM : GOAL_Y_TOP;
  }

  // ------ Public API -------------------------------------------------------

  /**
   * Called every frame from MatchScene.update().
   * Throttles AI decisions to params.reactionTime intervals.
   * @param delta  Frame delta in milliseconds
   */
  update(delta: number): void {
    const dt = delta / 1000;
    this.reactionTimer -= dt;
    if (this.reactionTimer > 0) return;
    this.reactionTimer = this.params.reactionTime;

    // Track how long our team has held the ball
    const weHaveBall = this.players.some(p => p.hasBall);
    if (weHaveBall) {
      this.ballHoldTimer += this.params.reactionTime;
    } else {
      this.ballHoldTimer = 0;
    }

    const teamState = this.determineTeamState();

    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (!player.isActive) continue;

      if (player.isGoalkeeper) {
        this.updateKeeper(player);
      } else {
        this.updateOutfieldPlayer(player, i, teamState);
      }
    }
  }

  // ------ Team State -------------------------------------------------------

  private determineTeamState(): AITeamState {
    if (this.ball.isLoose()) return AITeamState.LOOSE_BALL;

    // Check if any of our players has the ball
    const weHaveBall = this.players.some(p => p.hasBall);
    if (weHaveBall) return AITeamState.ATTACKING;

    return AITeamState.DEFENDING;
  }

  // ------ Keeper Update ----------------------------------------------------

  private updateKeeper(keeper: Player): void {
    const minX    = this.centreX - KEEPER_RANGE;
    const maxX    = this.centreX + KEEPER_RANGE;
    const targetX = Math.max(minX, Math.min(maxX, this.ball.x));
    let targetY = this.goalY;

    // Move forward slightly when ball is in keeper's half
    const ballInOurHalf = this.teamSide === TeamSide.HOME
      ? this.ball.y > ARENA_HEIGHT / 2
      : this.ball.y < ARENA_HEIGHT / 2;

    if (ballInOurHalf) {
      const advance = this.teamSide === TeamSide.HOME ? -48 : 48;
      targetY = this.goalY + advance;
    }

    const dx = targetX - keeper.x;
    const dy = targetY - keeper.y;

    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
      keeper.idle();
    } else {
      keeper.moveInDirection(dx, dy);
    }
  }

  // ------ Outfield Player Update -------------------------------------------

  private updateOutfieldPlayer(
    player:    Player,
    index:     number,
    teamState: AITeamState,
  ): void {
    switch (teamState) {
      case AITeamState.ATTACKING:
        this.updateAttacking(player, index);
        break;
      case AITeamState.DEFENDING:
        this.updateDefending(player);
        break;
      case AITeamState.LOOSE_BALL:
        this.updateLooseBall(player);
        break;
    }
  }

  // ------ Attacking Behaviour ----------------------------------------------

  private updateAttacking(player: Player, _index: number): void {
    if (player.hasBall) {
      const targetGoalY = this.teamSide === TeamSide.HOME ? GOAL_Y_TOP : GOAL_Y_BOTTOM;
      const dy = targetGoalY - player.y;
      const distToGoal = Math.abs(dy);

      // If held ball for too long (>2 seconds), force a pass or shot
      const desperate = this.ballHoldTimer > 2.0;

      if (distToGoal < 360 && Math.random() < this.params.shootAccuracy) {
        // Close enough — shoot (with accuracy check)
        this.physics.shootBall(player, this.centreX + (Math.random() - 0.5) * 60, targetGoalY);
        this.ballHoldTimer = 0;
      } else if (desperate || Math.random() < 0.30 * this.params.passAccuracy) {
        // Pass to teammate
        const teammates = this.engine.getTeam(this.teamSide).players;
        this.physics.passBall(player, teammates);
        this.ballHoldTimer = 0;
      } else {
        // Advance toward the opponent's goal
        this.moveToward(player, this.centreX + (Math.random() - 0.5) * 120, targetGoalY);
      }
    } else {
      // Support: move to an attacking support position (vary by player index)
      const supportY = this.teamSide === TeamSide.HOME
        ? ARENA_HEIGHT * 0.20 + (_index * 60)
        : ARENA_HEIGHT * 0.80 - (_index * 60);
      const supportX = this.centreX + (_index % 2 === 0 ? -150 : 150);
      this.moveToward(player, supportX, supportY);
    }
  }

  // ------ Defending Behaviour ----------------------------------------------

  private updateDefending(player: Player): void {
    const nearest = this.findNearestOpponent(player);
    if (!nearest) {
      this.moveToward(player, player.homeX, player.homeY);
      return;
    }

    const dx = nearest.x - player.x;
    const dy = nearest.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 120) {
      // In tackle range — face opponent and tackle
      if (player.canAct) {
        player.moveInDirection(dx, dy);
        if (Math.random() < this.params.tackleAggressiveness) {
          this.physics.handleTackle(player, this.opponents);
        }
      }
    } else if (dist < 300) {
      // Chase the nearest opponent
      this.moveToward(player, nearest.x, nearest.y);
    } else {
      // Too far — return to formation
      this.moveToward(player, player.homeX, player.homeY);
    }
  }

  // ------ Loose Ball Behaviour ---------------------------------------------

  private updateLooseBall(player: Player): void {
    const nearest = this.findNearestPlayerToBall();

    if (nearest === player) {
      // This player chases the ball
      this.moveToward(player, this.ball.x, this.ball.y);
    } else {
      // Others return to home position
      this.moveToward(player, player.homeX, player.homeY);
    }
  }

  // ------ Helper Methods ---------------------------------------------------

  /** Moves a player toward (tx, ty), stopping within 12px. */
  private moveToward(player: Player, tx: number, ty: number): void {
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 12) {
      player.idle();
    } else {
      player.moveInDirection(dx, dy);
    }
  }

  /** Returns the nearest active opponent to the given player, or null if none. */
  private findNearestOpponent(player: Player): Player | null {
    let nearest:  Player | null = null;
    let nearestD: number        = Infinity;

    for (const opp of this.opponents) {
      if (!opp.isActive) continue;

      const dx = opp.x - player.x;
      const dy = opp.y - player.y;
      const d  = dx * dx + dy * dy;

      if (d < nearestD) {
        nearestD = d;
        nearest  = opp;
      }
    }

    return nearest;
  }

  /**
   * Returns the active outfield player from our team that is nearest to the ball.
   * Falls back to the first active player if none qualify.
   */
  private findNearestPlayerToBall(): Player | null {
    let nearest:  Player | null = null;
    let nearestD: number        = Infinity;

    for (const p of this.players) {
      if (!p.isActive || p.isGoalkeeper) continue;

      const dx = p.x - this.ball.x;
      const dy = p.y - this.ball.y;
      const d  = dx * dx + dy * dy;

      if (d < nearestD) {
        nearestD = d;
        nearest  = p;
      }
    }

    return nearest;
  }
}
