// ============================================================
// Speedball 2: Brutal Deluxe — BootScene
// Generates all placeholder canvas textures and shows a
// loading progress bar while doing so.
// ============================================================

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  // ------ Lifecycle ----------------------------------------

  preload(): void {
    this.createLoadingBar();
  }

  create(): void {
    this.generateTextures();
    this.scene.start('TitleScene');
  }

  // ------ Loading Bar --------------------------------------

  private createLoadingBar(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Background box
    const boxW = 200;
    const boxH = 16;
    const boxX = cx - boxW / 2;
    const boxY = cy - boxH / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x222222, 1);
    bg.fillRect(boxX - 2, boxY - 2, boxW + 4, boxH + 4);
    bg.lineStyle(1, 0xffffff, 1);
    bg.strokeRect(boxX - 2, boxY - 2, boxW + 4, boxH + 4);

    const bar = this.add.graphics();

    // Title label
    this.add.text(cx, cy - 30, 'SPEEDBALL 2', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 20, 'LOADING…', {
      fontSize: '8px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Phaser load events for progress
    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0x00ffcc, 1);
      bar.fillRect(boxX, boxY, boxW * value, boxH);
    });

    this.load.on('complete', () => {
      bar.clear();
      bar.fillStyle(0x00ffcc, 1);
      bar.fillRect(boxX, boxY, boxW, boxH);
    });
  }

  // ------ Texture Generation --------------------------------

  private generateTextures(): void {
    this.makePlayerTexture();
    this.makeBallTexture();
    this.makeFloorTileTexture();
    this.makeDomeTexture();
    this.makeStarTexture(false);
    this.makeStarTexture(true);
    this.makeMultiplierTexture();
    this.makeWarpTexture();
    this.makeGoalTexture();
    this.makeWallHTexture();
    this.makeWallVTexture();
  }

  // 16×16 — humanoid silhouette
  private makePlayerTexture(): void {
    const key = 'player';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Body (dark blue)
    g.fillStyle(0x2244aa, 1);
    g.fillRect(5, 6, 6, 7);

    // Head
    g.fillStyle(0xffcc88, 1);
    g.fillCircle(8, 4, 3);

    // Legs
    g.fillStyle(0x1133aa, 1);
    g.fillRect(5, 13, 2, 3);
    g.fillRect(9, 13, 2, 3);

    // Arms
    g.fillStyle(0xffcc88, 1);
    g.fillRect(2, 7, 3, 2);
    g.fillRect(11, 7, 3, 2);

    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  // 8×8 — bright white/grey ball
  private makeBallTexture(): void {
    const key = 'ball';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0xeeeeee, 1);
    g.fillCircle(4, 4, 4);

    // Shading
    g.fillStyle(0xaaaaaa, 1);
    g.fillCircle(5, 5, 2);

    // Highlight
    g.fillStyle(0xffffff, 1);
    g.fillCircle(2, 2, 1);

    g.generateTexture(key, 8, 8);
    g.destroy();
  }

  // 16×16 — dark blue arena tile with grid lines
  private makeFloorTileTexture(): void {
    const key = 'floor_tile';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x001133, 1);
    g.fillRect(0, 0, 16, 16);

    g.lineStyle(1, 0x002255, 1);
    g.strokeRect(0, 0, 16, 16);

    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  // 16×16 — rounded dome / bumper in cyan
  private makeDomeTexture(): void {
    const key = 'dome';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x006666, 1);
    g.fillRect(0, 0, 16, 16);

    g.fillStyle(0x00aaaa, 1);
    g.fillCircle(8, 8, 7);

    g.fillStyle(0x00dddd, 1);
    g.fillCircle(6, 6, 2);

    g.lineStyle(1, 0x00ffff, 1);
    g.strokeCircle(8, 8, 7);

    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  // 8×8 — gold star (inactive or active variant)
  private makeStarTexture(active: boolean): void {
    const key = active ? 'star_active' : 'star';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    const color = active ? 0xffdd00 : 0x886600;
    const outline = active ? 0xffffff : 0xaaaaaa;

    g.fillStyle(color, 1);
    // Simple 5-point star via polygon points
    const cx = 4, cy = 4, outerR = 4, innerR = 2;
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      points.push(new Phaser.Math.Vector2(
        cx + Math.cos(angle) * r,
        cy + Math.sin(angle) * r,
      ));
    }
    g.fillPoints(points, true);

    g.lineStyle(1, outline, 1);
    g.strokePoints(points, true);

    g.generateTexture(key, 8, 8);
    g.destroy();
  }

  // 16×16 — score multiplier pickup (magenta ×2 symbol)
  private makeMultiplierTexture(): void {
    const key = 'multiplier';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x660066, 1);
    g.fillRect(0, 0, 16, 16);

    g.lineStyle(1, 0xff44ff, 1);
    g.strokeRect(1, 1, 14, 14);

    // Draw ×2 as simple pixel lines
    g.lineStyle(2, 0xff88ff, 1);
    // × symbol: two diagonal lines 3,3→7,7 and 3,7→7,3
    g.strokeLineShape(new Phaser.Geom.Line(3, 4, 7, 8));
    g.strokeLineShape(new Phaser.Geom.Line(3, 8, 7, 4));
    // 2 symbol: rough strokes
    g.strokeLineShape(new Phaser.Geom.Line(9,  4, 13,  4));
    g.strokeLineShape(new Phaser.Geom.Line(13, 4, 13,  6));
    g.strokeLineShape(new Phaser.Geom.Line(9,  6, 13,  6));
    g.strokeLineShape(new Phaser.Geom.Line(9,  6,  9,  8));
    g.strokeLineShape(new Phaser.Geom.Line(9,  8, 13,  8));

    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  // 16×16 — warp tile (swirling green portal)
  private makeWarpTexture(): void {
    const key = 'warp';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x003300, 1);
    g.fillRect(0, 0, 16, 16);

    g.lineStyle(2, 0x00ff44, 1);
    g.strokeCircle(8, 8, 6);

    g.lineStyle(1, 0x00cc33, 1);
    g.strokeCircle(8, 8, 3);

    g.fillStyle(0x00ff44, 1);
    g.fillCircle(8, 8, 1);

    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  // 96×16 — goal mouth (yellow frame, dark interior)
  private makeGoalTexture(): void {
    const key = 'goal';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Interior
    g.fillStyle(0x111111, 1);
    g.fillRect(0, 0, 96, 16);

    // Frame
    g.lineStyle(2, 0xffff00, 1);
    g.strokeRect(1, 1, 94, 14);

    // Net lines (vertical)
    g.lineStyle(1, 0x444400, 1);
    for (let x = 8; x < 96; x += 8) {
      g.strokeLineShape(new Phaser.Geom.Line(x, 0, x, 16));
    }

    g.generateTexture(key, 96, 16);
    g.destroy();
  }

  // 320×16 — horizontal wall (red top/bottom boundary)
  private makeWallHTexture(): void {
    const key = 'wall_h';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x660000, 1);
    g.fillRect(0, 0, 320, 16);

    g.lineStyle(2, 0xff2222, 1);
    g.strokeRect(0, 0, 320, 16);

    // Rivets
    g.fillStyle(0xaa0000, 1);
    for (let x = 8; x < 320; x += 32) {
      g.fillCircle(x, 8, 3);
    }

    g.generateTexture(key, 320, 16);
    g.destroy();
  }

  // 16×480 — vertical wall (red side boundary)
  private makeWallVTexture(): void {
    const key = 'wall_v';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x660000, 1);
    g.fillRect(0, 0, 16, 480);

    g.lineStyle(2, 0xff2222, 1);
    g.strokeRect(0, 0, 16, 480);

    // Rivets
    g.fillStyle(0xaa0000, 1);
    for (let y = 8; y < 480; y += 32) {
      g.fillCircle(8, y, 3);
    }

    g.generateTexture(key, 16, 480);
    g.destroy();
  }
}
