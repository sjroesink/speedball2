// ============================================================
// Speedball 2: Brutal Deluxe — Server Simulation (Headless)
// ============================================================
// Complete game simulation without any Phaser dependencies.
// Runs on the server, ticked at ~50ms intervals by GameRoom.
// ============================================================

import {
  TeamSide,
  MatchState,
  PlayerRole,
  PlayerState,
  AITeamState,
  Difficulty,
  type TeamDef,
  type PlayerDef,
  type PlayerStats,
  type ClientInput,
  type BallState,
  type ServerPlayerState,
  type StarState,
  type MultiplierState,
  type TeamState,
  type GameStateMsg,
} from '../../src/utils/types.js';

import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  GOAL_WIDTH,
  GOAL_Y_TOP,
  GOAL_Y_BOTTOM,
  HALF_DURATION,
  STUN_DURATION,
  TACKLE_RECOVERY_TIME,
  MULTIPLIER_RESPAWN_TIME,
  POINTS_GOAL,
  POINTS_TACKLE,
  POINTS_STAR_BONUS,
  SCORE_MULTIPLIER,
  BALL_PASS_SPEED,
  BALL_FRICTION,
  BALL_WALL_RESTITUTION,
  BALL_DOME_RESTITUTION,
  BALL_DOME_ANGLE_VARIANCE,
  BALL_PICKUP_RANGE,
  PLAYER_TACKLE_LUNGE,
  PLAYER_TACKLE_HIT_RADIUS,
  KEEPER_RANGE,
  AI_PARAMS,
  type AIDifficultyParams,
  getMaxSpeed,
  getShotSpeed,
  getTackleSuccessChance,
  getInjuryChance,
} from '../../src/config/gameConfig.js';

// ================================================================
// Constants: Arena element positions (from ArenaElements.ts)
// ================================================================

const WALL_THICKNESS = 48;

// Play area boundaries (inside walls)
const PLAY_LEFT   = WALL_THICKNESS;
const PLAY_RIGHT  = ARENA_WIDTH - WALL_THICKNESS;
const PLAY_TOP    = WALL_THICKNESS;
const PLAY_BOTTOM = ARENA_HEIGHT - WALL_THICKNESS;

const ARENA_CENTER_X = ARENA_WIDTH / 2;  // 480
const ARENA_CENTER_Y = ARENA_HEIGHT / 2; // 720

// Dome positions (circular bumpers, radius 24)
const DOME_POSITIONS: { x: number; y: number; r: number }[] = [
  { x: 288, y: 144,  r: 24 },
  { x: 672, y: 144,  r: 24 },
  { x: 336, y: 240,  r: 24 },
  { x: 624, y: 240,  r: 24 },
  { x: 288, y: 672,  r: 24 },
  { x: 672, y: 672,  r: 24 },
  { x: 336, y: 1200, r: 24 },
  { x: 624, y: 1200, r: 24 },
];

// Star positions
const TOP_STAR_POSITIONS: [number, number][] = [
  [120, 144], [120, 192], [120, 288], [840, 144], [840, 192],
];
const BOTTOM_STAR_POSITIONS: [number, number][] = [
  [120, 1152], [120, 1248], [120, 1296], [840, 1248], [840, 1152],
];

// Multiplier positions
const MULTIPLIER_TOP    = { x: ARENA_CENTER_X, y: 192 };
const MULTIPLIER_BOTTOM = { x: ARENA_CENTER_X, y: ARENA_HEIGHT - 192 };

// Warp positions (left x=72, right x=888)
const WARP_PAIRS: { leftX: number; rightX: number; y: number }[] = [
  { leftX: 72, rightX: 888, y: 336 },
  { leftX: 72, rightX: 888, y: 1104 },
];

const WARP_PROXIMITY = 30;

// Ball radius for collision
const BALL_RADIUS = 12;

// Player radius for collision
const PLAYER_RADIUS = 18;

// ================================================================
// Internal sim types (not exported — we produce GameStateMsg)
// ================================================================

interface SimBall {
  x: number; y: number;
  vx: number; vy: number;
  ownerSide: TeamSide | null;
  ownerIndex: number;        // index within owning team, -1 if no owner
  lastTouchedBy: TeamSide | null;
}

interface SimPlayer {
  x: number; y: number;
  vx: number; vy: number;
  state: PlayerState;
  hasBall: boolean;
  facingAngle: number;
  role: PlayerRole;
  stats: PlayerStats;
  def: PlayerDef;
  homeX: number; homeY: number;
  injuryTimer: number;   // seconds remaining
  stateTimer: number;    // seconds remaining for TACKLING/STUNNED states
  isActive: boolean;     // false = injured / out of play
}

interface SimStar {
  x: number; y: number;
  side: 'top' | 'bottom';
  activated: boolean;
  activatedBy: TeamSide | null;
}

interface SimMultiplier {
  x: number; y: number;
  side: 'top' | 'bottom';
  activeForTeam: TeamSide | null;
  respawnTimer: number;  // seconds until re-available
  available: boolean;
}

