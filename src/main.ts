// ============================================================
// Speedball 2: Brutal Deluxe — Phaser Game Entry Point
// ============================================================

import Phaser from 'phaser';
import { BootScene }     from './scenes/BootScene';
import { TitleScene }    from './scenes/TitleScene';
import { MatchScene }    from './scenes/MatchScene';
import { ResultScene }   from './scenes/ResultScene';
import { FriendlyScene } from './scenes/FriendlyScene';
import { LeagueScene }   from './scenes/LeagueScene';
import { TeamMgmtScene } from './scenes/TeamMgmtScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,

  width:  320,
  height: 224,

  backgroundColor: '#000000',

  scale: {
    mode:           Phaser.Scale.FIT,
    autoCenter:     Phaser.Scale.CENTER_BOTH,
    width:          320,
    height:         224,
  },

  render: {
    pixelArt:       true,
    antialias:      false,
    roundPixels:    true,
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
  ],
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const game = new Phaser.Game(config);
