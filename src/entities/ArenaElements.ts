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
 * Left portal is at x=72, right at x=888 (3x scaled from 24, 296).
 */
export class WarpPair {
  readonly left:  Phaser.GameObjects.Image;
  readonly right: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, y: number) {
    this.left  = scene.add.image(72,  y, 'warp');
    this.right = scene.add.image(888, y, 'warp');
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

  const wallThickness = 48;

  /** Helper: create a wall rectangle as a static physics body. */
  function addWall(x: number, y: number, w: number, h: number): void {
    const g = scene.add.graphics();
    g.fillStyle(0x770000, 1);
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
  const goalTop    = scene.add.image(W / 2, 72,      'goal');
  const goalBottom = scene.add.image(W / 2, H - 72,  'goal');

  // ------ Domes -----------------------------------------------------------
  const domes = scene.physics.add.staticGroup();

  // Original positions × 3:
  // (96,48)→(288,144), (224,48)→(672,144)
  // (112,80)→(336,240), (208,80)→(624,240)
  // (96,224)→(288,672), (224,224)→(672,672)
  // (112,400)→(336,1200), (208,400)→(624,1200)
  const domePositions: [number, number][] = [
    [288, 144], [672, 144],
    [336, 240], [624, 240],
    [288, 672], [672, 672],
    [336, 1200], [624, 1200],
  ];

  for (const [dx, dy] of domePositions) {
    const dome = scene.physics.add.staticImage(dx, dy, 'dome');
    dome.setImmovable(true);
    // Circular hitbox radius 24, centred on the 48×48 sprite
    (dome.body as Phaser.Physics.Arcade.StaticBody).setCircle(24, 0, 0);
    dome.refreshBody();
    domes.add(dome);
  }

  // ------ Stars -----------------------------------------------------------
  // Original positions × 3:
  // top:    (40,48)→(120,144), (40,64)→(120,192), (40,96)→(120,288)
  //         (280,48)→(840,144), (280,64)→(840,192)
  // bottom: (40,384)→(120,1152), (40,416)→(120,1248), (40,432)→(120,1296)
  //         (280,416)→(840,1248), (280,384)→(840,1152)
  const topStarPositions:    [number, number][] = [
    [120, 144], [120, 192], [120, 288], [840, 144], [840, 192],
  ];
  const bottomStarPositions: [number, number][] = [
    [120, 1152], [120, 1248], [120, 1296], [840, 1248], [840, 1152],
  ];

  const stars: StarElement[] = [
    ...topStarPositions.map(([x, y])    => new StarElement(scene, x, y, 'top')),
    ...bottomStarPositions.map(([x, y]) => new StarElement(scene, x, y, 'bottom')),
  ];

  // ------ Multipliers -----------------------------------------------------
  // (W/2, 64)→(W/2, 192), (W/2, H-64)→(W/2, H-192)
  const multipliers: MultiplierElement[] = [
    new MultiplierElement(scene, W / 2, 192,       'top'),
    new MultiplierElement(scene, W / 2, H - 192,   'bottom'),
  ];

  // ------ Warps -----------------------------------------------------------
  // y positions: 112→336, 368→1104
  const warps: WarpPair[] = [
    new WarpPair(scene, 336),
    new WarpPair(scene, 1104),
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
