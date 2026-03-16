// ============================================================
// Speedball 2: Brutal Deluxe — HUD (in-match overlay)
// ============================================================

import Phaser from 'phaser';
import { TeamMatchData } from '../systems/MatchEngine';

export class HUD {
  private homeScore: Phaser.GameObjects.Text;
  private awayScore: Phaser.GameObjects.Text;
  private timer:     Phaser.GameObjects.Text;
  private halfText:  Phaser.GameObjects.Text;
  private message:   Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, homeName: string, awayName: string) {
    const depth = 100;
    const font  = 'monospace';

    // Home score — top-left
    this.homeScore = scene.add.text(24, 12, `${homeName} 0`, {
      fontSize: '21px',
      color: '#3b82f6',
      fontFamily: font,
    })
      .setScrollFactor(0)
      .setDepth(depth);

    // Away score — top-right (right-aligned)
    this.awayScore = scene.add.text(936, 12, `0 ${awayName}`, {
      fontSize: '21px',
      color: '#ef4444',
      fontFamily: font,
    })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    // Timer — top-center
    this.timer = scene.add.text(480, 12, '1:30', {
      fontSize: '21px',
      color: '#ffffff',
      fontFamily: font,
    })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    // Half indicator — below timer
    this.halfText = scene.add.text(480, 42, 'HALF 1', {
      fontSize: '18px',
      color: '#888888',
      fontFamily: font,
    })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    // Message — center screen (for KICK OFF, GOAL!, HALF TIME, FULL TIME)
    this.message = scene.add.text(480, 336, '', {
      fontSize: '30px',
      color: '#f59e0b',
      fontFamily: font,
    })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(depth)
      .setVisible(false);
  }

  // ------ Update -----------------------------------------------------------

  /**
   * Refreshes score, timer, and half indicator each frame.
   * @param home   Home team match data
   * @param away   Away team match data
   * @param timer  Remaining match time in seconds
   * @param half   Current half (1 or 2)
   */
  update(
    home:  TeamMatchData,
    away:  TeamMatchData,
    timer: number,
    half:  number,
  ): void {
    const mins = Math.floor(timer / 60);
    const secs = Math.floor(timer % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    this.homeScore.setText(`${home.score}`);
    this.awayScore.setText(`${away.score}`);
    this.timer.setText(timeStr);
    this.halfText.setText(`HALF ${half}`);
  }

  // ------ Messages ---------------------------------------------------------

  /** Displays a centered message on screen. */
  showMessage(text: string): void {
    this.message.setText(text).setVisible(true);
  }

  /** Hides the centered message. */
  clearMessage(): void {
    this.message.setVisible(false);
  }
}
