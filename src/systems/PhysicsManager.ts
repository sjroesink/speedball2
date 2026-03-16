// ============================================================
// Speedball 2: Brutal Deluxe — Physics Manager
// ============================================================

import Phaser from 'phaser';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { ArenaLayout, WarpPair } from '../entities/ArenaElements';
import { MatchEngine } from './MatchEngine';
import {
  TeamSide,
  PlayerRole,
} from '../utils/types';
import {
  BALL_PICKUP_RANGE,
  BALL_DOME_RESTITUTION,
  BALL_DOME_ANGLE_VARIANCE,
  BALL_PASS_SPEED,
  GOAL_WIDTH,
  GOAL_Y_TOP,
  GOAL_Y_BOTTOM,
  PLAYER_TACKLE_HIT_RADIUS,
  getShotSpeed,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  POINTS_DOME,
  KEEPER_SAVE_ZONE,
  getKeeperSaveChance,
} from '../config/gameConfig';

// ================================================================
// PhysicsManager
// ================================================================

export class PhysicsManager {
  private scene: Phaser.Scene;

  private ball!:        Ball;
  private arena!:       ArenaLayout;
  private engine!:      MatchEngine;
  private homePlayers!: Player[];
  private awayPlayers!: Player[];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ------ Setup ------------------------------------------------------------

  /**
   * Wires up all Phaser Arcade colliders and stores references needed for
   * per-frame checks.
   */
  setup(
    ball:        Ball,
    arena:       ArenaLayout,
    engine:      MatchEngine,
    homePlayers: Player[],
    awayPlayers: Player[],
  ): void {
    this.ball        = ball;
    this.arena       = arena;
    this.engine      = engine;
    this.homePlayers = homePlayers;
    this.awayPlayers = awayPlayers;

    const physics = this.scene.physics;

    // Ball vs boundary walls
    physics.add.collider(ball, arena.walls);

    // Ball vs domes — with random angle variance and dome restitution
    physics.add.collider(ball, arena.domes, undefined, undefined, this);
    arena.domes.getChildren().forEach(dome => {
      physics.add.collider(ball, dome as Phaser.Physics.Arcade.Image, () => {
        this.applyDomeBounce(ball);
      });
    });

    // Players vs walls and domes
    const allPlayers: Player[] = [...homePlayers, ...awayPlayers];
    for (const player of allPlayers) {
      physics.add.collider(player, arena.walls);
      physics.add.collider(player, arena.domes);
    }
  }

  // ------ Per-frame update -------------------------------------------------

  update(): void {
    this.checkBallPickup();
    this.checkGoals();
    this.checkStars();
    this.checkMultipliers();
    this.checkWarps();
  }

  // ------ Ball Pickup ------------------------------------------------------

  /**
   * If the ball is loose, finds the nearest active player within
   * BALL_PICKUP_RANGE pixels and attaches the ball to them.
   */
  checkBallPickup(): void {
    if (!this.ball.isLoose()) return;
    if (this.ball.pickupCooldown > 0) return;
    if (this.ball.isHigh()) return; // can't pick up a high ball

    const allPlayers = [...this.homePlayers, ...this.awayPlayers];
    let nearest:  Player | null = null;
    let nearestD: number        = Infinity;

    for (const player of allPlayers) {
      if (!player.isActive) continue;

      const dx = player.x - this.ball.x;
      const dy = player.y - this.ball.y;
      const d  = Math.sqrt(dx * dx + dy * dy);

      if (d < BALL_PICKUP_RANGE && d < nearestD) {
        nearestD = d;
        nearest  = player;
      }
    }

    if (nearest) {
      nearest.hasBall = true;
      this.ball.attachTo(nearest, nearest.teamSide);
    }
  }

  // ------ Goal Detection ---------------------------------------------------

  /**
   * Checks whether the ball has crossed either goal line.
   * Top goal (y ≤ GOAL_Y_TOP)  → AWAY scores (attacking toward home top goal).
   * Bottom goal (y ≥ GOAL_Y_BOTTOM) → HOME scores.
   *
   * The ball must be within the goal width to count.
   */
  checkGoals(): void {
    const bx = this.ball.x;
    const by = this.ball.y;

    const halfGoalWidth = GOAL_WIDTH / 2;
    const arenaCenter   = ARENA_WIDTH / 2;

    const inGoalWidth = Math.abs(bx - arenaCenter) <= halfGoalWidth;
    if (!inGoalWidth) return;

    if (by <= GOAL_Y_TOP) {
      if (this.tryKeeperSave(this.awayPlayers)) return;
      const scoringTeam = this.engine.getTeam(TeamSide.HOME);
      this.engine.scoreGoal(scoringTeam, this.arena.multipliers);
      this.ball.release();
    } else if (by >= GOAL_Y_BOTTOM) {
      if (this.tryKeeperSave(this.homePlayers)) return;
      const scoringTeam = this.engine.getTeam(TeamSide.AWAY);
      this.engine.scoreGoal(scoringTeam, this.arena.multipliers);
      this.ball.release();
    }
  }

