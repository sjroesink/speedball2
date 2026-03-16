// ============================================================
// Speedball 2: Brutal Deluxe — LeagueScene
// League table, fixture list, and match launch.
// ============================================================

import Phaser from 'phaser';
import { LeagueStanding } from '../utils/types';
import { ALL_TEAMS } from '../config/teams';
import { createMenuText, createMenuItem, MenuSelector } from '../ui/MenuComponents';
import { drawLeagueTable } from '../ui/LeagueTable';
import { MatchConfig } from './MatchScene';
import { TeamSide } from '../utils/types';

// ================================================================
// Data Types
// ================================================================

export interface LeagueFixture {
  home: number;  // index into ALL_TEAMS
  away: number;  // index into ALL_TEAMS
}

export interface LeagueData {
  standings:        LeagueStanding[];
  schedule:         LeagueFixture[];
  currentMatch:     number;
  credits:          number;
  playerTeamIndex:  number;
}

// ================================================================
// Helpers
// ================================================================

/**
 * Builds initial league standings (all zeroes) for all 8 teams.
 */
function makeStandings(): LeagueStanding[] {
  return ALL_TEAMS.map(t => ({
    teamName:      t.shortName,
    played:        0,
    won:           0,
    drawn:         0,
    lost:          0,
    points:        0,
    pointsFor:     0,
    pointsAgainst: 0,
  }));
}

/**
 * Generates a double round-robin schedule (each pair plays twice,
 * with home/away swapped) and shuffles it.
 */
function makeSchedule(): LeagueFixture[] {
  const fixtures: LeagueFixture[] = [];
  const n = ALL_TEAMS.length;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        fixtures.push({ home: i, away: j });
      }
    }
  }

  // Fisher-Yates shuffle
  for (let k = fixtures.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1));
    [fixtures[k], fixtures[r]] = [fixtures[r], fixtures[k]];
  }

  return fixtures;
}

/**
 * Creates a fresh LeagueData object for a new season.
 */
export function createInitialLeagueData(): LeagueData {
  return {
    standings:       makeStandings(),
    schedule:        makeSchedule(),
    currentMatch:    0,
    credits:         0,
    playerTeamIndex: 0,
  };
}

// ================================================================
// LeagueScene
// ================================================================

export class LeagueScene extends Phaser.Scene {
  private leagueData!: LeagueData;
  private menuSelector?: MenuSelector;

  constructor() {
    super({ key: 'LeagueScene' });
  }

  // ------ Lifecycle --------------------------------------------------------

  init(data?: { leagueData?: LeagueData }): void {
    this.leagueData = data?.leagueData ?? createInitialLeagueData();
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const ld = this.leagueData;

    // Season over?
    if (ld.currentMatch >= ld.schedule.length) {
      this.showSeasonOver(cx, height);
      return;
    }

    this.showLeagueScreen(cx, height);
  }

  update(_time: number, _delta: number): void {
    this.menuSelector?.update();
  }

  // ------ Season-over screen -----------------------------------------------

  private showSeasonOver(cx: number, height: number): void {
    const ld = this.leagueData;

    // Determine winner (first in sorted standings)
    const sorted = [...ld.standings].sort((a, b) => {
      const diff = b.points - a.points;
      if (diff !== 0) return diff;
      return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
    });

    const winner = sorted[0];
    const playerTeam = ALL_TEAMS[ld.playerTeamIndex];
    const playerWon  = winner.teamName === playerTeam.shortName;

    let y = 72;
    createMenuText(this, cx, y, 'SEASON COMPLETE', 36);
    y += 72;

    if (playerWon) {
      createMenuText(this, cx, y, 'CHAMPIONS!', 30);
    } else {
      createMenuText(this, cx, y, `WINNER: ${winner.teamName}`, 24);
    }
    y += 54;

    createMenuText(this, cx, y, `YOUR CREDITS: ${ld.credits}`, 21);
    y += 42;

    // Draw table
    drawLeagueTable(this, 60, y, ld.standings);
    y += 36 + ld.standings.length * 27 + 42;

    // Menu
    const newSeasonItem = createMenuItem(this, cx, height - 120, 'NEW SEASON', () => {
      const fresh = createInitialLeagueData();
      fresh.playerTeamIndex = ld.playerTeamIndex;
      this.scene.start('LeagueScene', { leagueData: fresh });
    });
    const titleItem = createMenuItem(this, cx, height - 78, 'TITLE SCREEN', () => {
      this.scene.start('TitleScene');
    });

    this.menuSelector = new MenuSelector(
      this,
      [newSeasonItem, titleItem],
      [
        () => {
          const fresh = createInitialLeagueData();
          fresh.playerTeamIndex = ld.playerTeamIndex;
          this.scene.start('LeagueScene', { leagueData: fresh });
        },
        () => this.scene.start('TitleScene'),
      ],
    );
  }

  // ------ Main league screen -----------------------------------------------

