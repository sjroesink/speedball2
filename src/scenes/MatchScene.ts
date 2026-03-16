// ============================================================
// Speedball 2: Brutal Deluxe — MatchScene
// ============================================================

import Phaser from 'phaser';
import { TeamDef, TeamSide, MatchState, PlayerRole, PlayerState } from '../utils/types';
import { ALL_TEAMS } from '../config/teams';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  GOAL_Y_TOP,
  GOAL_Y_BOTTOM,
} from '../config/gameConfig';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { createArena, ArenaLayout } from '../entities/ArenaElements';
import { MatchEngine, TeamMatchData } from '../systems/MatchEngine';
import { PhysicsManager } from '../systems/PhysicsManager';
import { InputManager, PlayerInput } from '../systems/InputManager';
import { HUD } from '../ui/HUD';
import { AIController } from '../systems/AIController';
import { Difficulty } from '../utils/types';
import { LeagueData } from './LeagueScene';

// ================================================================
// MatchConfig
// ================================================================

export interface MatchConfig {
  homeTeam:    TeamDef;
  awayTeam:    TeamDef;
  /** Which side P1 controls, or null for CPU. */
  p1Controls:  TeamSide | null;
  /** Which side P2 controls, or null for CPU. */
  p2Controls:  TeamSide | null;
  leagueData?: LeagueData;
}

// ================================================================
// MatchScene
// ================================================================

export class MatchScene extends Phaser.Scene {
  // ------ Match entities --------------------------------------------------
  private ball!:        Ball;
  private arena!:       ArenaLayout;
  private engine!:      MatchEngine;
  private physics_!:    PhysicsManager;
  private input_!:      InputManager;
  private hud!:         HUD;

  private homePlayers:  Player[] = [];
  private awayPlayers:  Player[] = [];

  private matchConfig!: MatchConfig;

  // ------ AI Controllers ---------------------------------------------------
  private homeAI: AIController | null = null;
  private awayAI: AIController | null = null;

  // ------ Kick-off tracking -----------------------------------------------
  /** Prevents setupKickoff() being called every frame while in KICKOFF state. */
  private kickoffPending: boolean = false;

  /** True once MATCH_END result scene has been triggered. */
  private matchEnded: boolean = false;

  // ------ Construction -----------------------------------------------------

  constructor() {
    super({ key: 'MatchScene' });
  }

  // ------ Lifecycle --------------------------------------------------------

  init(data?: Partial<MatchConfig>): void {
    this.matchConfig = {
      homeTeam:   data?.homeTeam   ?? ALL_TEAMS[0],
      awayTeam:   data?.awayTeam   ?? ALL_TEAMS[1],
      p1Controls: data?.p1Controls !== undefined ? data.p1Controls : TeamSide.HOME,
      p2Controls: data?.p2Controls !== undefined ? data.p2Controls : null,
      leagueData: data?.leagueData,
    };

    // Reset per-match state
    this.kickoffPending = false;
    this.matchEnded     = false;
  }

  create(): void {
    // 1. Physics world bounds
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // 2. Floor tiles
    this.drawFloor();

    // 3. Arena elements (walls, goals, domes, stars, multipliers, warps)
    this.arena = createArena(this);

    // 4. Ball at centre
    this.ball = new Ball(this, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);

    // 5. Team players
    this.homePlayers = this.createTeamPlayers(this.matchConfig.homeTeam, TeamSide.HOME);
    this.awayPlayers = this.createTeamPlayers(this.matchConfig.awayTeam, TeamSide.AWAY);

    // 6. MatchEngine
    this.engine = new MatchEngine();
    this.engine.initTeams(this.homePlayers, this.awayPlayers);

    // 7. PhysicsManager
    this.physics_ = new PhysicsManager(this);
    this.physics_.setup(this.ball, this.arena, this.engine, this.homePlayers, this.awayPlayers);

    // 8. AI Controllers — create for any team not controlled by a human
    if (this.matchConfig.p1Controls !== TeamSide.HOME && this.matchConfig.p2Controls !== TeamSide.HOME) {
      this.homeAI = new AIController(
        TeamSide.HOME,
        this.homePlayers,
        this.awayPlayers,
        this.ball,
        this.physics_,
        this.engine,
        Difficulty.MEDIUM,
      );
    }
    if (this.matchConfig.p1Controls !== TeamSide.AWAY && this.matchConfig.p2Controls !== TeamSide.AWAY) {
      this.awayAI = new AIController(
        TeamSide.AWAY,
        this.awayPlayers,
        this.homePlayers,
        this.ball,
        this.physics_,
        this.engine,
        Difficulty.MEDIUM,
      );
    }

    // 9. InputManager
    this.input_ = new InputManager(this);

    // 10. HUD
    this.hud = new HUD(
      this,
      this.matchConfig.homeTeam.shortName,
      this.matchConfig.awayTeam.shortName,
    );

    // 11. Camera — zoomed in, tight follow on the ball (like original SB2)
    this.cameras.main
      .setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
      .startFollow(this.ball, true, 0.15, 0.15)
      .setDeadzone(40, 40)
      .setZoom(1.8);

    // 12. Kick off
    this.setupKickoff();
  }