  // ------ Stars ------------------------------------------------------------

  /**
   * Stars can be activated by:
   * 1. A carried ball (player walks near star)
   * 2. A loose ball that was last touched by a team
   * Opponents can douse (reset) stars activated by the other team.
   */
  checkStars(): void {
    const side = this.ball.lastTouchedBy;
    if (!side) return;

    const team = this.engine.getTeam(side);

    for (const star of this.arena.stars) {
      if (star.activated && star.activatedBy === side) continue;

      const dx = this.ball.x - star.sprite.x;
      const dy = this.ball.y - star.sprite.y;
      const d  = Math.sqrt(dx * dx + dy * dy);

      if (d <= BALL_PICKUP_RANGE) {
        // If star was activated by the other team, reset it first (dousing)
        if (star.activated && star.activatedBy !== side) {
          star.reset();
        }
        this.engine.activateStar(star, team, this.arena.stars);
      }
    }
  }

  // ------ Multipliers ------------------------------------------------------

  /**
   * Checks proximity to each available multiplier power-up.
   * If the ball (even loose) is close enough, activates it for the
   * last-touching team.
   */
  checkMultipliers(): void {
    const touchingSide = this.ball.lastTouchedBy;
    if (touchingSide === null) return;

    const team = this.engine.getTeam(touchingSide);

    for (const mult of this.arena.multipliers) {
      const dx = this.ball.x - mult.sprite.x;
      const dy = this.ball.y - mult.sprite.y;
      const d  = Math.sqrt(dx * dx + dy * dy);

      if (d > BALL_PICKUP_RANGE) continue;

      if (mult.isAvailable()) {
        this.engine.activateMultiplier(mult, team);
      } else if (mult.activeForTeam !== null && mult.activeForTeam !== touchingSide) {
        const oppTeam = this.engine.getOpponentTeam(touchingSide);
        oppTeam.hasMultiplier = false;
        mult.deactivate();
        mult.sprite.setVisible(true);
      }
    }
  }

  // ------ Warps ------------------------------------------------------------

  /**
   * Teleports the ball through warp portals.
   * Left portal (x ≈ 24) teleports to right portal (x ≈ 296) at the same Y,
   * and vice versa. Only warps when the ball is moving toward the portal entrance.
   */
  checkWarps(): void {
    const body = this.ball.body as Phaser.Physics.Arcade.Body;

    for (const warp of this.arena.warps) {
      const leftX  = warp.left.x;
      const rightX = warp.right.x;
      const warpY  = warp.left.y; // both portals share same Y

      const proximity = 30; // px to trigger warp

      // Ball near left portal and moving left
      if (
        Math.abs(this.ball.x - leftX) <= proximity &&
        Math.abs(this.ball.y - warpY) <= proximity &&
        body.velocity.x < 0
      ) {
        body.reset(rightX, this.ball.y);
        // Keep velocity direction (now moving left out of right portal)
        return;
      }

      // Ball near right portal and moving right
      if (
        Math.abs(this.ball.x - rightX) <= proximity &&
        Math.abs(this.ball.y - warpY) <= proximity &&
        body.velocity.x > 0
      ) {
        body.reset(leftX, this.ball.y);
        // Keep velocity direction (now moving right out of left portal)
        return;
      }
    }
  }

  // ------ Ball Actions -----------------------------------------------------

  /**
   * Releases the ball from the given player and fires it toward (targetX, targetY)
   * at the player's shot speed.
   */
  /**
   * Releases the ball from the given player and fires it toward (targetX, targetY).
   * @param lobPower  0 = ground throw (fast), 0–1 = lob height (slower but flies over players)
   */
  shootBall(player: Player, targetX: number, targetY: number, lobPower: number = 0): void {
    player.hasBall = false;
    this.ball.release();

    // Stop the player briefly when throwing (like original SB2)
    player.idle();

    const dx    = targetX - player.x;
    const dy    = targetY - player.y;
    const len   = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const baseSpeed = getShotSpeed(player.playerDef.stats.strength);
    // Lobs are slower on the ground plane but travel through the air
    const speedMult = 1.0 - lobPower * 0.4; // lob = 60% ground speed
    const speed = baseSpeed * speedMult;

    const body  = this.ball.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((dx / len) * speed, (dy / len) * speed);
    this.ball.lastTouchedBy = player.teamSide;

    // Launch lob arc if power > 0
    if (lobPower > 0.1) {
      this.ball.lob(lobPower * 2.5); // upward velocity scales with hold time
    }
  }