  private showLeagueScreen(cx: number, height: number): void {
    const ld      = this.leagueData;
    const fixture = ld.schedule[ld.currentMatch];
    const homeTeam = ALL_TEAMS[fixture.home];
    const awayTeam = ALL_TEAMS[fixture.away];
    const isPlayerMatch =
      fixture.home === ld.playerTeamIndex ||
      fixture.away === ld.playerTeamIndex;

    let y = 42;

    // Title + credits
    createMenuText(this, cx, y, 'LEAGUE', 30);
    y += 48;
    createMenuText(this, cx, y, `CREDITS: ${ld.credits}`, 21);
    y += 42;

    // League table
    createMenuText(this, cx, y, 'STANDINGS', 21);
    y += 30;
    drawLeagueTable(this, 42, y, ld.standings);
    y += 36 + ld.standings.length * 27 + 12;

    // Match counter
    createMenuText(
      this, cx, y,
      `MATCH ${ld.currentMatch + 1} / ${ld.schedule.length}`,
      18,
    );
    y += 30;

    // Next fixture
    createMenuText(this, cx, y, `NEXT: ${homeTeam.shortName} vs ${awayTeam.shortName}`, 21);
    y += 42;

    // Build menu items
    const menuItems:  Phaser.GameObjects.Text[] = [];
    const menuCbs:    Array<() => void>         = [];

    if (isPlayerMatch) {
      // Determine which side the player controls
      const p1Side = fixture.home === ld.playerTeamIndex ? TeamSide.HOME : TeamSide.AWAY;

      const playItem = createMenuItem(this, cx, y, 'PLAY MATCH', () => {
        const config: MatchConfig = {
          homeTeam:   homeTeam,
          awayTeam:   awayTeam,
          p1Controls: p1Side,
          p2Controls: null,
          leagueData: ld,
        };
        this.scene.start('MatchScene', config);
      });
      menuItems.push(playItem);
      menuCbs.push(() => {
        const config: MatchConfig = {
          homeTeam:   homeTeam,
          awayTeam:   awayTeam,
          p1Controls: p1Side,
          p2Controls: null,
          leagueData: ld,
        };
        this.scene.start('MatchScene', config);
      });
      y += 42;

      const teamItem = createMenuItem(this, cx, y, 'TEAM', () => {
        this.scene.start('TeamMgmtScene', { leagueData: ld });
      });
      menuItems.push(teamItem);
      menuCbs.push(() => this.scene.start('TeamMgmtScene', { leagueData: ld }));
      y += 42;
    } else {
      const simItem = createMenuItem(this, cx, y, 'SIMULATE', () => {
        this.simulateMatch(fixture);
      });
      menuItems.push(simItem);
      menuCbs.push(() => this.simulateMatch(fixture));
      y += 42;
    }

    const quitItem = createMenuItem(this, cx, y, 'QUIT', () => {
      this.scene.start('TitleScene');
    });
    menuItems.push(quitItem);
    menuCbs.push(() => this.scene.start('TitleScene'));

    this.menuSelector = new MenuSelector(this, menuItems, menuCbs);

    createMenuText(this, cx, height - 30, 'UP/DOWN  Z/SPACE/ENTER TO SELECT', 15);
  }

  // ------ Simulation -------------------------------------------------------

  private simulateMatch(fixture: LeagueFixture): void {
    const homeTeam = ALL_TEAMS[fixture.home];
    const awayTeam = ALL_TEAMS[fixture.away];

    // Compute team strength as average of all player stat sums
    const strength = (teamIdx: number): number => {
      const t = ALL_TEAMS[teamIdx];
      const total = t.players.reduce(
        (acc, p) => acc + p.stats.speed + p.stats.strength + p.stats.defense,
        0,
      );
      return total / t.players.length;
    };

    const homeStr = strength(fixture.home);
    const awayStr = strength(fixture.away);

    // Weighted random score: stronger team scores more
    const randomGoals = (str: number): number => {
      const weight = Math.max(0.5, Math.min(2.0, str / 10));
      return Math.floor(Math.random() * 3 * weight);
    };

    const homeScore = randomGoals(homeStr);
    const awayScore = randomGoals(awayStr);

    void homeTeam;
    void awayTeam;

    this.updateStandings(fixture.home, fixture.away, homeScore, awayScore);
    this.leagueData.currentMatch++;
    this.scene.restart({ leagueData: this.leagueData });
  }

  // ------ Standings update -------------------------------------------------

  updateStandings(
    homeIdx:   number,
    awayIdx:   number,
    homeScore: number,
    awayScore: number,
  ): void {
    const standings = this.leagueData.standings;
    const home = standings[homeIdx];
    const away = standings[awayIdx];

    if (!home || !away) return;

    home.played++;
    away.played++;

    home.pointsFor     += homeScore;
    home.pointsAgainst += awayScore;
    away.pointsFor     += awayScore;
    away.pointsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.won++;  home.points += 3;
      away.lost++;
    } else if (awayScore > homeScore) {
      away.won++;  away.points += 3;
      home.lost++;
    } else {
      home.drawn++;  home.points += 1;
      away.drawn++;  away.points += 1;
    }
  }
}
