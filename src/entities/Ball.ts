// ============================================================
// Speedball 2: Brutal Deluxe — Ball Entity
// ============================================================

import Phaser from 'phaser';
import { TeamSide } from '../utils/types';
import { BALL_FRICTION, BALL_WALL_RESTITUTION } from '../config/gameConfig';

/** Gravity pulling the ball back down when lobbed (units/s²). */
const LOB_GRAVITY = 3.0;

export class Ball extends Phaser.Physics.Arcade.Sprite {
  /** The player sprite currently carrying the ball, or null if loose. */
  owner: Phaser.GameObjects.Sprite | null = null;

  /** The team side that last touched the ball. */
  lastTouchedBy: TeamSide | null = null;

  /** Cooldown (seconds) before the ball can be picked up again after a throw/pass. */
  pickupCooldown: number = 0;

  // ------ Height / lob system ------

  /** Ball height above ground (0 = ground, >0 = airborne). */
  height: number = 0;

  /** Vertical velocity for the lob arc (units/s, positive = going up). */
  heightVelocity: number = 0;

  /** Base scale of the ball sprite. */
  private readonly baseScale: number = 1;

  // ------ Construction -----------------------------------------------------

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'ball');

    // Add to scene display list and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.initPhysics();
  }

  private initPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    body.setCollideWorldBounds(true);
    body.setBounce(BALL_WALL_RESTITUTION, BALL_WALL_RESTITUTION);
    body.setDrag(0, 0); // friction handled manually in applyFriction()

    // Circular hitbox: radius 9, centred on the 24×24 sprite
    body.setCircle(9, 3, 3);
  }

  // ------ Ownership --------------------------------------------------------

  /**
   * Attaches the ball to a sprite (player picks it up).
   * @param sprite  The owner sprite
   * @param side    Which team the owner belongs to
   */
  attachTo(sprite: Phaser.GameObjects.Sprite, side: TeamSide): void {
    this.owner = sprite;
    this.lastTouchedBy = side;
    this.height = 0;
    this.heightVelocity = 0;
    this.setScale(this.baseScale);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  /** Releases the ball from its current owner with a brief pickup cooldown. */
  release(): void {
    this.owner = null;
    this.pickupCooldown = 0.35; // 350ms before anyone can pick it up again
  }

  /** Returns true when no player owns the ball. */
  isLoose(): boolean {
    return this.owner === null;
  }

  /** Returns true when the ball is high enough to fly over players. */
  isHigh(): boolean {
    return this.height > 0.3;
  }

  /**
   * Launches the ball into a lob arc.
   * @param upVelocity  Initial upward velocity (higher = longer airtime)
   */
  lob(upVelocity: number): void {
    this.heightVelocity = upVelocity;
  }

  // ------ Movement ---------------------------------------------------------

  /** Snaps the ball to its owner's position when carried. */
  followOwner(): void {
    if (this.owner === null) return;
    this.setPosition(this.owner.x, this.owner.y);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(this.owner.x, this.owner.y);
  }

  /**
   * Decelerates the loose ball by BALL_FRICTION each second.
   * Stops the ball completely once speed drops to zero.
   * High balls have less friction (air resistance is lower).
   * @param delta  Frame delta in milliseconds
   */
  applyFriction(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dt   = delta / 1000;
    const vx   = body.velocity.x;
    const vy   = body.velocity.y;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed <= 0) return;

    // Less friction when airborne
    const frictionMult = this.height > 0.1 ? 0.3 : 1.0;
    const reduction = BALL_FRICTION * frictionMult * dt;
    if (reduction >= speed) {
      body.setVelocity(0, 0);
      return;
    }

    const scale = (speed - reduction) / speed;
    body.setVelocity(vx * scale, vy * scale);
  }

  // ------ Update -----------------------------------------------------------

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    if (!this.isLoose()) {
      this.followOwner();
    } else {
      this.applyFriction(delta);

      // Update height arc (lob physics)
      if (this.height > 0 || this.heightVelocity > 0) {
        this.heightVelocity -= LOB_GRAVITY * dt;
        this.height += this.heightVelocity * dt;

        if (this.height <= 0) {
          // Ball has landed
          this.height = 0;
          this.heightVelocity = 0;
        }

        // Visual: scale up when high (closer to camera perspective)
        const visualScale = this.baseScale + this.height * 0.6;
        this.setScale(visualScale);

        // Visual: slight alpha change for depth
        this.setAlpha(this.height > 0.1 ? 0.85 : 1);
      } else {
        this.setScale(this.baseScale);
        this.setAlpha(1);
      }
    }

    // Tick pickup cooldown
    if (this.pickupCooldown > 0) {
      this.pickupCooldown -= dt;
    }
  }
}
