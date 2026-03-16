// ============================================================
// Speedball 2: Brutal Deluxe — Phaser Game Entry Point
// ============================================================

import Phaser from 'phaser';
import { BootScene }         from './scenes/BootScene';
import { TitleScene }        from './scenes/TitleScene';
import { MatchScene }        from './scenes/MatchScene';
import { ResultScene }       from './scenes/ResultScene';
import { FriendlyScene }     from './scenes/FriendlyScene';
import { LeagueScene }       from './scenes/LeagueScene';
import { TeamMgmtScene }     from './scenes/TeamMgmtScene';
import { OnlineScene }       from './scenes/OnlineScene';
import { OnlineMatchScene }  from './scenes/OnlineMatchScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,

  width:  960,
  height: 672,

  backgroundColor: '#000000',

  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    width:      960,
    height:     672,
  },

  render: {
    pixelArt:    true,
    antialias:   false,
    roundPixels: true,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug:   false,
    },
  },

  scene: [
    BootScene,
    TitleScene,
    MatchScene,
    ResultScene,
    FriendlyScene,
    LeagueScene,
    TeamMgmtScene,
    OnlineScene,
    OnlineMatchScene,
  ],
};

const game = new Phaser.Game(config);

// Expose for testing/debugging
(window as any).__PHASER_GAME__ = game;
