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
    const boxW = 400;
    const boxH = 32;
    const boxX = cx - boxW / 2;
    const boxY = cy - boxH / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x222222, 1);
    bg.fillRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);
    bg.lineStyle(2, 0xffffff, 1);
    bg.strokeRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);

    const bar = this.add.graphics();

    // Title label
    this.add.text(cx, cy - 60, 'SPEEDBALL 2', {
      fontSize: '30px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 40, 'LOADING…', {
      fontSize: '18px',
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

  // 48×48 — detailed top-down player figure with head, body, arms, legs
  private makePlayerTexture(): void {
    const key = 'player';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Shadow under player
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(24, 42, 28, 10);

    // Legs
    g.fillStyle(0x1133cc, 1);
    g.fillRoundedRect(14, 32, 8, 12, 3);
    g.fillRoundedRect(26, 32, 8, 12, 3);

    // Boots
    g.fillStyle(0x111111, 1);
    g.fillRoundedRect(13, 40, 9, 5, 2);
    g.fillRoundedRect(26, 40, 9, 5, 2);

    // Body / jersey
    g.fillStyle(0x2244cc, 1);
    g.fillRoundedRect(13, 16, 22, 18, 4);

    // Jersey number / chest detail
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(19, 19, 10, 7);

    // Arms
    g.fillStyle(0xffcc88, 1);
    g.fillRoundedRect(4,  18, 9, 7, 3);
    g.fillRoundedRect(35, 18, 9, 7, 3);

    // Gloves
    g.fillStyle(0xdd3333, 1);
    g.fillCircle(7,  24, 4);
    g.fillCircle(41, 24, 4);

    // Neck
    g.fillStyle(0xffcc88, 1);
    g.fillRect(20, 11, 8, 6);

    // Head (skin)
    g.fillStyle(0xffcc88, 1);
    g.fillCircle(24, 9, 9);

    // Hair
    g.fillStyle(0x442200, 1);
    g.fillEllipse(24, 3, 18, 10);

    // Eyes
    g.fillStyle(0x000000, 1);
    g.fillCircle(20, 9, 2);
    g.fillCircle(28, 9, 2);

    // White eye highlights
    g.fillStyle(0xffffff, 1);
    g.fillCircle(21, 8, 1);
    g.fillCircle(29, 8, 1);

    // Outline
    g.lineStyle(1, 0x000033, 0.7);
    g.strokeRoundedRect(13, 16, 22, 18, 4);

    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  // 24×24 — 3D ball with highlight and shadow
  private makeBallTexture(): void {
    const key = 'ball';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Shadow
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(14, 22, 18, 6);

    // Main ball body
    g.fillStyle(0xdddddd, 1);
    g.fillCircle(12, 12, 11);

    // Panel lines
    g.lineStyle(1, 0x888888, 0.8);
    g.strokeCircle(12, 12, 11);
    g.strokeEllipse(12, 12, 14, 22);
    g.strokeEllipse(12, 12, 22, 14);

    // Dark shading (bottom-right)
    g.fillStyle(0x999999, 0.5);
    g.fillCircle(15, 16, 7);

    // Highlight (top-left)
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(8, 7, 4);

    // Small sparkle
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 5, 1);

    g.generateTexture(key, 24, 24);
    g.destroy();
  }

  // 48×48 — metallic grid floor tile
  private makeFloorTileTexture(): void {
    const key = 'floor_tile';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Base dark metal
    g.fillStyle(0x0a1a2e, 1);
    g.fillRect(0, 0, 48, 48);

    // Subtle mid-tone inner panel
    g.fillStyle(0x0d2040, 1);
    g.fillRect(2, 2, 44, 44);

    // Grid lines
    g.lineStyle(1, 0x1a3a5c, 1);
    // Horizontal lines at 1/3 and 2/3
    g.strokeLineShape(new Phaser.Geom.Line(2, 16, 46, 16));
    g.strokeLineShape(new Phaser.Geom.Line(2, 32, 46, 32));
    // Vertical lines at 1/3 and 2/3
    g.strokeLineShape(new Phaser.Geom.Line(16, 2, 16, 46));
    g.strokeLineShape(new Phaser.Geom.Line(32, 2, 32, 46));

    // Outer border with slight glow
    g.lineStyle(1, 0x224466, 1);
    g.strokeRect(0, 0, 48, 48);

    // Corner dots for rivets
    g.fillStyle(0x2255aa, 0.5);
    g.fillCircle(4,  4,  2);
    g.fillCircle(44, 4,  2);
    g.fillCircle(4,  44, 2);
    g.fillCircle(44, 44, 2);

    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  // 48×48 — shiny dome bumper with highlight
  private makeDomeTexture(): void {
    const key = 'dome';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Background plate
    g.fillStyle(0x004455, 1);
    g.fillRect(0, 0, 48, 48);

    // Outer glow ring
    g.lineStyle(3, 0x00ffff, 0.3);
    g.strokeCircle(24, 24, 22);

    // Main dome body
    g.fillStyle(0x008899, 1);
    g.fillCircle(24, 24, 20);

    // Mid sheen
    g.fillStyle(0x00bbcc, 1);
    g.fillCircle(24, 24, 15);

    // Inner dome
    g.fillStyle(0x00ddee, 1);
    g.fillCircle(22, 21, 9);

    // Bright highlight
    g.fillStyle(0xaaffff, 0.9);
    g.fillCircle(18, 16, 5);

    // Sparkle
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 14, 2);

    // Outline
    g.lineStyle(2, 0x00ffff, 1);
    g.strokeCircle(24, 24, 20);

    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  // 24×24 — 5-pointed star (inactive or active variant)
  private makeStarTexture(active: boolean): void {
    const key = active ? 'star_active' : 'star';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    const fillColor  = active ? 0xffee00 : 0x997700;
    const outerColor = active ? 0xffffff : 0xbbaa44;
    const glowColor  = active ? 0xffff88 : 0x665500;

    // Outer glow for active
    if (active) {
      g.fillStyle(glowColor, 0.5);
      const cx = 12, cy = 12, glowR = 12, glowInner = 5;
      const glowPts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? glowR : glowInner;
        glowPts.push(new Phaser.Math.Vector2(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
      }
      g.fillPoints(glowPts, true);
    }

    // Star body
    g.fillStyle(fillColor, 1);
    const cx = 12, cy = 12, outerR = active ? 10 : 9, innerR = active ? 4 : 4;
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

    // Outline
    g.lineStyle(1, outerColor, 1);
    g.strokePoints(points, true);

    // Highlight tip
    if (active) {
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(12, 3, 2);
    }

    g.generateTexture(key, 24, 24);
    g.destroy();
  }

  // 48×48 — glowing ×2 multiplier pickup pad
  private makeMultiplierTexture(): void {
    const key = 'multiplier';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Background pad
    g.fillStyle(0x330044, 1);
    g.fillRoundedRect(0, 0, 48, 48, 6);

    // Inner glow border
    g.lineStyle(2, 0xcc44ff, 1);
    g.strokeRoundedRect(2, 2, 44, 44, 5);

    // Outer faint glow
    g.lineStyle(4, 0x9900cc, 0.4);
    g.strokeRoundedRect(0, 0, 48, 48, 6);

    // "×" symbol (left half) — two thick diagonal lines
    g.lineStyle(4, 0xff88ff, 1);
    g.strokeLineShape(new Phaser.Geom.Line(8,  10, 22, 24));
    g.strokeLineShape(new Phaser.Geom.Line(8,  24, 22, 10));

    // Dots at ends of × for polish
    g.fillStyle(0xff88ff, 1);
    g.fillCircle(8,  10, 3);
    g.fillCircle(22, 24, 3);
    g.fillCircle(8,  24, 3);
    g.fillCircle(22, 10, 3);

    // "2" symbol (right half) — pixel-art style
    g.lineStyle(4, 0xff88ff, 1);
    g.strokeLineShape(new Phaser.Geom.Line(28, 10, 40, 10)); // top bar
    g.strokeLineShape(new Phaser.Geom.Line(40, 10, 40, 17)); // right top
    g.strokeLineShape(new Phaser.Geom.Line(28, 17, 40, 17)); // middle
    g.strokeLineShape(new Phaser.Geom.Line(28, 17, 28, 24)); // left bottom
    g.strokeLineShape(new Phaser.Geom.Line(28, 24, 40, 24)); // bottom bar

    // Small bright center glow
    g.fillStyle(0xff44ff, 0.3);
    g.fillCircle(24, 24, 12);

    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  // 48×48 — swirling warp portal
  private makeWarpTexture(): void {
    const key = 'warp';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Dark background
    g.fillStyle(0x001a00, 1);
    g.fillRect(0, 0, 48, 48);

    // Outer ring glow
    g.lineStyle(5, 0x00ff44, 0.3);
    g.strokeCircle(24, 24, 22);

    // Main portal ring
    g.lineStyle(4, 0x00ff44, 0.9);
    g.strokeCircle(24, 24, 18);

    // Middle ring
    g.lineStyle(3, 0x00cc33, 0.8);
    g.strokeCircle(24, 24, 13);

    // Inner ring
    g.lineStyle(2, 0x00aa22, 0.7);
    g.strokeCircle(24, 24, 8);

    // Inner glow fill
    g.fillStyle(0x00ff44, 0.2);
    g.fillCircle(24, 24, 8);

    // Centre dot
    g.fillStyle(0x00ff44, 1);
    g.fillCircle(24, 24, 3);

    // Bright centre spark
    g.fillStyle(0xaaffaa, 1);
    g.fillCircle(24, 24, 1);

    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  // 288×48 — goal mouth with net pattern
  private makeGoalTexture(): void {
    const key = 'goal';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Dark interior
    g.fillStyle(0x080808, 1);
    g.fillRect(0, 0, 288, 48);

    // Net horizontal lines
    g.lineStyle(1, 0x333300, 0.8);
    for (let y = 8; y < 48; y += 8) {
      g.strokeLineShape(new Phaser.Geom.Line(0, y, 288, y));
    }

    // Net vertical lines
    g.lineStyle(1, 0x333300, 0.8);
    for (let x = 12; x < 288; x += 12) {
      g.strokeLineShape(new Phaser.Geom.Line(x, 0, x, 48));
    }

    // Bright goal frame
    g.lineStyle(3, 0xffff00, 1);
    g.strokeRect(2, 2, 284, 44);

    // Post caps (top corners glint)
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(2,   2,  6, 6);
    g.fillRect(280, 2,  6, 6);

    // Bottom goal line highlight
    g.lineStyle(2, 0xffaa00, 0.6);
    g.strokeLineShape(new Phaser.Geom.Line(2, 45, 286, 45));

    g.generateTexture(key, 288, 48);
    g.destroy();
  }

  // 960×48 — horizontal wall with riveted metal texture
  private makeWallHTexture(): void {
    const key = 'wall_h';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Base dark red metal
    g.fillStyle(0x550000, 1);
    g.fillRect(0, 0, 960, 48);

    // Lighter panel
    g.fillStyle(0x770000, 1);
    g.fillRect(2, 4, 956, 40);

    // Top edge highlight
    g.lineStyle(2, 0xff4444, 1);
    g.strokeLineShape(new Phaser.Geom.Line(0, 1, 960, 1));

    // Bottom edge shadow
    g.lineStyle(2, 0x330000, 1);
    g.strokeLineShape(new Phaser.Geom.Line(0, 47, 960, 47));

    // Outer frame
    g.lineStyle(2, 0xff2222, 0.8);
    g.strokeRect(0, 0, 960, 48);

    // Panel dividers every 96px
    g.lineStyle(1, 0x440000, 0.6);
    for (let x = 96; x < 960; x += 96) {
      g.strokeLineShape(new Phaser.Geom.Line(x, 4, x, 44));
    }

    // Rivets every 48px
    g.fillStyle(0xcc2222, 1);
    for (let x = 24; x < 960; x += 48) {
      // Top rivet
      g.fillCircle(x, 10, 5);
      g.fillStyle(0xff5555, 1);
      g.fillCircle(x - 1, 9, 2);
      g.fillStyle(0xcc2222, 1);
      // Bottom rivet
      g.fillCircle(x, 38, 5);
      g.fillStyle(0xff5555, 1);
      g.fillCircle(x - 1, 37, 2);
      g.fillStyle(0xcc2222, 1);
    }

    g.generateTexture(key, 960, 48);
    g.destroy();
  }

  // 48×1440 — vertical wall with riveted metal texture
  private makeWallVTexture(): void {
    const key = 'wall_v';
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Base dark red metal
    g.fillStyle(0x550000, 1);
    g.fillRect(0, 0, 48, 1440);

    // Lighter panel
    g.fillStyle(0x770000, 1);
    g.fillRect(4, 2, 40, 1436);

    // Left edge highlight
    g.lineStyle(2, 0xff4444, 1);
    g.strokeLineShape(new Phaser.Geom.Line(1, 0, 1, 1440));

    // Right edge shadow
    g.lineStyle(2, 0x330000, 1);
    g.strokeLineShape(new Phaser.Geom.Line(47, 0, 47, 1440));

    // Outer frame
    g.lineStyle(2, 0xff2222, 0.8);
    g.strokeRect(0, 0, 48, 1440);

    // Panel dividers every 144px
    g.lineStyle(1, 0x440000, 0.6);
    for (let y = 144; y < 1440; y += 144) {
      g.strokeLineShape(new Phaser.Geom.Line(4, y, 44, y));
    }

    // Rivets every 48px
    g.fillStyle(0xcc2222, 1);
    for (let y = 24; y < 1440; y += 48) {
      // Left rivet
      g.fillCircle(10, y, 5);
      g.fillStyle(0xff5555, 1);
      g.fillCircle(9, y - 1, 2);
      g.fillStyle(0xcc2222, 1);
      // Right rivet
      g.fillCircle(38, y, 5);
      g.fillStyle(0xff5555, 1);
      g.fillCircle(37, y - 1, 2);
      g.fillStyle(0xcc2222, 1);
    }

    g.generateTexture(key, 48, 1440);
    g.destroy();
  }
}
