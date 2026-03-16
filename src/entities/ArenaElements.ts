// ============================================================
// Speedball 2: Brutal Deluxe — Arena Elements
// ============================================================

import Phaser from 'phaser';
import { TeamSide } from '../utils/types';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  MULTIPLIER_RESPAWN_TIME,
} from '../config/gameConfig';

// ================================================================
// Types & Interfaces
// ================================================================

export interface ArenaLayout {
  walls:       Phaser.Physics.Arcade.StaticGroup;
  domes:       Phaser.Physics.Arcade.StaticGroup;
  stars:       StarElement[];
  multipliers: MultiplierElement[];
  warps:       WarpPair[];
  goals: {
    top:    Phaser.GameObjects.Image;
    bottom: Phaser.GameObjects.Image;
  };
}

// ================================================================
// StarElement
// ================================================================

export class StarElement {
  readonly sprite:     Phaser.GameObjects.Image;
  activated:           boolean    = false;
  readonly side:       'top' | 'bottom';
  activatedBy:         TeamSide | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    side: 'top' | 'bottom',
  ) {
    this.side   = side;
    this.sprite = scene.add.image(x, y, 'star');
  }

  /**
   * Activates this star for the given team.
   * Swaps to the active texture.
   */
  activate(team: TeamSide): void {
    this.activated   = true;
    this.activatedBy = team;
    this.sprite.setTexture('star_active');
  }

  /** Resets the star to its deactivated state. */
  reset(): void {
    this.activated   = false;
    this.activatedBy = null;
    this.sprite.setTexture('star');
  }
}

// ================================================================
// MultiplierElement
// ================================================================

export class MultiplierElement {
  readonly sprite: Phaser.GameObjects.Image;
  activeForTeam:   TeamSide | null = null;
  private respawnTimer: number     = 0; // seconds
  readonly side:   'top' | 'bottom';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    side: 'top' | 'bottom',
  ) {
    this.side   = side;
    this.sprite = scene.add.image(x, y, 'multiplier');
  }

  /** Activates the multiplier for the given team and hides the sprite. */
  activate(team: TeamSide): void {
    this.activeForTeam = team;
    this.sprite.setVisible(false);
    this.respawnTimer  = MULTIPLIER_RESPAWN_TIME;
  }

  /** Clears the active team (multiplier expired / used up). */
  deactivate(): void {
    this.activeForTeam = null;
  }

  /**
   * Ticks the respawn timer. When it reaches zero the multiplier
   * becomes visible and available again.
   * @param delta  Frame delta in milliseconds
   */
  update(delta: number): void {
    if (this.respawnTimer <= 0) return;

    this.respawnTimer -= delta / 1000;

    if (this.respawnTimer <= 0) {
      this.respawnTimer = 0;
      this.deactivate();
      this.sprite.setVisible(true);
    }
  }

  /** Returns true when the multiplier can be picked up. */
  isAvailable(): boolean {
    return this.sprite.visible && this.activeForTeam === null;
  }
}

// ================================================================
// WarpPair
// ================================================================

/**
 * A pair of warp portals on the left and right walls at the same Y.
 * Left portal is at x=24, right at x=296.
 */
export class WarpPair {
  readonly left:  Phaser.GameObjects.Image;
  readonly right: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, y: number) {
    this.left  = scene.add.image(24,  y, 'warp');
    this.right = scene.add.image(296, y, 'warp');
  }
}

// ================================================================
// createArena
// ================================================================

/**
 * Builds and returns the complete arena layout:
 *  - Boundary walls (static physics bodies)
 *  - Goals (top and bottom)
 *  - Dome bumpers
 *  - Stars
 *  - Score multipliers
 *  - Warp pairs
 */
export function createArena(scene: Phaser.Scene): ArenaLayout {
  const W = ARENA_WIDTH;
  const H = ARENA_HEIGHT;

  // ------ Walls -----------------------------------------------------------
  const walls = scene.physics.add.staticGroup();

  const wallThickness = 16;
  const wallColor     = 0x4a6fa5;

  /** Helper: create a wall rectangle as a static physics body. */
  function addWall(x: number, y: number, w: number, h: number): void {
    const g = scene.add.graphics();
    g.fillStyle(wallColor, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(`wall_${x}_${y}`, w, h);
    g.destroy();

    const wall = scene.physics.add.staticImage(x + w / 2, y + h / 2, `wall_${x}_${y}`);
    wall.setImmovable(true);
    wall.refreshBody();
    walls.add(wall);
  }

  // Top wall
  addWall(0, 0, W, wallThickness);
  // Bottom wall
  addWall(0, H - wallThickness, W, wallThickness);
  // Left wall
  addWall(0, 0, wallThickness, H);
  // Right wall
  addWall(W - wallThickness, 0, wallThickness, H);

  // ------ Goals -----------------------------------------------------------
  const goalTop    = scene.add.image(W / 2, 24,      'goal');
  const goalBottom = scene.add.image(W / 2, H - 24,  'goal');

  // ------ Domes -----------------------------------------------------------
  const domes = scene.physics.add.staticGroup();

  const domePositions: [number, number][] = [
    [96,  48],  [224,  48],
    [112, 80],  [208,  80],
    [96,  224], [224, 224],
    [112, 400], [208, 400],
  ];

  for (const [dx, dy] of domePositions) {
    const dome = scene.physics.add.staticImage(dx, dy, 'dome');
    dome.setImmovable(true);
    // Circular hitbox radius 8, centred on the 16×16 sprite
    (dome.body as Phaser.Physics.Arcade.StaticBody).setCircle(8, 0, 0);
    dome.refreshBody();
    domes.add(dome);
  }

  // ------ Stars -----------------------------------------------------------
  const topStarPositions:    [number, number][] = [
    [40,  48], [40,  64], [40,  96], [280, 48], [280, 64],
  ];
  const bottomStarPositions: [number, number][] = [
    [40,  384], [40,  416], [40,  432], [280, 416], [280, 384],
  ];

  const stars: StarElement[] = [
    ...topStarPositions.map(([x, y])    => new StarElement(scene, x, y, 'top')),
    ...bottomStarPositions.map(([x, y]) => new StarElement(scene, x, y, 'bottom')),
  ];

  // ------ Multipliers -----------------------------------------------------
  const multipliers: MultiplierElement[] = [
    new MultiplierElement(scene, W / 2, 64,       'top'),
    new MultiplierElement(scene, W / 2, H - 64,   'bottom'),
  ];

  // ------ Warps -----------------------------------------------------------
  const warps: WarpPair[] = [
    new WarpPair(scene, 112),
    new WarpPair(scene, 368),
  ];

  // ------ Layout ----------------------------------------------------------
  return {
    walls,
    domes,
    stars,
    multipliers,
    warps,
    goals: {
      top:    goalTop,
      bottom: goalBottom,
    },
  };
}
