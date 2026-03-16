// ============================================================
// Speedball 2: Brutal Deluxe — FriendlyScene
// Three-step flow: pick home team → pick away team → pick mode.
// ============================================================

import Phaser from 'phaser';
import { TeamDef, TeamSide } from '../utils/types';
import { ALL_TEAMS } from '../config/teams';
import { createMenuText, createMenuItem, MenuSelector } from '../ui/MenuComponents';

export class FriendlyScene extends Phaser.Scene {
  private menuSelector!: MenuSelector;

  private homeTeam!: TeamDef;
  private awayTeam!: TeamDef;

  constructor() {
    super({ key: 'FriendlyScene' });
  }

  // ------ Lifecycle --------------------------------------------------------

  create(): void {
    this.showTeamSelect('SELECT HOME TEAM', (team: TeamDef) => {
      this.homeTeam = team;
      this.showTeamSelect('SELECT AWAY TEAM', (awayTeam: TeamDef) => {
        this.awayTeam = awayTeam;
        this.showModeSelect();
      });
    });
  }

  update(_time: number, _delta: number): void {
    this.menuSelector?.update();
  }

  // ------ Step 1 & 2: Team Selection ---------------------------------------

  private showTeamSelect(title: string, onSelect: (team: TeamDef) => void): void {
    this.children.removeAll(true);

    const { width, height } = this.scale;
    const cx = width / 2;

    // Title
    createMenuText(this, cx, 60, title, 27);
    createMenuText(this, cx, 102, '─────────────────', 18);

    // One item per team
    const startY   = 150;
    const stepY    = 42;
    const items    = ALL_TEAMS.map((team, i) =>
      createMenuItem(this, cx, startY + i * stepY, team.name.toUpperCase(), () => onSelect(team)),
    );
    const callbacks = ALL_TEAMS.map((team) => () => onSelect(team));

    // Footer
    createMenuText(this, cx, height - 42, 'UP/DOWN  Z/SPACE/ENTER TO SELECT', 18);

    this.menuSelector = new MenuSelector(this, items, callbacks);
  }

  // ------ Step 3: Mode Selection -------------------------------------------

  private showModeSelect(): void {
    this.children.removeAll(true);

    const { width, height } = this.scale;
    const cx = width / 2;

    createMenuText(this, cx, 60, 'SELECT MODE', 27);
    createMenuText(this, cx, 102, '─────────────────', 18);

    type ModeEntry = { label: string; p1: TeamSide | null; p2: TeamSide | null };

    const modes: ModeEntry[] = [
      { label: 'P1 VS AI',   p1: TeamSide.HOME, p2: null             },
      { label: 'P1 VS P2',   p1: TeamSide.HOME, p2: TeamSide.AWAY    },
      { label: 'DEMO',       p1: null,           p2: null             },
      { label: 'BACK',       p1: TeamSide.HOME,  p2: null             }, // sentinel — handled below
    ];

    const startY  = 204;
    const stepY   = 48;

    const items     = modes.map((m, i) =>
      createMenuItem(this, cx, startY + i * stepY, m.label, () => onMode(i)),
    );
    const callbacks = modes.map((_m, i) => () => onMode(i));

    const onMode = (i: number): void => {
      if (modes[i].label === 'BACK') {
        this.scene.start('TitleScene');
        return;
      }
      this.startMatch(modes[i].p1, modes[i].p2);
    };

    createMenuText(this, cx, height - 42, 'UP/DOWN  Z/SPACE/ENTER TO SELECT', 18);

    this.menuSelector = new MenuSelector(this, items, callbacks);
  }

  // ------ Launch Match -----------------------------------------------------

  private startMatch(p1Controls: TeamSide | null, p2Controls: TeamSide | null): void {
    this.scene.start('MatchScene', {
      homeTeam:    this.homeTeam,
      awayTeam:    this.awayTeam,
      p1Controls,
      p2Controls,
    });
  }
}
