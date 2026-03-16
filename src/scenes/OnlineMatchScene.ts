// ============================================================
// Speedball 2: Brutal Deluxe — OnlineMatchScene
// Passive online match: renders state from server, sends input.
// ============================================================

import Phaser from 'phaser';
import { TeamSide, GameStateMsg, TeamState, MatchState } from '../utils/types';
import { ALL_TEAMS } from '../config/teams';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  TILE_WIDTH,
  TILE_HEIGHT,
} from '../config/gameConfig';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { createArena } from '../entities/ArenaElements';
import { HUD } from '../ui/HUD';
import { networkManager } from '../systems/NetworkManager';
import { TeamMatchData } from '../systems/MatchEngine';

// ================================================================
// OnlineMatchScene
// ================================================================

export class OnlineMatchScene extends Phaser.Scene {
  // ------ Entities ---------------------------------------------------------
  private ball!:        Ball;
  private homePlayers:  Player[] = [];
  private awayPlayers:  Player[] = [];
  private hud!:         HUD;

  // ------ Online config ----------------------------------------------------
  /** Which side this client controls: HOME or AWAY. */
  private mySide!: TeamSide;

  // ------ Input keys -------------------------------------------------------
  private cursors!:   Phaser.Types.Input.Keyboard.CursorKeys;
  private keyZ!:      Phaser.Input.Keyboard.Key;
  private keyX!:      Phaser.Input.Keyboard.Key;

  // ------ Match state (from server) ----------------------------------------
  private homeScore: number = 0;
  private awayScore: number = 0;
  private matchTimer: number = 90;
  private matchHalf:  number = 1;
  private matchEnded: boolean = false;

  // ------ Bound handlers (for cleanup) -------------------------------------
  private handleState!:               (data: Record<string, unknown>) => void;
  private handleGoal!:                (data: Record<string, unknown>) => void;
  private handleMatchEnd!:            (data: Record<string, unknown>) => void;
  private handleOpponentDisconnected!:(data: Record<string, unknown>) => void;
  private handleDisconnect!:          () => void;

  // ------ Construction -----------------------------------------------------

  constructor() {
    super({ key: 'OnlineMatchScene' });
  }

  // ------ Lifecycle --------------------------------------------------------

  init(data: { side: TeamSide }): void {
    this.mySide     = data.side ?? TeamSide.HOME;
    this.homeScore  = 0;
    this.awayScore  = 0;
    this.matchTimer = 90;
    this.matchHalf  = 1;
    this.matchEnded = false;
  }

  create(): void {
    // 1. Physics world bounds
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // 2. Floor tiles
    this.drawFloor();

    // 3. Arena elements
    createArena(this);

    // 4. Ball
    this.ball = new Ball(this, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);

    // 5. Team players — use first two teams for visuals; server drives positions
    const homeTeamDef = ALL_TEAMS[0];
    const awayTeamDef = ALL_TEAMS[1];
    this.homePlayers  = this.createTeamPlayers(homeTeamDef, TeamSide.HOME);
    this.awayPlayers  = this.createTeamPlayers(awayTeamDef, TeamSide.AWAY);

    // 6. HUD
    this.hud = new HUD(this, homeTeamDef.shortName, awayTeamDef.shortName);

    // 7. Camera follows ball
    this.cameras.main
      .setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
      .startFollow(this.ball, true, 0.1, 0.1)
      .setDeadzone(120, 120);

    // 8. Input keys
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyZ    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // 9. Register network message handlers
    this.registerNetworkHandlers();

    // 10. Announce ready to server
    networkManager.send({ type: 'ready' });
  }

  update(_time: number, _delta: number): void {
    if (this.matchEnded) return;

    // Read input and send to server
    this.sendInput();
  }

  shutdown(): void {
    this.cleanupNetworkHandlers();
  }

  // ------ Floor ------------------------------------------------------------

