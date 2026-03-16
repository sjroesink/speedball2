// ============================================================
// Speedball 2: Brutal Deluxe — ResultScene
// Post-match result screen.
// ============================================================

import Phaser from 'phaser';
import { MatchResult } from '../utils/types';
import { createMenuText, createMenuItem, MenuSelector } from '../ui/MenuComponents';

interface ResultSceneData {
  result:       MatchResult;
  matchConfig?: unknown;
  leagueData?:  unknown;
  returnTo?:    string;
}

export class ResultScene extends Phaser.Scene {
  private menuSelector!: MenuSelector;
  private sceneData!:    ResultSceneData;

  constructor() {
    super({ key: 'ResultScene' });
  }

  // ------ Lifecycle --------------------------------------------------------

  init(data: ResultSceneData): void {
    this.sceneData = data;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const { result } = this.sceneData;

    let y = 28;

    // Title
    createMenuText(this, cx, y, 'MATCH RESULT', 12);
    y += 28;

    // Score
    createMenuText(this, cx, y, `${result.homeScore}  -  ${result.awayScore}`, 16);
    y += 28;

    // Team names beneath score
    createMenuText(this, cx - 50, y, result.homeTeam, 7);
    createMenuText(this, cx + 50, y, result.awayTeam, 7);
    y += 18;

    // Separator
    createMenuText(this, cx, y, '─────────────────', 6);
    y += 14;

    // Stats block (7px)
    const statsLines: string[] = [
      `TACKLES  ${result.homeTackles}  -  ${result.awayTackles}`,
    ];

    if (result.homeGoals.length > 0 || result.awayGoals.length > 0) {
      const homeScorers = result.homeGoals.join(', ') || '-';
      const awayScorers = result.awayGoals.join(', ') || '-';
      statsLines.push(`SCORERS  ${homeScorers}  /  ${awayScorers}`);
    }

    statsLines.push(`MVP  ${result.mvp}`);

    for (const line of statsLines) {
      createMenuText(this, cx, y, line, 7);
      y += 12;
    }

    // Credits earned (8px) — only shown if > 0
    if (result.creditsEarned > 0) {
      y += 6;
      createMenuText(this, cx, y, `CREDITS EARNED  ${result.creditsEarned}`, 8);
      y += 16;
    } else {
      y += 10;
    }

    // CONTINUE menu item
    const continueItem = createMenuItem(this, cx, y, 'CONTINUE', () => this.onContinue());

    this.menuSelector = new MenuSelector(
      this,
      [continueItem],
      [() => this.onContinue()],
    );

    // Footer hint
    createMenuText(this, cx, height - 14, 'Z / SPACE TO CONTINUE', 6);
  }

  update(_time: number, _delta: number): void {
    this.menuSelector.update();
  }

  // ------ Navigation -------------------------------------------------------

  private onContinue(): void {
    const { leagueData, returnTo } = this.sceneData;

    if (leagueData !== undefined) {
      this.scene.start('LeagueScene', { leagueData });
    } else if (returnTo) {
      this.scene.start(returnTo);
    } else {
      this.scene.start('TitleScene');
    }
  }
}