  update(_time: number, delta: number): void {
    // 1. Match engine tick
    this.engine.update(delta);

    // 2. Multiplier respawn timers
    for (const mult of this.arena.multipliers) {
      mult.update(delta);
    }

    // 3. Match state handling
    const state = this.engine.state;

    if (state === MatchState.MATCH_END) {
      if (!this.matchEnded) {
        this.matchEnded = true;
        this.hud.showMessage('FULL TIME');
        this.time.delayedCall(2000, () => {
          const result = this.engine.getResult(
            this.matchConfig.p1Controls ?? TeamSide.HOME,
            this.matchConfig.homeTeam.name,
            this.matchConfig.awayTeam.name,
          );
          this.scene.start('ResultScene', {
            result,
            matchConfig: this.matchConfig,
            leagueData:  this.matchConfig.leagueData,
          });
        });
      }
      return;
    }

    if (state === MatchState.HALFTIME) {
      this.hud.showMessage('HALF TIME');
      return;
    }

    if (state === MatchState.GOAL_SCORED) {
      this.hud.showMessage('GOAL!');
      return;
    }

    if (state === MatchState.KICKOFF) {
      if (!this.kickoffPending) {
        this.kickoffPending = true;
        this.setupKickoff();
      }
      return;
    }

    // State is PLAYING — clear any leftover message
    this.hud.clearMessage();
    this.kickoffPending = false;

    // 4. Human input
    if (this.matchConfig.p1Controls !== null) {
      this.processHumanInput(this.input_.getP1Input(), this.matchConfig.p1Controls);
    }
    if (this.matchConfig.p2Controls !== null) {
      this.processHumanInput(this.input_.getP2Input(), this.matchConfig.p2Controls);
    }

    // 4b. AI input
    this.homeAI?.update(delta);
    this.awayAI?.update(delta);

    // 5. Highlight controlled players
    this.highlightControlledPlayers();

    // 6. Ball & player updates
    this.ball.update(_time, delta);
    for (const p of this.homePlayers) p.update(_time, delta);
    for (const p of this.awayPlayers) p.update(_time, delta);

    // 7. Physics checks
    this.physics_.update();

    // 8. HUD update
    this.hud.update(
      this.engine.homeTeam,
      this.engine.awayTeam,
      this.engine.timer,
      this.engine.half,
    );
  }

  // ------ Controlled player highlight ----------------------------------------

  private highlightControlledPlayers(): void {
    const highlight = (players: Player[], team: TeamMatchData) => {
      const controlled = this.engine.getControlledPlayer(team);
      for (const p of players) {
        p.setAlpha(p.isActive ? (p === controlled ? 1 : 0.7) : 0.3);
      }
    };
    if (this.matchConfig.p1Controls !== null) {
      highlight(
        this.matchConfig.p1Controls === TeamSide.HOME ? this.homePlayers : this.awayPlayers,
        this.engine.getTeam(this.matchConfig.p1Controls),
      );
    }
    if (this.matchConfig.p2Controls !== null) {
      highlight(
        this.matchConfig.p2Controls === TeamSide.HOME ? this.homePlayers : this.awayPlayers,
        this.engine.getTeam(this.matchConfig.p2Controls),
      );
    }
  }

  // ------ Floor ------------------------------------------------------------

  /** Tiles the arena floor with a single TileSprite. */
  private drawFloor(): void {
    this.add.tileSprite(
      ARENA_WIDTH / 2, ARENA_HEIGHT / 2,
      ARENA_WIDTH, ARENA_HEIGHT,
      'floor_tile',
    );
  }

  // ------ Team Creation ----------------------------------------------------

