// ============================================================
// Speedball 2: Brutal Deluxe — Teammate AI
// Controls the non-human-controlled players on a human team.
// Each player moves based on their role and the game situation.
// ============================================================

import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { MatchEngine } from './MatchEngine';
import {
  TeamSide,
  PlayerRole,
  PlayerState,
} from '../utils/types';
import {
  KEEPER_RANGE,
  GOAL_Y_TOP,
  GOAL_Y_BOTTOM,
  ARENA_WIDTH,
  ARENA_HEIGHT,
} from '../config/gameConfig';

export class TeammateAI {
  private teamSide: TeamSide;
  private players: Player[];
  private opponents: Player[];
  private ball: Ball;
  private engine: MatchEngine;
  private goalY: number;
  private readonly centreX = ARENA_WIDTH / 2;

  /** Throttle updates so AI isn't too snappy (feels more natural). */
  private reactionTimer = 0;

  constructor(
    teamSide: TeamSide,
    players: Player[],
    opponents: Player[],
    ball: Ball,
    engine: MatchEngine,
  ) {
    this.teamSide  = teamSide;
    this.players   = players;
    this.opponents = opponents;
    this.ball      = ball;
    this.engine    = engine;
    this.goalY     = teamSide === TeamSide.HOME ? GOAL_Y_BOTTOM : GOAL_Y_TOP;
  }

  /**
   * Updates all non-controlled, non-keeper players on the human's team.
   * The controlled player index is skipped (human controls that one).
   */
  update(delta: number): void {
    const dt = delta / 1000;
    this.reactionTimer -= dt;
    if (this.reactionTimer > 0) return;
    this.reactionTimer = 0.2; // react every 200ms

    const team = this.engine.getTeam(this.teamSide);
    const controlledIdx = team.controlledPlayerIndex;
    const weHaveBall = this.players.some(p => p.hasBall);
    const theyHaveBall = this.opponents.some(p => p.hasBall);

    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (!player.isActive) continue;
      if (!player.canAct) continue; // don't override tackling/stunned/etc.
      if (i === controlledIdx) continue; // human controls this one

      if (player.isGoalkeeper) {
        this.updateKeeper(player);
      } else if (player.hasBall) {
        // AI teammate has the ball — advance toward goal and pass quickly
        this.updateBallCarrier(player);
      } else if (weHaveBall) {
        this.updateAttackingSupport(player, i);
      } else if (theyHaveBall) {
        this.updateDefending(player, i);
      } else {
        this.updateLooseBall(player, i);
      }
    }
  }

  // ------ Keeper -----------------------------------------------------------

  private updateKeeper(keeper: Player): void {
    const minX = this.centreX - KEEPER_RANGE;
    const maxX = this.centreX + KEEPER_RANGE;
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

    this.moveToward(keeper, targetX, targetY);
  }

  // ------ Ball carrier (AI teammate got the ball) --------------------------

  private updateBallCarrier(player: Player): void {
    // Simple: move toward opponent goal
    const targetGoalY = this.teamSide === TeamSide.HOME ? GOAL_Y_TOP : GOAL_Y_BOTTOM;
    this.moveToward(player, this.centreX, targetGoalY);
  }

  // ------ Attacking support (our team has ball) ----------------------------

  private updateAttackingSupport(player: Player, index: number): void {
    const role = player.playerDef.role;
    const isHome = this.teamSide === TeamSide.HOME;
    const attackDir = isHome ? -1 : 1; // HOME attacks up (negative Y)

    // Get ball Y to position relative to it
    const ballY = this.ball.y;
    const ballX = this.ball.x;

    let targetX: number;
    let targetY: number;

    switch (role) {
      case PlayerRole.DEFENDER:
        // Defenders hold back — stay between ball and own goal
        targetY = ballY + attackDir * -200 + (index % 2 === 0 ? -40 : 40);
        targetX = index % 2 === 0 ? this.centreX - 150 : this.centreX + 150;
        // Clamp: don't go past midfield when attacking
        if (isHome) targetY = Math.max(ARENA_HEIGHT * 0.4, targetY);
        else targetY = Math.min(ARENA_HEIGHT * 0.6, targetY);
        break;

      case PlayerRole.FORWARD:
        // Forwards push ahead of the ball toward goal
        targetY = ballY + attackDir * 200;
        targetX = ballX + (index % 2 === 0 ? -120 : 120);
        break;

      case PlayerRole.MIDFIELDER:
      default:
        // Midfielders support near the ball, spread wide
        targetY = ballY + attackDir * 50;
        targetX = ballX + (index % 2 === 0 ? -180 : 180);
        break;
    }

    // Clamp to arena
    targetX = Math.max(60, Math.min(ARENA_WIDTH - 60, targetX));
    targetY = Math.max(80, Math.min(ARENA_HEIGHT - 80, targetY));

    this.moveToward(player, targetX, targetY);
  }

  // ------ Defending (opponent has ball) ------------------------------------

  private updateDefending(player: Player, index: number): void {
    const role = player.playerDef.role;
    const isHome = this.teamSide === TeamSide.HOME;

    let targetX: number;
    let targetY: number;

    switch (role) {
      case PlayerRole.DEFENDER:
        // Fall back to defensive positions between ball and own goal
        targetY = isHome ? Math.max(this.ball.y + 100, ARENA_HEIGHT * 0.65)
                         : Math.min(this.ball.y - 100, ARENA_HEIGHT * 0.35);
        targetX = index % 2 === 0 ? this.centreX - 120 : this.centreX + 120;
        break;

      case PlayerRole.FORWARD:
        // Forwards stay up but drift toward ball X
        targetY = isHome ? ARENA_HEIGHT * 0.35 : ARENA_HEIGHT * 0.65;
        targetX = this.ball.x + (index % 2 === 0 ? -100 : 100);
        break;

      case PlayerRole.MIDFIELDER:
      default:
        // Midfielders track the ball, try to intercept
        targetY = this.ball.y + (isHome ? 80 : -80);
        targetX = this.ball.x + (index % 2 === 0 ? -100 : 100);
        break;
    }

    targetX = Math.max(60, Math.min(ARENA_WIDTH - 60, targetX));
    targetY = Math.max(80, Math.min(ARENA_HEIGHT - 80, targetY));

    this.moveToward(player, targetX, targetY);
  }

  // ------ Loose ball -------------------------------------------------------

  private updateLooseBall(player: Player, index: number): void {
    // Nearest non-controlled player chases the ball
    const team = this.engine.getTeam(this.teamSide);
    const controlledIdx = team.controlledPlayerIndex;

    let nearestIdx = -1;
    let nearestDist = Infinity;
    for (let i = 0; i < this.players.length; i++) {
      if (i === controlledIdx) continue;
      const p = this.players[i];
      if (!p.isActive || p.isGoalkeeper) continue;
      const d = Math.sqrt((p.x - this.ball.x) ** 2 + (p.y - this.ball.y) ** 2);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }

    if (index === nearestIdx) {
      // This player chases the ball
      this.moveToward(player, this.ball.x, this.ball.y);
    } else {
      // Others return to home position
      this.moveToward(player, player.homeX, player.homeY);
    }
  }

  // ------ Helpers ----------------------------------------------------------

  private moveToward(player: Player, tx: number, ty: number): void {
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 16) {
      player.idle();
    } else {
      player.moveInDirection(dx, dy);
    }
  }
}
