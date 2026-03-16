// ============================================================
// Speedball 2: Brutal Deluxe — Ball Entity
// ============================================================

import Phaser from 'phaser';
import { TeamSide } from '../utils/types';
import { BALL_FRICTION, BALL_WALL_RESTITUTION } from '../config/gameConfig';

export class Ball extends Phaser.Physics.Arcade.Sprite {
  /** The player sprite currently carrying the ball, or null if loose. */
  owner: Phaser.GameObjects.Sprite | null = null;

  /** The team side that last touched the ball. */
  lastTouchedBy: TeamSide | null = null;

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

    // Circular hitbox: radius 3, centred on the 8×8 sprite
    body.setCircle(3, 1, 1);
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

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  /** Releases the ball from its current owner. */
  release(): void {
    this.owner = null;
  }

  /** Returns true when no player owns the ball. */
  isLoose(): boolean {
    return this.owner === null;
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
   * @param delta  Frame delta in milliseconds
   */
  applyFriction(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dt   = delta / 1000;
    const vx   = body.velocity.x;
    const vy   = body.velocity.y;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed <= 0) return;

    const reduction = BALL_FRICTION * dt;
    if (reduction >= speed) {
      body.setVelocity(0, 0);
      return;
    }

    const scale = (speed - reduction) / speed;
    body.setVelocity(vx * scale, vy * scale);
  }

  // ------ Update -----------------------------------------------------------

  update(_time: number, delta: number): void {
    if (!this.isLoose()) {
      this.followOwner();
    } else {
      this.applyFriction(delta);
    }
  }
}