interface SimTeam {
  score: number;
  goals: number;
  tackles: number;
  hasMultiplier: boolean;
  controlledPlayerIndex: number;
  players: SimPlayer[];
}

// ================================================================
// Default formation positions
// ================================================================

/**
 * Returns home positions for a 6-player formation (indices 0-5).
 * HOME team defends bottom goal, attacks top.
 * Index 0 = GK, 1-2 = DEF, 3-4 = MID, 5 = FWD.
 */
function homeFormation(side: TeamSide): { x: number; y: number }[] {
  const cx = ARENA_CENTER_X;
  if (side === TeamSide.HOME) {
    // HOME defends bottom (GOAL_Y_BOTTOM), attacks top
    return [
      { x: cx,       y: GOAL_Y_BOTTOM },          // GK
      { x: cx - 120, y: ARENA_HEIGHT * 0.75 },     // DEF L
      { x: cx + 120, y: ARENA_HEIGHT * 0.75 },     // DEF R
      { x: cx - 96,  y: ARENA_CENTER_Y },          // MID L
      { x: cx + 96,  y: ARENA_CENTER_Y },          // MID R
      { x: cx,       y: ARENA_HEIGHT * 0.30 },     // FWD
    ];
  } else {
    // AWAY defends top (GOAL_Y_TOP), attacks bottom
    return [
      { x: cx,       y: GOAL_Y_TOP },              // GK
      { x: cx - 120, y: ARENA_HEIGHT * 0.25 },     // DEF L
      { x: cx + 120, y: ARENA_HEIGHT * 0.25 },     // DEF R
      { x: cx - 96,  y: ARENA_CENTER_Y },          // MID L
      { x: cx + 96,  y: ARENA_CENTER_Y },          // MID R
      { x: cx,       y: ARENA_HEIGHT * 0.70 },     // FWD
    ];
  }
}

// ================================================================
// ServerSimulation
// ================================================================

export class ServerSimulation {
  gameState!: GameStateMsg;

  // Internal state
  private ball!: SimBall;
  private home!: SimTeam;
  private away!: SimTeam;
  private stars: SimStar[] = [];
  private multipliers: SimMultiplier[] = [];

  private matchState: MatchState = MatchState.KICKOFF;
  private timer: number = HALF_DURATION;
  private half: number = 1;
  private tick: number = 0;
  private stateTimer: number = 0;
  private kickoffSide: TeamSide = TeamSide.HOME;

  // AI
  private aiParams: AIDifficultyParams;
  private homeAITimer: number = 0;
  private awayAITimer: number = 0;

  private homeTeamDef: TeamDef;
  private awayTeamDef: TeamDef;

  constructor(homeTeam: TeamDef, awayTeam: TeamDef) {
    this.homeTeamDef = homeTeam;
    this.awayTeamDef = awayTeam;
    this.aiParams = AI_PARAMS[Difficulty.MEDIUM];

    this.initTeams();
    this.initArenaElements();
    this.initBall();
    this.resetPositions();
    this.buildGameState();
  }

  // ------ Initialization ---------------------------------------------------

  private initTeams(): void {
    this.home = this.buildTeam(this.homeTeamDef, TeamSide.HOME);
    this.away = this.buildTeam(this.awayTeamDef, TeamSide.AWAY);
  }

  private buildTeam(teamDef: TeamDef, side: TeamSide): SimTeam {
    // Use only the first 6 players (active roster, not bench)
    const formation = homeFormation(side);
    const players: SimPlayer[] = [];

    for (let i = 0; i < 6 && i < teamDef.players.length; i++) {
      const def = teamDef.players[i];
      const pos = formation[i];
      players.push({
        x: pos.x, y: pos.y,
        vx: 0, vy: 0,
        state: PlayerState.IDLE,
        hasBall: false,
        facingAngle: side === TeamSide.HOME ? -Math.PI / 2 : Math.PI / 2,
        role: def.role,
        stats: { ...def.stats },
        def,
        homeX: pos.x, homeY: pos.y,
        injuryTimer: 0,
        stateTimer: 0,
        isActive: true,
      });
    }

    // Find first non-keeper for controlled player
    const ctrlIdx = players.findIndex(p => p.role !== PlayerRole.GOALKEEPER);

    return {
      score: 0,
      goals: 0,
      tackles: 0,
      hasMultiplier: false,
      controlledPlayerIndex: ctrlIdx >= 0 ? ctrlIdx : 0,
      players,
    };
  }

  private initArenaElements(): void {
    // Stars
    this.stars = [
      ...TOP_STAR_POSITIONS.map(([x, y]) => ({
        x, y, side: 'top' as const, activated: false, activatedBy: null,
      })),
      ...BOTTOM_STAR_POSITIONS.map(([x, y]) => ({
        x, y, side: 'bottom' as const, activated: false, activatedBy: null,
      })),
    ];

    // Multipliers
    this.multipliers = [
      { x: MULTIPLIER_TOP.x, y: MULTIPLIER_TOP.y, side: 'top', activeForTeam: null, respawnTimer: 0, available: true },
      { x: MULTIPLIER_BOTTOM.x, y: MULTIPLIER_BOTTOM.y, side: 'bottom', activeForTeam: null, respawnTimer: 0, available: true },
    ];
  }

