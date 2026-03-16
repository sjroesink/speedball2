// ============================================================
// Speedball 2: Brutal Deluxe — TitleScene
// Main menu with keyboard-navigable selector.
// ============================================================

import Phaser from 'phaser';
import { createMenuText, createMenuItem, MenuSelector } from '../ui/MenuComponents';

export class TitleScene extends Phaser.Scene {
  private menuSelector!: MenuSelector;

  constructor() {
    super({ key: 'TitleScene' });
  }

  // ------ Lifecycle --------------------------------------------------------

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Title text
    createMenuText(this, cx, 48, 'SPEEDBALL 2', 16);
    createMenuText(this, cx, 72, 'BRUTAL DELUXE', 10);

    // Decorative separator
    createMenuText(this, cx, 94, '─────────────────', 8);

    // Menu items
    const menuY   = [120, 140, 160];
    const labels  = ['LEAGUE', 'FRIENDLY', 'OPTIONS'];
    const callbacks: Array<() => void> = [
      () => this.scene.start('LeagueScene'),
      () => this.scene.start('FriendlyScene'),
      () => { /* OPTIONS: no-op for now */ },
    ];

    const items = labels.map((label, i) =>
      createMenuItem(this, cx, menuY[i], label, callbacks[i]),
    );

    this.menuSelector = new MenuSelector(this, items, callbacks);

    // Footer
    createMenuText(this, cx, height - 16, 'UP/DOWN  Z/SPACE TO SELECT', 6);
  }

  update(_time: number, _delta: number): void {
    this.menuSelector.update();
  }
}
