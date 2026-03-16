// ============================================================
// Speedball 2: Brutal Deluxe — TeamMgmtScene
// Team roster view and player upgrade screen.
// ============================================================

import Phaser from 'phaser';
import { PlayerDef } from '../utils/types';
import { ALL_TEAMS } from '../config/teams';
import { createMenuText, createMenuItem, MenuSelector } from '../ui/MenuComponents';
import { LeagueData } from './LeagueScene';
import {
  TRAINING_COST_SPEED,
  TRAINING_COST_STR,
  TRAINING_COST_DEF,
  BUY_PLAYER_COST,
  STAT_CAP,
} from '../config/gameConfig';

// ================================================================
// TeamMgmtScene
// ================================================================

export class TeamMgmtScene extends Phaser.Scene {
  private leagueData!:      LeagueData;
  private selectedPlayer:   number = 0;
  private menuSelector?:    MenuSelector;

  constructor() {
    super({ key: 'TeamMgmtScene' });
  }

  // ------ Lifecycle --------------------------------------------------------

  init(data: { leagueData: LeagueData }): void {
    this.leagueData     = data.leagueData;
    this.selectedPlayer = 0;
  }

  create(): void {
    this.showRoster();
  }

  update(_time: number, _delta: number): void {
    this.menuSelector?.update();
  }

  // ------ Roster screen ----------------------------------------------------

  showRoster(): void {
    this.children.removeAll(true);
    this.menuSelector = undefined;

    const { width, height } = this.scale;
    const cx  = width / 2;
    const ld  = this.leagueData;
    const team = ALL_TEAMS[ld.playerTeamIndex];

    let y = 48;

    createMenuText(this, cx, y, team.name.toUpperCase(), 30);
    y += 48;
    createMenuText(this, cx, y, `CREDITS: ${ld.credits}`, 21);
    y += 42;

    // Column header
    createMenuText(this, cx, y, '#  NAME           S   T   D', 18);
    y += 30;

    // Player rows — each is clickable to open upgrade menu
    const playerItems:  Phaser.GameObjects.Text[] = [];
    const playerCbs:    Array<() => void>          = [];

    team.players.forEach((p, idx) => {
      const row = this.formatPlayerRow(p, idx);
      const item = createMenuItem(this, cx, y, row, () => {
        this.selectedPlayer = idx;
        this.showUpgradeMenu();
      });
      // Override origin to left-align
      item.setOrigin(0, 0.5);
      item.setX(42);
      playerItems.push(item);
      playerCbs.push(() => {
        this.selectedPlayer = idx;
        this.showUpgradeMenu();
      });
      y += 30;
    });

    y += 18;
    const backItem = createMenuItem(this, cx, y, 'BACK', () => {
      this.scene.start('LeagueScene', { leagueData: ld });
    });
    playerItems.push(backItem);
    playerCbs.push(() => this.scene.start('LeagueScene', { leagueData: ld }));

    this.menuSelector = new MenuSelector(this, playerItems, playerCbs);

    createMenuText(this, cx, height - 30, 'UP/DOWN  Z/SPACE/ENTER TO SELECT', 15);
  }

  // ------ Upgrade menu screen ----------------------------------------------