  private drawFloor(): void {
    const cols = ARENA_WIDTH  / TILE_WIDTH;
    const rows = ARENA_HEIGHT / TILE_HEIGHT;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.add.image(
          col * TILE_WIDTH  + TILE_WIDTH  / 2,
          row * TILE_HEIGHT + TILE_HEIGHT / 2,
          'floor_tile',
        );
      }
    }
  }

  // ------ Team creation ----------------------------------------------------

  private createTeamPlayers(teamDef: typeof ALL_TEAMS[0], side: TeamSide): Player[] {
    const cx = ARENA_WIDTH / 2;
    const H  = ARENA_HEIGHT;
    const isHome = side === TeamSide.HOME;

    const goalY = isHome ? H - 72      : 72;
    const defY  = isHome ? H * 0.75    : H * 0.25;
    const midY  = H * 0.5;
    const fwdY  = isHome ? H * 0.25    : H * 0.75;

    const positions: [number, number][] = [
      [cx,        goalY],
      [cx - 144,  defY ],
      [cx + 144,  defY ],
      [cx - 168,  midY ],
      [cx + 168,  midY ],
      [cx,        fwdY ],
    ];

    const players: Player[] = [];
    const starters = teamDef.players.slice(0, 6);

    for (let i = 0; i < starters.length; i++) {
      const def       = starters[i];
      const [x, y]   = positions[i];
      const p         = new Player(this, x, y, def, side, teamDef.color);
      p.homeX = x;
      p.homeY = y;
      players.push(p);
    }

    return players;
  }

  // ------ Input ------------------------------------------------------------

  private sendInput(): void {
    const left  = this.cursors.left.isDown;
    const right = this.cursors.right.isDown;
    const up    = this.cursors.up.isDown;
    const down  = this.cursors.down.isDown;

    const dx = (right ? 1 : 0) - (left ? 1 : 0);
    const dy = (down  ? 1 : 0) - (up   ? 1 : 0);

    const fire = Phaser.Input.Keyboard.JustDown(this.keyZ);
    const pass = Phaser.Input.Keyboard.JustDown(this.keyX);

    networkManager.send({
      type: 'input',
      dx,
      dy,
      fire,
      pass,
    });
  }

  // ------ State application ------------------------------------------------

  private applyState(msg: GameStateMsg): void {
    // Ball
    this.ball.setPosition(msg.ball.x, msg.ball.y);
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    ballBody.reset(msg.ball.x, msg.ball.y);

    // Update timer / score from server state
    this.homeScore  = msg.home.score;
    this.awayScore  = msg.away.score;
    this.matchTimer = msg.timer;
    this.matchHalf  = msg.half;

    // Home players
    this.applyTeamState(this.homePlayers, msg.home, TeamSide.HOME);

    // Away players
    this.applyTeamState(this.awayPlayers, msg.away, TeamSide.AWAY);

    // HUD — build minimal TeamMatchData-compatible objects
    const homeData = this.makeHudData(TeamSide.HOME, msg.home, this.homePlayers);
    const awayData = this.makeHudData(TeamSide.AWAY, msg.away, this.awayPlayers);
    this.hud.update(homeData, awayData, this.matchTimer, this.matchHalf);
  }

  private applyTeamState(players: Player[], team: TeamState, side: TeamSide): void {
    const controlled = team.controlledPlayerIndex;

    for (let i = 0; i < players.length && i < team.players.length; i++) {
      const sp = team.players[i];
      const p  = players[i];

      p.setPosition(sp.x, sp.y);
      const body = p.body as Phaser.Physics.Arcade.Body;
      body.reset(sp.x, sp.y);

      // Highlight: controlled player is opaque, others slightly dim
      const isMyTeam = side === this.mySide;
      if (isMyTeam) {
        p.setAlpha(i === controlled ? 1.0 : 0.7);
      } else {
        p.setAlpha(0.7);
      }
    }
  }

  /**
   * Builds a minimal TeamMatchData-compatible object for HUD.update().
   * Only score and goals need to be accurate; the rest are zeroed/empty.
   */
  private makeHudData(side: TeamSide, team: TeamState, players: Player[]): TeamMatchData {
    return {
      side,
      score:                team.score,
      goals:                team.goals,
      tackles:              team.tackles,
      starsActivated:       { top: 0, bottom: 0 },
      hasMultiplier:        team.hasMultiplier,
      players,
      controlledPlayerIndex: team.controlledPlayerIndex,
    };
  }

  // ------ Network Handlers -------------------------------------------------

  private registerNetworkHandlers(): void {
    this.handleState = (data) => {
      const msg = data as unknown as GameStateMsg;
      this.applyState(msg);

      // If server reports MATCH_END state, handle it
      if (msg.matchState === MatchState.MATCH_END && !this.matchEnded) {
        this.onMatchEnd();
      }
    };

    this.handleGoal = (_data) => {
      this.hud.showMessage('GOAL!');
      this.time.delayedCall(2000, () => this.hud.clearMessage());
    };

    this.handleMatchEnd = (_data) => {
      this.onMatchEnd();
    };

    this.handleOpponentDisconnected = (_data) => {
      this.matchEnded = true;
      this.hud.showMessage('OPPONENT DISCONNECTED');
      this.time.delayedCall(3000, () => {
        this.cleanupNetworkHandlers();
        networkManager.disconnect();
        this.scene.start('TitleScene');
      });
    };

    this.handleDisconnect = () => {
      if (!this.matchEnded) {
        this.matchEnded = true;
        this.hud.showMessage('DISCONNECTED');
        this.time.delayedCall(3000, () => {
          this.scene.start('TitleScene');
        });
      }
    };

    networkManager.onMessage('state',                  this.handleState);
    networkManager.onMessage('goal',                   this.handleGoal);
    networkManager.onMessage('match_end',              this.handleMatchEnd);
    networkManager.onMessage('opponent_disconnected',  this.handleOpponentDisconnected);
    networkManager.onDisconnect(this.handleDisconnect);
  }

  private cleanupNetworkHandlers(): void {
    networkManager.offMessage('state',                 this.handleState);
    networkManager.offMessage('goal',                  this.handleGoal);
    networkManager.offMessage('match_end',             this.handleMatchEnd);
    networkManager.offMessage('opponent_disconnected', this.handleOpponentDisconnected);
    networkManager.offDisconnect(this.handleDisconnect);
  }

  private onMatchEnd(): void {
    if (this.matchEnded) return;
    this.matchEnded = true;

    this.hud.showMessage('FULL TIME');
    this.time.delayedCall(3000, () => {
      this.cleanupNetworkHandlers();
      networkManager.disconnect();
      this.scene.start('ResultScene', {
        result: {
          homeTeam:      ALL_TEAMS[0].name,
          awayTeam:      ALL_TEAMS[1].name,
          homeScore:     this.homeScore,
          awayScore:     this.awayScore,
          homeTackles:   0,
          awayTackles:   0,
          homeGoals:     [],
          awayGoals:     [],
          mvp:           '',
          creditsEarned: 0,
        },
      });
    });
  }
}