  private initBall(): void {
    this.ball = {
      x: ARENA_CENTER_X,
      y: ARENA_CENTER_Y,
      vx: 0, vy: 0,
      ownerSide: null,
      ownerIndex: -1,
      lastTouchedBy: null,
    };
  }

  // ------ Public API -------------------------------------------------------

  /**
   * Main simulation tick. Call this every ~50ms.
   * @param dtMs  Delta time in milliseconds
   */
  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.tick++;

    // Update match state timers
    this.updateMatchState(dt);

    // Only simulate physics/gameplay during PLAYING state
    if (this.matchState === MatchState.PLAYING) {
      this.updatePlayerTimers(dt);
      this.updateBallPhysics(dt);
      this.updatePlayerPhysics(dt);
      this.checkBallPickup();
      this.checkGoals();
      this.checkStars();
      this.checkMultipliers();
      this.checkWarps();
      this.updateMultiplierTimers(dt);
    }

    this.buildGameState();
  }

  /**
   * Process input from a human-controlled player.
   */
  applyInput(side: TeamSide, input: ClientInput): void {
    if (this.matchState === MatchState.KICKOFF) {
      // Any input starts play
      this.matchState = MatchState.PLAYING;
    }
    if (this.matchState !== MatchState.PLAYING) return;

    const team = side === TeamSide.HOME ? this.home : this.away;
    const opponentTeam = side === TeamSide.HOME ? this.away : this.home;
    const player = team.players[team.controlledPlayerIndex];
    if (!player || !player.isActive) return;

    // Cannot act while stunned/tackling/injured
    if (!this.canAct(player)) return;

    // Movement
    if (input.dx !== 0 || input.dy !== 0) {
      const speed = getMaxSpeed(player.stats.speed);
      const len = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
      const nx = input.dx / len;
      const ny = input.dy / len;
      player.vx = nx * speed;
      player.vy = ny * speed;
      player.facingAngle = Math.atan2(ny, nx);
      player.state = PlayerState.RUNNING;
    } else {
      player.vx = 0;
      player.vy = 0;
      player.state = PlayerState.IDLE;
    }

    // Fire (shoot or tackle)
    if (input.fire) {
      if (player.hasBall) {
        this.shootBall(player, side);
      } else {
        this.handleTackle(player, side, opponentTeam);
      }
    }

    // Pass
    if (input.pass) {
      if (player.hasBall) {
        this.passBall(player, team, side);
      } else {
        // Switch controlled player to nearest to ball
        this.switchControlledPlayer(team);
      }
    }
  }

  /**
   * Run AI for the non-controlled players on a team.
   */
  runAI(side: TeamSide, dtMs: number): void {
    if (this.matchState !== MatchState.PLAYING) return;
    const dt = dtMs / 1000;

    const team = side === TeamSide.HOME ? this.home : this.away;
    const opponents = side === TeamSide.HOME ? this.away : this.home;

    // Throttle AI by reaction timer
    const timerRef = side === TeamSide.HOME ? 'homeAITimer' : 'awayAITimer';
    this[timerRef] -= dt;
    if (this[timerRef] > 0) return;
    this[timerRef] = this.aiParams.reactionTime;

    const teamState = this.determineAITeamState(team);
    const goalY = side === TeamSide.HOME ? GOAL_Y_BOTTOM : GOAL_Y_TOP;
    const targetGoalY = side === TeamSide.HOME ? GOAL_Y_TOP : GOAL_Y_BOTTOM;

    for (let i = 0; i < team.players.length; i++) {
      const player = team.players[i];
      if (!player.isActive) continue;

      // Skip the human-controlled player
      if (i === team.controlledPlayerIndex) continue;

      if (player.role === PlayerRole.GOALKEEPER) {
        this.aiUpdateKeeper(player, goalY);
      } else {
        this.aiUpdateOutfield(player, i, team, opponents, teamState, side, targetGoalY);
      }
    }
  }

  /**
   * Reset all player and ball positions (after goal or at kickoff).
   */
  resetPositions(): void {
    const homeFormationPos = homeFormation(TeamSide.HOME);
    const awayFormationPos = homeFormation(TeamSide.AWAY);

    for (let i = 0; i < this.home.players.length; i++) {
      const p = this.home.players[i];
      const pos = homeFormationPos[i];
      p.x = pos.x; p.y = pos.y;
      p.vx = 0; p.vy = 0;
      p.homeX = pos.x; p.homeY = pos.y;
      p.state = PlayerState.IDLE;
      p.hasBall = false;
      p.stateTimer = 0;
    }

    for (let i = 0; i < this.away.players.length; i++) {
      const p = this.away.players[i];
      const pos = awayFormationPos[i];
      p.x = pos.x; p.y = pos.y;
      p.vx = 0; p.vy = 0;
      p.homeX = pos.x; p.homeY = pos.y;
      p.state = PlayerState.IDLE;
      p.hasBall = false;
      p.stateTimer = 0;
    }

    // Place ball at center, give to kickoff team's forward (index 5)
    this.ball.x = ARENA_CENTER_X;
    this.ball.y = ARENA_CENTER_Y;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.ownerSide = this.kickoffSide;
    this.ball.ownerIndex = 5; // forward
    this.ball.lastTouchedBy = this.kickoffSide;

    const kickTeam = this.kickoffSide === TeamSide.HOME ? this.home : this.away;
    if (kickTeam.players.length > 5) {
      kickTeam.players[5].hasBall = true;
      // Move the forward to center for kickoff
      kickTeam.players[5].x = ARENA_CENTER_X;
      kickTeam.players[5].y = ARENA_CENTER_Y;
    }
  }

  // ------ Match State Machine -----------------------------------------------

  private updateMatchState(dt: number): void {
    switch (this.matchState) {
      case MatchState.GOAL_SCORED:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.matchState = MatchState.KICKOFF;
          this.resetPositions();
        }
        break;

      case MatchState.HALFTIME:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.half = 2;
          this.timer = HALF_DURATION;
          this.kickoffSide = TeamSide.AWAY;
          this.matchState = MatchState.KICKOFF;
          this.resetPositions();
        }
        break;

      case MatchState.PLAYING:
        this.timer -= dt;
        if (this.timer <= 0) {
          this.timer = 0;
          if (this.half === 1) {
            this.matchState = MatchState.HALFTIME;
            this.stateTimer = 3;
          } else {
            this.matchState = MatchState.MATCH_END;
          }
        }
        break;

      case MatchState.KICKOFF:
      case MatchState.MATCH_END:
      default:
        break;
    }
  }

  // ------ Player Timers (stun, tackle recovery, injury) ---------------------

  private updatePlayerTimers(dt: number): void {
    const allPlayers = [...this.home.players, ...this.away.players];
    for (const p of allPlayers) {
      if (p.stateTimer > 0) {
        p.stateTimer -= dt;
        if (p.stateTimer <= 0) {
          p.stateTimer = 0;
          if (p.state === PlayerState.STUNNED || p.state === PlayerState.TACKLING) {
            p.state = PlayerState.IDLE;
          }
        }
      }

      if (p.injuryTimer > 0) {
        p.injuryTimer -= dt;
        if (p.injuryTimer <= 0) {
          p.injuryTimer = 0;
          p.isActive = true;
          p.state = PlayerState.IDLE;
        }
      }
    }
  }

  // ------ Ball Physics -------------------------------------------------------

  private updateBallPhysics(dt: number): void {
    // If ball is owned, it follows the owner
    if (this.ball.ownerSide !== null && this.ball.ownerIndex >= 0) {
      const team = this.ball.ownerSide === TeamSide.HOME ? this.home : this.away;
      const owner = team.players[this.ball.ownerIndex];
      if (owner && owner.isActive && owner.hasBall) {
        this.ball.x = owner.x;
        this.ball.y = owner.y;
        this.ball.vx = 0;
        this.ball.vy = 0;
        return;
      } else {
        // Owner lost ball somehow — release
        this.releaseBall();
      }
    }

    // Loose ball: apply velocity, friction, wall bouncing, dome bouncing
    const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
    if (speed > 0) {
      // Apply friction
      const frictionDelta = BALL_FRICTION * dt;
      if (frictionDelta >= speed) {
        this.ball.vx = 0;
        this.ball.vy = 0;
      } else {
        const factor = (speed - frictionDelta) / speed;
        this.ball.vx *= factor;
        this.ball.vy *= factor;
      }
    }

    // Move
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // Wall bounce
    this.bounceBallOffWalls();

    // Dome bounce
    this.bounceBallOffDomes();
  }

  private bounceBallOffWalls(): void {
    if (this.ball.x - BALL_RADIUS < PLAY_LEFT) {
      this.ball.x = PLAY_LEFT + BALL_RADIUS;
      this.ball.vx = Math.abs(this.ball.vx) * BALL_WALL_RESTITUTION;
    } else if (this.ball.x + BALL_RADIUS > PLAY_RIGHT) {
      this.ball.x = PLAY_RIGHT - BALL_RADIUS;
      this.ball.vx = -Math.abs(this.ball.vx) * BALL_WALL_RESTITUTION;
    }

    if (this.ball.y - BALL_RADIUS < PLAY_TOP) {
      // Check if in goal area — don't bounce, let goal detection handle it
      const halfGoal = GOAL_WIDTH / 2;
      if (Math.abs(this.ball.x - ARENA_CENTER_X) <= halfGoal) return;
      this.ball.y = PLAY_TOP + BALL_RADIUS;
      this.ball.vy = Math.abs(this.ball.vy) * BALL_WALL_RESTITUTION;
    } else if (this.ball.y + BALL_RADIUS > PLAY_BOTTOM) {
      const halfGoal = GOAL_WIDTH / 2;
      if (Math.abs(this.ball.x - ARENA_CENTER_X) <= halfGoal) return;
      this.ball.y = PLAY_BOTTOM - BALL_RADIUS;
      this.ball.vy = -Math.abs(this.ball.vy) * BALL_WALL_RESTITUTION;
    }
  }

  private bounceBallOffDomes(): void {
    for (const dome of DOME_POSITIONS) {
      const dx = this.ball.x - dome.x;
      const dy = this.ball.y - dome.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = dome.r + BALL_RADIUS;

      if (dist < minDist && dist > 0) {
        // Push ball out of dome
        const nx = dx / dist;
        const ny = dy / dist;
        this.ball.x = dome.x + nx * minDist;
        this.ball.y = dome.y + ny * minDist;

        // Reflect velocity
        const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
        if (speed === 0) return;

        const angle = Math.atan2(this.ball.vy, this.ball.vx);
        // Reflect: angle of reflection relative to normal
        const normalAngle = Math.atan2(ny, nx);
        let reflectedAngle = 2 * normalAngle - angle + Math.PI;

        // Add random variance
        const variance = (Math.random() * 2 - 1) *
          (BALL_DOME_ANGLE_VARIANCE * Math.PI / 180);
        reflectedAngle += variance;

        const newSpeed = speed * BALL_DOME_RESTITUTION;
        this.ball.vx = Math.cos(reflectedAngle) * newSpeed;
        this.ball.vy = Math.sin(reflectedAngle) * newSpeed;
      }
    }
  }

  // ------ Player Physics -----------------------------------------------------

  private updatePlayerPhysics(dt: number): void {
    const allPlayers = [...this.home.players, ...this.away.players];
    for (const p of allPlayers) {
      if (!p.isActive) continue;

      // Move
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Clamp to play area
      p.x = Math.max(PLAY_LEFT + PLAYER_RADIUS, Math.min(PLAY_RIGHT - PLAYER_RADIUS, p.x));
      p.y = Math.max(PLAY_TOP + PLAYER_RADIUS, Math.min(PLAY_BOTTOM - PLAYER_RADIUS, p.y));

      // Stop moving if idle / stunned / injured
      if (p.state === PlayerState.IDLE || p.state === PlayerState.STUNNED ||
          p.state === PlayerState.INJURED) {
        p.vx = 0;
        p.vy = 0;
      }
    }
  }

  // ------ Ball Pickup --------------------------------------------------------

  private checkBallPickup(): void {
    if (this.ball.ownerSide !== null) return; // not loose

    const allPlayers = [
      ...this.home.players.map((p, i) => ({ p, side: TeamSide.HOME, idx: i })),
      ...this.away.players.map((p, i) => ({ p, side: TeamSide.AWAY, idx: i })),
    ];

    let nearest: { p: SimPlayer; side: TeamSide; idx: number } | null = null;
    let nearestD = Infinity;

    for (const entry of allPlayers) {
      if (!entry.p.isActive) continue;
      if (!this.canAct(entry.p)) continue;

      const dx = entry.p.x - this.ball.x;
      const dy = entry.p.y - this.ball.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < BALL_PICKUP_RANGE && d < nearestD) {
        nearestD = d;
        nearest = entry;
      }
    }

    if (nearest) {
      nearest.p.hasBall = true;
      this.ball.ownerSide = nearest.side;
      this.ball.ownerIndex = nearest.idx;
      this.ball.lastTouchedBy = nearest.side;
      this.ball.vx = 0;
      this.ball.vy = 0;
    }
  }

  // ------ Goal Detection -----------------------------------------------------

  private checkGoals(): void {
    const bx = this.ball.x;
    const by = this.ball.y;
    const halfGoalWidth = GOAL_WIDTH / 2;
    const inGoalWidth = Math.abs(bx - ARENA_CENTER_X) <= halfGoalWidth;
    if (!inGoalWidth) return;

    if (by <= GOAL_Y_TOP) {
      // Ball in top goal — Home team scores (they attack upward)
      this.scoreGoal(this.home, TeamSide.AWAY);
    } else if (by >= GOAL_Y_BOTTOM) {
      // Ball in bottom goal — Away team scores (they attack downward)
      this.scoreGoal(this.away, TeamSide.HOME);
    }
  }

  private scoreGoal(scoringTeam: SimTeam, concedingSide: TeamSide): void {
    const pts = scoringTeam.hasMultiplier
      ? POINTS_GOAL * SCORE_MULTIPLIER
      : POINTS_GOAL;

    scoringTeam.score += pts;
    scoringTeam.goals += 1;

    if (scoringTeam.hasMultiplier) {
      scoringTeam.hasMultiplier = false;
    }

    // Release ball
    this.releaseBall();

    // Transition to GOAL_SCORED
    this.matchState = MatchState.GOAL_SCORED;
    this.stateTimer = 2;

    // Kickoff goes to the team that conceded
    this.kickoffSide = concedingSide;
  }

  // ------ Stars --------------------------------------------------------------

  private checkStars(): void {
    if (this.ball.ownerSide === null) return;

    const ownerSide = this.ball.ownerSide;
    const team = ownerSide === TeamSide.HOME ? this.home : this.away;

    for (const star of this.stars) {
      if (star.activated) continue;

      const dx = this.ball.x - star.x;
      const dy = this.ball.y - star.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d <= BALL_PICKUP_RANGE) {
        star.activated = true;
        star.activatedBy = ownerSide;

        // Check for full set (5 stars same side, same team)
        const sideStars = this.stars.filter(s => s.side === star.side);
        const allByTeam = sideStars.every(
          s => s.activated && s.activatedBy === ownerSide,
        );

        if (allByTeam) {
          team.score += POINTS_STAR_BONUS;
          for (const s of sideStars) {
            s.activated = false;
            s.activatedBy = null;
          }
        }
      }
    }
  }

  // ------ Multipliers --------------------------------------------------------

  private checkMultipliers(): void {
    const touchingSide = this.ball.lastTouchedBy;
    if (touchingSide === null) return;

    const team = touchingSide === TeamSide.HOME ? this.home : this.away;

    for (const mult of this.multipliers) {
      if (!mult.available || mult.activeForTeam !== null) continue;

      const dx = this.ball.x - mult.x;
      const dy = this.ball.y - mult.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d <= BALL_PICKUP_RANGE) {
        mult.activeForTeam = touchingSide;
        mult.available = false;
        mult.respawnTimer = MULTIPLIER_RESPAWN_TIME;
        team.hasMultiplier = true;
      }
    }
  }

  private updateMultiplierTimers(dt: number): void {
    for (const mult of this.multipliers) {
      if (mult.respawnTimer <= 0) continue;

      mult.respawnTimer -= dt;
      if (mult.respawnTimer <= 0) {
        mult.respawnTimer = 0;
        mult.activeForTeam = null;
        mult.available = true;
      }
    }
  }

  // ------ Warps --------------------------------------------------------------

  private checkWarps(): void {
    for (const warp of WARP_PAIRS) {
      // Ball near left portal and moving left
      if (
        Math.abs(this.ball.x - warp.leftX) <= WARP_PROXIMITY &&
        Math.abs(this.ball.y - warp.y) <= WARP_PROXIMITY &&
        this.ball.vx < 0
      ) {
        this.ball.x = warp.rightX;
        return;
      }

      // Ball near right portal and moving right
      if (
        Math.abs(this.ball.x - warp.rightX) <= WARP_PROXIMITY &&
        Math.abs(this.ball.y - warp.y) <= WARP_PROXIMITY &&
        this.ball.vx > 0
      ) {
        this.ball.x = warp.leftX;
        return;
      }
    }
  }

  // ------ Shoot / Pass / Tackle ----------------------------------------------

  private shootBall(player: SimPlayer, side: TeamSide): void {
    // Shoot toward opponent's goal center
    const targetGoalY = side === TeamSide.HOME ? GOAL_Y_TOP : GOAL_Y_BOTTOM;
    const targetX = ARENA_CENTER_X;
    const targetY = targetGoalY;

    player.hasBall = false;
    player.state = PlayerState.SHOOTING;
    player.stateTimer = 0.2;

    this.ball.ownerSide = null;
    this.ball.ownerIndex = -1;
    this.ball.lastTouchedBy = side;

    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const speed = getShotSpeed(player.stats.strength);
    this.ball.vx = (dx / len) * speed;
    this.ball.vy = (dy / len) * speed;
  }

  private passBall(player: SimPlayer, team: SimTeam, side: TeamSide): void {
    // Find nearest active non-keeper teammate
    let target: SimPlayer | null = null;
    let bestDist = Infinity;

    for (const mate of team.players) {
      if (mate === player) continue;
      if (!mate.isActive) continue;
      if (mate.role === PlayerRole.GOALKEEPER) continue;

      const dx = mate.x - player.x;
      const dy = mate.y - player.y;
      const d = dx * dx + dy * dy;

      if (d < bestDist) {
        bestDist = d;
        target = mate;
      }
    }

    if (!target) return;

    player.hasBall = false;
    player.state = PlayerState.PASSING;
    player.stateTimer = 0.15;

    this.ball.ownerSide = null;
    this.ball.ownerIndex = -1;
    this.ball.lastTouchedBy = side;

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    this.ball.vx = (dx / len) * BALL_PASS_SPEED;
    this.ball.vy = (dy / len) * BALL_PASS_SPEED;
  }

  private handleTackle(
    attacker: SimPlayer,
    attackerSide: TeamSide,
    opponentTeam: SimTeam,
  ): void {
    if (!this.canAct(attacker)) return;

    attacker.state = PlayerState.TACKLING;
    attacker.stateTimer = TACKLE_RECOVERY_TIME;

    // Calculate lunge endpoint
    const lungeX = attacker.x + Math.cos(attacker.facingAngle) * PLAYER_TACKLE_LUNGE;
    const lungeY = attacker.y + Math.sin(attacker.facingAngle) * PLAYER_TACKLE_LUNGE;

    const attackerTeam = attackerSide === TeamSide.HOME ? this.home : this.away;

    for (let i = 0; i < opponentTeam.players.length; i++) {
      const opp = opponentTeam.players[i];
      if (!opp.isActive) continue;

      const dx = opp.x - lungeX;
      const dy = opp.y - lungeY;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d <= PLAYER_TACKLE_HIT_RADIUS) {
        this.tryTackle(attacker, opp, attackerTeam, i,
          attackerSide === TeamSide.HOME ? TeamSide.AWAY : TeamSide.HOME);
      }
    }
  }

  private tryTackle(
    attacker: SimPlayer,
    target: SimPlayer,
    attackerTeam: SimTeam,
    targetIndex: number,
    targetSide: TeamSide,
  ): boolean {
    const chance = getTackleSuccessChance(attacker.stats.strength, target.stats.defense);
    if (Math.random() > chance) return false;

    // Success
    if (target.hasBall) {
      target.hasBall = false;
      if (this.ball.ownerSide === targetSide && this.ball.ownerIndex === targetIndex) {
        this.releaseBall();
      }
    }

    // Stun
    target.state = PlayerState.STUNNED;
    target.stateTimer = STUN_DURATION;
    target.vx = 0;
    target.vy = 0;

    // Award tackle points
    attackerTeam.score += POINTS_TACKLE;
    attackerTeam.tackles += 1;

    // Injury check
    const injuryChance = getInjuryChance(attacker.stats.strength);
    if (Math.random() < injuryChance) {
      target.state = PlayerState.INJURED;
      target.isActive = false;
      target.injuryTimer = 10; // 10 seconds out
      target.vx = 0;
      target.vy = 0;
    }

    return true;
  }

  // ------ Helper Methods -----------------------------------------------------

  private canAct(player: SimPlayer): boolean {
    return player.isActive &&
      player.state !== PlayerState.STUNNED &&
      player.state !== PlayerState.TACKLING &&
      player.state !== PlayerState.INJURED;
  }

  private releaseBall(): void {
    // Clear ownership from the player
    if (this.ball.ownerSide !== null && this.ball.ownerIndex >= 0) {
      const team = this.ball.ownerSide === TeamSide.HOME ? this.home : this.away;
      const owner = team.players[this.ball.ownerIndex];
      if (owner) owner.hasBall = false;
    }
    this.ball.ownerSide = null;
    this.ball.ownerIndex = -1;
  }

  private switchControlledPlayer(team: SimTeam): void {
    let bestIdx = team.controlledPlayerIndex;
    let bestDist = Infinity;

    for (let i = 0; i < team.players.length; i++) {
      const p = team.players[i];
      if (!p.isActive || p.role === PlayerRole.GOALKEEPER) continue;

      const dx = p.x - this.ball.x;
      const dy = p.y - this.ball.y;
      const d = dx * dx + dy * dy;

      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    team.controlledPlayerIndex = bestIdx;
  }

  // ------ AI -----------------------------------------------------------------

  private determineAITeamState(team: SimTeam): AITeamState {
    if (this.ball.ownerSide === null) return AITeamState.LOOSE_BALL;
    const weHaveBall = team.players.some(p => p.hasBall);
    if (weHaveBall) return AITeamState.ATTACKING;
    return AITeamState.DEFENDING;
  }

  private aiUpdateKeeper(keeper: SimPlayer, goalY: number): void {
    if (!this.canAct(keeper)) return;

    const minX = ARENA_CENTER_X - KEEPER_RANGE;
    const maxX = ARENA_CENTER_X + KEEPER_RANGE;
    const targetX = Math.max(minX, Math.min(maxX, this.ball.x));

    const dx = targetX - keeper.x;
    const dy = goalY - keeper.y;

    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
      keeper.vx = 0;
      keeper.vy = 0;
      keeper.state = PlayerState.IDLE;
    } else {
      // Move horizontally along goal line
      const speed = getMaxSpeed(keeper.stats.speed);
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        keeper.vx = (dx / len) * speed;
        keeper.vy = (dy / len) * speed;
        keeper.facingAngle = Math.atan2(dy, dx);
        keeper.state = PlayerState.RUNNING;
      }
    }
  }

  private aiUpdateOutfield(
    player: SimPlayer,
    index: number,
    team: SimTeam,
    opponents: SimTeam,
    teamState: AITeamState,
    side: TeamSide,
    targetGoalY: number,
  ): void {
    if (!this.canAct(player)) return;

    switch (teamState) {
      case AITeamState.ATTACKING:
        this.aiAttacking(player, index, team, side, targetGoalY);
        break;
      case AITeamState.DEFENDING:
        this.aiDefending(player, opponents, side);
        break;
      case AITeamState.LOOSE_BALL:
        this.aiLooseBall(player, team);
        break;
    }
  }

  private aiAttacking(
    player: SimPlayer,
    index: number,
    team: SimTeam,
    side: TeamSide,
    targetGoalY: number,
  ): void {
    if (player.hasBall) {
      const distToGoal = Math.abs(targetGoalY - player.y);

      if (distToGoal < 360) {
        // Close enough — shoot
        this.shootBall(player, side);
      } else if (Math.random() < 0.30 * this.aiParams.passAccuracy) {
        // Pass
        this.passBall(player, team, side);
      } else {
        // Advance
        this.aiMoveToward(player, ARENA_CENTER_X, targetGoalY);
      }
    } else {
      // Support position
      const supportY = side === TeamSide.HOME
        ? ARENA_HEIGHT * 0.30
        : ARENA_HEIGHT * 0.70;
      const supportX = ARENA_CENTER_X + (index % 2 === 0 ? -120 : 120);
      this.aiMoveToward(player, supportX, supportY);
    }
  }

  private aiDefending(
    player: SimPlayer,
    opponents: SimTeam,
    side: TeamSide,
  ): void {
    // Find nearest active opponent
    let nearest: SimPlayer | null = null;
    let nearestD = Infinity;
    let nearestIdx = -1;

    for (let i = 0; i < opponents.players.length; i++) {
      const opp = opponents.players[i];
      if (!opp.isActive) continue;
      const dx = opp.x - player.x;
      const dy = opp.y - player.y;
      const d = dx * dx + dy * dy;
      if (d < nearestD) {
        nearestD = d;
        nearest = opp;
        nearestIdx = i;
      }
    }

    if (!nearest) {
      this.aiMoveToward(player, player.homeX, player.homeY);
      return;
    }

    const dist = Math.sqrt(nearestD);
    if (dist < 90 && Math.random() < this.aiParams.tackleAggressiveness) {
      // Tackle
      const dx = nearest.x - player.x;
      const dy = nearest.y - player.y;
      player.facingAngle = Math.atan2(dy, dx);
      const attackerTeam = side === TeamSide.HOME ? this.home : this.away;
      const opponentSide = side === TeamSide.HOME ? TeamSide.AWAY : TeamSide.HOME;

      player.state = PlayerState.TACKLING;
      player.stateTimer = TACKLE_RECOVERY_TIME;
      this.tryTackle(player, nearest, attackerTeam, nearestIdx, opponentSide);
    } else {
      this.aiMoveToward(player, nearest.x, nearest.y);
    }
  }

  private aiLooseBall(player: SimPlayer, team: SimTeam): void {
    // Find nearest team player to ball
    let nearestToBall: SimPlayer | null = null;
    let nearestDist = Infinity;

    for (const p of team.players) {
      if (!p.isActive || p.role === PlayerRole.GOALKEEPER) continue;
      const dx = p.x - this.ball.x;
      const dy = p.y - this.ball.y;
      const d = dx * dx + dy * dy;
      if (d < nearestDist) {
        nearestDist = d;
        nearestToBall = p;
      }
    }

    if (nearestToBall === player) {
      // Chase ball
      this.aiMoveToward(player, this.ball.x, this.ball.y);
    } else {
      // Return to home position
      this.aiMoveToward(player, player.homeX, player.homeY);
    }
  }

  private aiMoveToward(player: SimPlayer, tx: number, ty: number): void {
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 12) {
      player.vx = 0;
      player.vy = 0;
      player.state = PlayerState.IDLE;
    } else {
      const speed = getMaxSpeed(player.stats.speed);
      player.vx = (dx / dist) * speed;
      player.vy = (dy / dist) * speed;
      player.facingAngle = Math.atan2(dy, dx);
      player.state = PlayerState.RUNNING;
    }
  }

  // ------ Build GameStateMsg -------------------------------------------------

  private buildGameState(): void {
    this.gameState = {
      ball: {
        x: this.ball.x,
        y: this.ball.y,
        vx: this.ball.vx,
        vy: this.ball.vy,
        ownerSide: this.ball.ownerSide,
        ownerIndex: this.ball.ownerIndex,
      },
      home: this.buildTeamState(this.home),
      away: this.buildTeamState(this.away),
      stars: this.stars.map(s => ({
        x: s.x, y: s.y,
        side: s.side,
        activated: s.activated,
        activatedBy: s.activatedBy,
      })),
      multipliers: this.multipliers.map(m => ({
        x: m.x, y: m.y,
        side: m.side,
        activeForTeam: m.activeForTeam,
        respawnTimer: m.respawnTimer,
      })),
      timer: this.timer,
      half: this.half,
      matchState: this.matchState,
      tick: this.tick,
    };
  }

  private buildTeamState(team: SimTeam): TeamState {
    return {
      score: team.score,
      goals: team.goals,
      tackles: team.tackles,
      hasMultiplier: team.hasMultiplier,
      controlledPlayerIndex: team.controlledPlayerIndex,
      players: team.players.map(p => ({
        x: p.x, y: p.y,
        vx: p.vx, vy: p.vy,
        state: p.state,
        hasBall: p.hasBall,
        facingAngle: p.facingAngle,
        role: p.role,
        stats: { ...p.stats },
        injuryTimer: p.injuryTimer,
        stateTimer: p.stateTimer,
        homeX: p.homeX, homeY: p.homeY,
      })),
    };
  }
}
