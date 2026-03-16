// ============================================================
// Speedball 2: Brutal Deluxe — BootScene
// Loads PNG sprite assets and shows a loading progress bar.
// ============================================================

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  // ------ Lifecycle ----------------------------------------

  preload(): void {
    this.createLoadingBar();
    this.loadSprites();
  }

  create(): void {
    this.registerAnimations();
    this.scene.start('TitleScene');
  }

  // ------ Sprite Loading ------------------------------------

  private loadSprites(): void {
    this.load.spritesheet('player_home', 'sprites/player_home.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('player_away', 'sprites/player_away.png', { frameWidth: 48, frameHeight: 48 });
    this.load.image('ball', 'sprites/ball.png');
    this.load.image('floor_tile', 'sprites/floor_tile.png');
    this.load.image('dome', 'sprites/dome.png');
    this.load.image('star', 'sprites/star.png');
    this.load.image('star_active', 'sprites/star_active.png');
    this.load.image('multiplier', 'sprites/multiplier.png');
    this.load.image('warp', 'sprites/warp.png');
    this.load.image('goal', 'sprites/goal.png');
    this.load.image('wall_tile', 'sprites/wall_tile.png');
  }

  // ------ Animation Registration ----------------------------

  private registerAnimations(): void {
    const teams = ['home', 'away'] as const;

    for (const team of teams) {
      for (let dir = 0; dir < 8; dir++) {
        this.anims.create({
          key: `run_${team}_${dir}`,
          frames: [
            { key: `player_${team}`, frame: 8 + dir },   // row 1
            { key: `player_${team}`, frame: 16 + dir },  // row 2
            { key: `player_${team}`, frame: 24 + dir },  // row 3
          ],
          frameRate: 10,
          repeat: -1,
        });
      }
    }
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
}
