// ============================================================
// Speedball 2: Brutal Deluxe — Player Entity
// ============================================================

import Phaser from 'phaser';
import { TeamSide, PlayerRole, PlayerState, PlayerDef } from '../utils/types';
import {
  getMaxSpeed,
  getShotSpeed,
  STUN_DURATION,
  PLAYER_TACKLE_LUNGE,
} from '../config/gameConfig';

// Injury recovery duration (seconds) — defined in spec as 10 s
const INJURY_DURATION = 10;

function angleToDirIndex(angle: number): number {
  // Convert atan2 angle (0=East, CW in screen) to compass index (0=N, CW)
  // In Phaser screen coords: right=0, down=+PI/2, left=+-PI, up=-PI/2
  const adjusted = angle + Math.PI / 2;
  const normalized = ((adjusted % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor((normalized + Math.PI / 8) / (Math.PI / 4)) % 8;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  // ------ Core properties -------------------------------------------------
  readonly playerDef:         PlayerDef;
  readonly teamSide:          TeamSide;
  readonly isControlledByHuman: boolean;
  private readonly teamKey:   'home' | 'away';

  playerState: PlayerState = PlayerState.IDLE;
  hasBall:     boolean     = false;
  facingAngle: number      = 0; // radians

  /** Resting / spawn position for this player. */
  homeX: number;
  homeY: number;

  /** Pre-calculated top speed based on the speed stat. */
  readonly maxSpeed: number;

  // ------ State timers ----------------------------------------------------
  private stateTimer: number = 0; // seconds remaining in current timed state

  // ------ Construction -----------------------------------------------------

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerDef: PlayerDef,
    teamSide: TeamSide,
    isControlledByHuman: boolean = false,
  ) {
    super(scene, x, y, teamSide === TeamSide.HOME ? 'player_home' : 'player_away');

    this.playerDef           = playerDef;
    this.teamSide            = teamSide;
    this.teamKey             = teamSide === TeamSide.HOME ? 'home' : 'away';
    this.isControlledByHuman = isControlledByHuman;
    this.homeX               = x;
    this.homeY               = y;
    this.maxSpeed            = getMaxSpeed(playerDef.stats.speed);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.initPhysics();
  }

  private initPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    // Circular hitbox: radius 18, offset to centre on the 48×48 sprite
    body.setCircle(18, 6, 6);
  }

  // ------ Getters ----------------------------------------------------------

  get isGoalkeeper(): boolean {
    return this.playerDef.role === PlayerRole.GOALKEEPER;
  }

  /** Active = not injured. */
  get isActive(): boolean {
    return this.playerState !== PlayerState.INJURED;
  }

  /** canAct = player is idle or running (not mid-action or downed). */
  get canAct(): boolean {
    return (
      this.playerState === PlayerState.IDLE ||
      this.playerState === PlayerState.RUNNING
    );
  }

  // ------ Actions ----------------------------------------------------------

  /**
   * Moves the player in the given direction at maxSpeed.
   * Direction is normalised, so only the angle matters.
   * Sets playerState to RUNNING and updates facingAngle.
   */
  moveInDirection(dx: number, dy: number): void {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) {
      this.idle();
      return;
    }

    const nx = dx / len;
    const ny = dy / len;

    this.facingAngle = Math.atan2(ny, nx);
    this.playerState = PlayerState.RUNNING;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(nx * this.maxSpeed, ny * this.maxSpeed);
  }

  /** Stops the player and sets state to IDLE. */
  idle(): void {
    this.playerState = PlayerState.IDLE;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  /**
   * Attempts a tackle lunge in the current facing direction.
   * Only succeeds if canAct is true and the player does not have the ball.
   * @returns true if the tackle was initiated, false otherwise.
   */
  tackle(): boolean {
    if (!this.canAct || this.hasBall) return false;

    this.playerState = PlayerState.TACKLING;
    this.stateTimer  = 0.3; // TACKLE_RECOVERY_TIME

    const body = this.body as Phaser.Physics.Arcade.Body;
    const lungeSpeed = PLAYER_TACKLE_LUNGE / 0.3; // cover lunge distance in recovery time
    body.setVelocity(
      Math.cos(this.facingAngle) * lungeSpeed,
      Math.sin(this.facingAngle) * lungeSpeed,
    );

    return true;
  }

  /**
   * Stuns the player for STUN_DURATION seconds, stopping movement.
   */
  stun(): void {
    this.playerState = PlayerState.STUNNED;
    this.stateTimer  = STUN_DURATION;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  /**
   * Brief recovery after throwing/passing. Player can't move for a short time.
   * This prevents the player from immediately chasing and re-catching their own ball.
   */
  throwRecovery(): void {
    this.playerState = PlayerState.SHOOTING;
    this.stateTimer  = 0.25; // 250ms recovery

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  /**
   * Injures the player for INJURY_DURATION seconds.
   * The player becomes inactive (alpha 0.3) until recovery.
   */
  injure(): void {
    this.playerState = PlayerState.INJURED;
    this.stateTimer  = INJURY_DURATION;

    this.setAlpha(0.5);
    this.setActive(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  // ------ Stats ------------------------------------------------------------

  /** Returns the shot speed (px/s) based on this player's strength stat. */
  getShotSpeed(): number {
    return getShotSpeed(this.playerDef.stats.strength);
  }

  // ------ Animation --------------------------------------------------------

  private updateAnimation(): void {
    const dir = angleToDirIndex(this.facingAngle);
    switch (this.playerState) {
      case PlayerState.IDLE:
        this.stop();
        this.setFrame(dir);
        break;
      case PlayerState.RUNNING: {
        const animKey = `run_${this.teamKey}_${dir}`;
        if (this.anims.currentAnim?.key !== animKey) {
          this.play(animKey);
        }
        break;
      }
      case PlayerState.TACKLING:
        this.stop();
        this.setFrame(32 + dir);
        break;
      case PlayerState.STUNNED:
        this.stop();
        this.setFrame(40 + dir);
        break;
      case PlayerState.INJURED:
        this.stop();
        this.setFrame(48 + dir);
        break;
      case PlayerState.SHOOTING:
      case PlayerState.PASSING:
        this.stop();
        this.setFrame(56 + dir);
        break;
    }
  }

  // ------ Update -----------------------------------------------------------

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // Tick any active state timer
    if (this.stateTimer > 0) {
      this.stateTimer -= dt;

      if (this.stateTimer <= 0) {
        this.stateTimer = 0;
        this.onStateTimerExpired();
      }
    }

    this.updateAnimation();
  }

  // ------ Private helpers --------------------------------------------------

  private onStateTimerExpired(): void {
    switch (this.playerState) {
      case PlayerState.STUNNED:
      case PlayerState.TACKLING:
      case PlayerState.SHOOTING:
      case PlayerState.PASSING:
        this.playerState = PlayerState.IDLE;
        (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        break;

      case PlayerState.INJURED:
        // Recovery: reset to home position, restore visibility & activity
        this.setAlpha(1);
        this.setActive(true);
        this.setPosition(this.homeX, this.homeY);
        (this.body as Phaser.Physics.Arcade.Body).reset(this.homeX, this.homeY);
        this.playerState = PlayerState.IDLE;
        break;

      default:
        break;
    }
  }
}