  /**
   * Creates Player entities for one team and assigns home positions.
   * Formation:
   *   [0] Keeper       — centreX, near own goal
   *   [1] Defender L   — centreX - 144, 75% (HOME) / 25% (AWAY) of height
   *   [2] Defender R   — centreX + 144, same row
   *   [3] Midfielder L — centreX - 168, 50%
   *   [4] Midfielder R — centreX + 168, 50%
   *   [5] Forward      — centreX, 25% (HOME) / 75% (AWAY)
   *   [6] Wing Defender L — centreX - 264, 65% (HOME) / 35% (AWAY)
   *   [7] Wing Defender R — centreX + 264, 65% (HOME) / 35% (AWAY)
   *   [8] Deep Midfielder — centreX, 40% (HOME) / 60% (AWAY)
   */
  private createTeamPlayers(teamDef: TeamDef, side: TeamSide): Player[] {
    const cx = ARENA_WIDTH / 2;   // 480
    const H  = ARENA_HEIGHT;       // 1440

    const isHome = side === TeamSide.HOME;

    // Y positions relative to arena height
    const goalY      = isHome ? H - 72       : 72;
    const defY       = isHome ? H * 0.75     : H * 0.25;
    const midY       = H * 0.5;
    const fwdY       = isHome ? H * 0.25     : H * 0.75;
    // Additional positions for bench players (wings and deep midfielder)
    const wingDefY   = isHome ? H * 0.65     : H * 0.35;
    const deepMidY   = isHome ? H * 0.40     : H * 0.60;

    const positions: [number, number][] = [
      [cx,        goalY],     // 0 Keeper
      [cx - 144,  defY ],     // 1 Defender L
      [cx + 144,  defY ],     // 2 Defender R
      [cx - 168,  midY ],     // 3 Midfielder L
      [cx + 168,  midY ],     // 4 Midfielder R
      [cx,        fwdY ],     // 5 Forward
      [cx - 264,  wingDefY],  // 6 Wing Defender L
      [cx + 264,  wingDefY],  // 7 Wing Defender R
      [cx,        deepMidY],  // 8 Deep Midfielder
    ];

    const players: Player[] = [];
    const roster = teamDef.players.slice(0, 9); // Use all 9 players

    for (let i = 0; i < roster.length; i++) {
      const def = roster[i];
      const [x, y] = positions[i];
      const p = new Player(this, x, y, def, side);
      p.homeX = x;
      p.homeY = y;
      players.push(p);
    }

    return players;
  }

  // ------ Kickoff ----------------------------------------------------------

  private setupKickoff(): void {
    // Reset all players to home positions
    for (const p of [...this.homePlayers, ...this.awayPlayers]) {
      p.setPosition(p.homeX, p.homeY);
      (p.body as Phaser.Physics.Arcade.Body).reset(p.homeX, p.homeY);
      p.idle();
      p.hasBall = false;
    }

    // Reset ball to centre
    const cx = ARENA_WIDTH / 2;
    const cy = ARENA_HEIGHT / 2;
    this.ball.setPosition(cx, cy);
    (this.ball.body as Phaser.Physics.Arcade.Body).reset(cx, cy);
    this.ball.release();

    // Show KICK OFF message, then start play after 1 s
    this.hud.showMessage('KICK OFF');
    this.time.delayedCall(1000, () => {
      this.engine.startPlay();
      this.hud.clearMessage();
      this.kickoffPending = false;
    });
  }

  // ------ Human Input Processing -------------------------------------------

  private processHumanInput(input: PlayerInput, side: TeamSide): void {
    const team      = this.engine.getTeam(side);
    const opponents = this.engine.getOpponentTeam(side);

    // Auto-switch to player nearest to ball (original SB2 behavior)
    this.engine.switchControlledPlayer(team, this.ball);

    let   player    = this.engine.getControlledPlayer(team);

    // If inactive, switch to nearest active player
    if (!player.isActive) {
      this.engine.switchControlledPlayer(team, this.ball);
      player = this.engine.getControlledPlayer(team);
    }

    // Movement — don't move while holding fire with ball (winding up throw)
    // Don't override velocity during non-interruptible states (TACKLING, STUNNED, etc.)
    const windingUp = input.fireHeld && player.hasBall;
    if (!windingUp && (input.dx !== 0 || input.dy !== 0)) {
      if (player.canAct) player.moveInDirection(input.dx, input.dy);
    } else if (!windingUp) {
      if (player.canAct) player.idle();
    }

    // Fire button: throw happens on RELEASE (hold longer = lob higher)
    // Short tap (< 0.15s) = quick ground throw
    // Hold longer = higher lob that flies over players
    if (input.fireReleased && player.hasBall) {
      // Clamp hold time: 0–0.8s maps to lobPower 0–1
      const lobPower = Math.min(1, Math.max(0, (input.fireHeldTime - 0.15) / 0.65));

      // Shoot in player's facing direction
      const shootDist = 500;
      const targetX = player.x + Math.cos(player.facingAngle) * shootDist;
      const targetY = player.y + Math.sin(player.facingAngle) * shootDist;
      this.physics_.shootBall(player, targetX, targetY, lobPower);
    }

    // Quick tap fire without ball = tackle
    if (input.fire && !player.hasBall) {
      this.physics_.handleTackle(player, opponents.players);
    }

    // Pass button
    if (input.pass) {
      if (player.hasBall) {
        // Pass to nearest teammate
        this.physics_.passBall(player, team.players);
      }
    }
  }
}