  showUpgradeMenu(): void {
    this.children.removeAll(true);
    this.menuSelector = undefined;

    const { width, height } = this.scale;
    const cx   = width / 2;
    const ld   = this.leagueData;
    const team = ALL_TEAMS[ld.playerTeamIndex];
    const p    = team.players[this.selectedPlayer];

    let y = 48;

    createMenuText(this, cx, y, 'UPGRADE PLAYER', 30);
    y += 48;

    createMenuText(this, cx, y, `CREDITS: ${ld.credits}`, 21);
    y += 42;

    // Selected player info
    createMenuText(this, cx, y, `${p.number}. ${p.name}`, 24);
    y += 36;
    createMenuText(
      this, cx, y,
      `SPD ${p.stats.speed}  STR ${p.stats.strength}  DEF ${p.stats.defense}`,
      21,
    );
    y += 48;

    // Build upgrade options
    const menuItems: Phaser.GameObjects.Text[] = [];
    const menuCbs:   Array<() => void>          = [];

    const addOpt = (label: string, cb: () => void) => {
      const item = createMenuItem(this, cx, y, label, cb);
      menuItems.push(item);
      menuCbs.push(cb);
      y += 36;
    };

    addOpt(`SPEED +1  (${TRAINING_COST_SPEED.toLocaleString()})`, () => this.buyUpgrade('speed'));
    addOpt(`STRENGTH +1  (${TRAINING_COST_STR.toLocaleString()})`, () => this.buyUpgrade('strength'));
    addOpt(`DEFENSE +1  (${TRAINING_COST_DEF.toLocaleString()})`, () => this.buyUpgrade('defense'));

    y += 12;
    addOpt(`BUY REPLACEMENT  (${BUY_PLAYER_COST.toLocaleString()})`, () => this.buyPlayer());

    y += 12;
    addOpt('BACK', () => this.showRoster());

    this.menuSelector = new MenuSelector(this, menuItems, menuCbs);

    createMenuText(this, cx, height - 30, 'UP/DOWN  Z/SPACE/ENTER TO SELECT', 15);
  }

  // ------ Upgrades ---------------------------------------------------------

  private buyUpgrade(stat: 'speed' | 'strength' | 'defense'): void {
    const ld   = this.leagueData;
    const team = ALL_TEAMS[ld.playerTeamIndex];
    const p    = team.players[this.selectedPlayer];

    const costs: Record<'speed' | 'strength' | 'defense', number> = {
      speed:    TRAINING_COST_SPEED,
      strength: TRAINING_COST_STR,
      defense:  TRAINING_COST_DEF,
    };

    const cost = costs[stat];

    if (ld.credits < cost) {
      this.flashMessage('NOT ENOUGH CREDITS');
      return;
    }

    if (p.stats[stat] >= STAT_CAP) {
      this.flashMessage('STAT ALREADY MAXED');
      return;
    }

    ld.credits       -= cost;
    p.stats[stat]    += 1;

    this.showUpgradeMenu();
  }

  private buyPlayer(): void {
    const ld   = this.leagueData;
    const team = ALL_TEAMS[ld.playerTeamIndex];
    const p    = team.players[this.selectedPlayer];

    if (ld.credits < BUY_PLAYER_COST) {
      this.flashMessage('NOT ENOUGH CREDITS');
      return;
    }

    ld.credits -= BUY_PLAYER_COST;

    // Replace player with a recruit with +2 to +3 on each stat
    const bonus = () => 2 + Math.floor(Math.random() * 2); // 2 or 3
    const clamp = (v: number) => Math.max(1, Math.min(STAT_CAP, v));

    const recruit: PlayerDef = {
      name:   `Recruit ${String(this.selectedPlayer + 1).padStart(2, '0')}`,
      number: p.number,
      role:   p.role,
      stats: {
        speed:    clamp(p.stats.speed    + bonus()),
        strength: clamp(p.stats.strength + bonus()),
        defense:  clamp(p.stats.defense  + bonus()),
      },
    };

    team.players[this.selectedPlayer] = recruit;

    this.showUpgradeMenu();
  }

  // ------ Helpers ----------------------------------------------------------

  private formatPlayerRow(p: PlayerDef, idx: number): string {
    const num   = String(p.number).padStart(2);
    const name  = p.name.padEnd(13, ' ').substring(0, 13);
    const spd   = String(p.stats.speed).padStart(3);
    const str   = String(p.stats.strength).padStart(3);
    const def   = String(p.stats.defense).padStart(3);
    void idx;
    return `${num} ${name} ${spd} ${str} ${def}`;
  }

  private flashMessage(msg: string): void {
    const { width } = this.scale;
    const text = this.add.text(width / 2, 330, msg, {
      fontSize: '21px',
      color: '#ff4444',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.time.delayedCall(1500, () => text.destroy());
  }
}