  /**
   * Passes the ball from the given player to the nearest active non-keeper
   * teammate.
   */
  passBall(player: Player, teammates: Player[]): void {
    // Find nearest active non-keeper teammate
    let target:   Player | null = null;
    let bestDist: number        = Infinity;

    for (const mate of teammates) {
      if (!mate.isActive || mate.isGoalkeeper || mate === player) continue;

      const dx = mate.x - player.x;
      const dy = mate.y - player.y;
      const d  = dx * dx + dy * dy;

      if (d < bestDist) {
        bestDist = d;
        target   = mate;
      }
    }

    if (!target) return;

    player.hasBall = false;
    this.ball.release();

    const dx  = target.x - player.x;
    const dy  = target.y - player.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((dx / len) * BALL_PASS_SPEED, (dy / len) * BALL_PASS_SPEED);
    this.ball.lastTouchedBy = player.teamSide;
  }

  /**
   * Initiates a tackle lunge by the attacker.
   * Calculates the lunge endpoint and checks for opponents within
   * TACKLE_HIT_RADIUS, then calls engine.tryTackle for each hit.
   */
  handleTackle(attacker: Player, opponents: Player[]): void {
    if (!attacker.tackle()) return; // Player.tackle() returns false if cannot act

    // Calculate lunge endpoint
    const lungeX = attacker.x + Math.cos(attacker.facingAngle) * 72; // PLAYER_TACKLE_LUNGE
    const lungeY = attacker.y + Math.sin(attacker.facingAngle) * 72;

    for (const opp of opponents) {
      if (!opp.isActive) continue;

      const dx = opp.x - lungeX;
      const dy = opp.y - lungeY;
      const d  = Math.sqrt(dx * dx + dy * dy);

      if (d <= PLAYER_TACKLE_HIT_RADIUS) {
        this.engine.tryTackle(attacker, opp, this.ball);
      }
    }
  }

  // ------ Private helpers --------------------------------------------------

  private tryKeeperSave(teamPlayers: Player[]): boolean {
    const keeper = teamPlayers.find(p => p.isGoalkeeper && p.isActive);
    if (!keeper) return false;

    const dx = keeper.x - this.ball.x;
    const dy = keeper.y - this.ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > KEEPER_SAVE_ZONE) return false;

    const saveChance = getKeeperSaveChance(
      keeper.playerDef.stats.defense,
      3,
    );

    if (Math.random() < saveChance) {
      const body = this.ball.body as Phaser.Physics.Arcade.Body;
      const punchAngle = Math.atan2(
        ARENA_HEIGHT / 2 - keeper.y,
        (Math.random() - 0.5) * 200,
      );
      const punchSpeed = 400;
      body.setVelocity(
        Math.cos(punchAngle) * punchSpeed,
        Math.sin(punchAngle) * punchSpeed,
      );
      this.ball.lastTouchedBy = keeper.teamSide;
      return true;
    }

    return false;
  }

  private applyDomeBounce(ball: Ball): void {
    const body = ball.body as Phaser.Physics.Arcade.Body;

    // Calculate current angle
    const vx    = body.velocity.x;
    const vy    = body.velocity.y;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed === 0) return;

    const angle = Math.atan2(vy, vx);

    // Add random variance ±15°
    const variance = (Math.random() * 2 - 1) *
      (BALL_DOME_ANGLE_VARIANCE * Math.PI / 180);
    const newAngle = angle + variance;

    // Apply dome restitution
    const newSpeed = speed * BALL_DOME_RESTITUTION;
    body.setVelocity(
      Math.cos(newAngle) * newSpeed,
      Math.sin(newAngle) * newSpeed,
    );

    // Award 2 points to the last team that touched the ball
    if (ball.lastTouchedBy) {
      const team = this.engine.getTeam(ball.lastTouchedBy);
      team.score += POINTS_DOME;
    }
  }

  /** Finds the Player entity that currently owns the ball. */
  private findOwner(): Player | null {
    if (this.ball.isLoose()) return null;

    const owner = this.ball.owner;
    if (!owner) return null;

    const all = [...this.homePlayers, ...this.awayPlayers];
    return all.find(p => p === (owner as unknown as Player)) ?? null;
  }
}
