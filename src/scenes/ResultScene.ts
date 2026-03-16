// ============================================================
// Speedball 2: Brutal Deluxe — ResultScene
// Post-match result screen.
// ============================================================

import Phaser from 'phaser';
import { MatchResult } from '../utils/types';
import { createMenuText, createMenuItem, MenuSelector } from '../ui/MenuComponents';
import { LeagueData } from './LeagueScene';
import { MatchConfig } from './MatchScene';
import { ALL_TEAMS } from '../config/teams';
import { TeamSide } from '../utils/types';

interface ResultSceneData {
  result:       MatchResult;
  matchConfig?: MatchConfig;
  leagueData?:  LeagueData;
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

    // If we came from a league match, update the league state now
    this.applyLeagueResult();

    let y = 84;

    // Title
    createMenuText(this, cx, y, 'MATCH RESULT', 36);
    y += 84;

    // Score
    createMenuText(this, cx, y, `${result.homeScore}  -  ${result.awayScore}`, 48);
    y += 84;

    // Team names beneath score
    createMenuText(this, cx - 150, y, result.homeTeam, 21);
    createMenuText(this, cx + 150, y, result.awayTeam, 21);
    y += 54;

    // Separator
    createMenuText(this, cx, y, '─────────────────', 18);
    y += 42;

    // Stats block (21px)
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
      createMenuText(this, cx, y, line, 21);
      y += 36;
    }

    // Credits earned (24px) — only shown if > 0
    if (result.creditsEarned > 0) {
      y += 18;
      createMenuText(this, cx, y, `CREDITS EARNED  ${result.creditsEarned}`, 24);
      y += 48;
    } else {
      y += 30;
    }

    // CONTINUE menu item
    const continueItem = createMenuItem(this, cx, y, 'CONTINUE', () => this.onContinue());

    this.menuSelector = new MenuSelector(
      this,
      [continueItem],
      [() => this.onContinue()],
    );

    // Footer hint
    createMenuText(this, cx, height - 42, 'Z / SPACE TO CONTINUE', 18);
  }

  update(_time: number, _delta: number): void {
    this.menuSelector.update();
  }

  // ------ League result wiring ---------------------------------------------

  /**
   * If this result came from a league match, apply it to leagueData:
   *   - update standings (home/away indices from matchConfig)
   *   - add credits earned to leagueData.credits
   *   - increment currentMatch
   */
  private applyLeagueResult(): void {
    const { leagueData, matchConfig, result } = this.sceneData;
    if (!leagueData || !matchConfig) return;

    // Find the indices of home/away teams in ALL_TEAMS
    const homeIdx = ALL_TEAMS.findIndex(t => t.name === matchConfig.homeTeam.name);
    const awayIdx = ALL_TEAMS.findIndex(t => t.name === matchConfig.awayTeam.name);
    if (homeIdx === -1 || awayIdx === -1) return;

    // Update standings
    const standings = leagueData.standings;
    const home = standings[homeIdx];
    const away = standings[awayIdx];
    if (!home || !away) return;

    const hs = result.homeScore;
    const as_ = result.awayScore;

    home.played++;
    away.played++;
    home.pointsFor     += hs;
    home.pointsAgainst += as_;
    away.pointsFor     += as_;
    away.pointsAgainst += hs;

    if (hs > as_) {
      home.won++;  home.points += 3;
      away.lost++;
    } else if (as_ > hs) {
      away.won++;  away.points += 3;
      home.lost++;
    } else {
      home.drawn++;  home.points += 1;
      away.drawn++;  away.points += 1;
    }

    // Add credits — only for the player's team
    const playerIsHome = matchConfig.p1Controls === TeamSide.HOME;
    const playerScore  = playerIsHome ? hs : as_;
    const opponentScore = playerIsHome ? as_ : hs;
    void playerScore;
    void opponentScore;

    leagueData.credits += result.creditsEarned;

    // Advance the match counter
    leagueData.currentMatch++;
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
