# Online Multiplayer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add online multiplayer via WebSocket with authoritative server, room codes, and headless game simulation

**Architecture:** Node.js WebSocket server on Unraid runs a headless ServerSimulation (physics, AI, scoring). Clients send input, receive state. Room-code-based matchmaking. Existing local play untouched.

**Tech Stack:** Node.js, `ws`, TypeScript, Docker, Pulumi/Traefik, existing Phaser 3 client

**Spec:** `docs/superpowers/specs/2026-03-16-online-multiplayer-design.md`

---

## Chunk 1: Shared Types & Server Scaffold

### Task 1: Add state interfaces to types.ts

**Files:**
- Modify: `src/utils/types.ts`

- [ ] **Step 1: Add state interfaces**

Append these exported interfaces to the bottom of `src/utils/types.ts`:

```typescript
// ── Online multiplayer state interfaces ─────────────────────────

export interface BallState {
  x: number; y: number;
  vx: number; vy: number;
  ownerSide: TeamSide | null;
  ownerIndex: number;       // index in team's player array, -1 if none
}

export interface ServerPlayerState {
  x: number; y: number;
  vx: number; vy: number;
  state: PlayerState;
  hasBall: boolean;
  facingAngle: number;
  role: PlayerRole;
  stats: PlayerStats;
  injuryTimer: number;
  stateTimer: number;
  homeX: number; homeY: number;
}

export interface StarState {
  x: number; y: number;
  side: 'top' | 'bottom';
  activated: boolean;
  activatedBy: TeamSide | null;
}

export interface MultiplierState {
  x: number; y: number;
  side: 'top' | 'bottom';
  activeForTeam: TeamSide | null;
  respawnTimer: number;
}

export interface TeamState {
  score: number;
  goals: number;
  tackles: number;
  hasMultiplier: boolean;
  controlledPlayerIndex: number;
  players: ServerPlayerState[];
}

export interface GameState {
  ball: BallState;
  home: TeamState;
  away: TeamState;
  stars: StarState[];
  multipliers: MultiplierState[];
  timer: number;
  half: number;
  matchState: MatchState;
  tick: number;
}

// Wire protocol message types
export interface ClientInput {
  dx: number; dy: number;
  fire: boolean; pass: boolean;
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/types.ts
git commit -m "feat(online): add shared state interfaces for multiplayer"
```

### Task 2: Scaffold server project

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts` (minimal placeholder)

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "speedball2-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "ws": "^8.0.0"
  },
  "devDependencies": {
    "@types/ws": "^8.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "nodenext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "sourceMap": true,
    "paths": {
      "@shared/*": ["../src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*", "../src/utils/types.ts", "../src/config/gameConfig.ts"]
}
```

- [ ] **Step 3: Create server/src/index.ts (placeholder)**

```typescript
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 3000;

const wss = new WebSocketServer({ port: PORT });

console.log(`Speedball 2 server listening on port ${PORT}`);

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});
```

- [ ] **Step 4: Install dependencies**

Run: `cd server && npm install`

- [ ] **Step 5: Verify server compiles and starts**

Run: `cd server && npx tsc && node dist/index.js`
Expected: prints "Speedball 2 server listening on port 3000", then Ctrl+C to stop.

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat(online): scaffold server project with WebSocket"
```

### Task 3: RoomManager

**Files:**
- Create: `server/src/RoomManager.ts`

- [ ] **Step 1: Create RoomManager**

```typescript
import type { WebSocket } from 'ws';
import { GameRoom } from './GameRoom.js';

const MAX_ROOMS = 50;
const ROOM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class RoomManager {
  private rooms = new Map<string, GameRoom>();

  createRoom(ws: WebSocket): string | null {
    if (this.rooms.size >= MAX_ROOMS) return null;

    let code: string;
    do {
      code = this.generateCode();
    } while (this.rooms.has(code));

    const room = new GameRoom(code, ws);
    this.rooms.set(code, room);

    // Auto-cleanup after timeout
    room.timeoutHandle = setTimeout(() => {
      if (!room.isMatchActive) {
        this.removeRoom(code);
      }
    }, ROOM_TIMEOUT_MS);

    return code;
  }

  joinRoom(code: string, ws: WebSocket): GameRoom | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.isFull) return null;
    room.addAway(ws);
    return room;
  }

  getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  removeRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      room.destroy();
      this.rooms.delete(code);
    }
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O to avoid confusion
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
```

- [ ] **Step 2: Create GameRoom stub** (so RoomManager compiles)

Create `server/src/GameRoom.ts`:

```typescript
import type { WebSocket } from 'ws';

export class GameRoom {
  public code: string;
  public timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  public isMatchActive = false;
  public isFull = false;

  private homeWs: WebSocket;
  private awayWs: WebSocket | null = null;

  constructor(code: string, homeWs: WebSocket) {
    this.code = code;
    this.homeWs = homeWs;
  }

  addAway(ws: WebSocket): void {
    this.awayWs = ws;
    this.isFull = true;
  }

  destroy(): void {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    this.isMatchActive = false;
  }
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd server && npx tsc`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add server/src/RoomManager.ts server/src/GameRoom.ts
git commit -m "feat(online): add RoomManager with room codes and cleanup"
```

---

## Chunk 2: Server Simulation (Headless Game Engine)

### Task 4: ServerSimulation — Arena & Ball Physics

**Files:**
- Create: `server/src/ServerSimulation.ts`

This is the largest and most critical file. It's the headless equivalent of PhysicsManager + Ball + Player + ArenaElements + MatchEngine combined.

- [ ] **Step 1: Create ServerSimulation with arena setup and ball physics**

```typescript
import {
  TeamSide, MatchState, PlayerState as PState, PlayerRole, Difficulty,
  type BallState, type ServerPlayerState, type StarState, type MultiplierState,
  type TeamState, type GameState, type ClientInput, type TeamDef, type PlayerStats,
} from '../../src/utils/types.js';
import {
  ARENA_WIDTH, ARENA_HEIGHT, GOAL_WIDTH, GOAL_Y_TOP, GOAL_Y_BOTTOM,
  BALL_PASS_SPEED, BALL_FRICTION, BALL_WALL_RESTITUTION, BALL_DOME_RESTITUTION,
  BALL_DOME_ANGLE_VARIANCE, BALL_PICKUP_RANGE, PLAYER_TACKLE_LUNGE,
  PLAYER_TACKLE_HIT_RADIUS, KEEPER_RANGE, HALF_DURATION, INJURY_TIME_MAX,
  STUN_DURATION, TACKLE_RECOVERY_TIME, MULTIPLIER_RESPAWN_TIME,
  POINTS_GOAL, POINTS_TACKLE, POINTS_STAR_BONUS, SCORE_MULTIPLIER,
  getMaxSpeed, getShotSpeed, getTackleSuccessChance, getInjuryChance,
} from '../../src/config/gameConfig.js';

// ── Arena element positions (matching client ArenaElements.ts) ──

const DOME_POSITIONS = [
  { x: 288, y: 144 }, { x: 672, y: 144 },
  { x: 336, y: 240 }, { x: 624, y: 240 },
  { x: 288, y: 672 }, { x: 672, y: 672 },
  { x: 336, y: 1200 }, { x: 624, y: 1200 },
];

const STAR_POSITIONS_TOP = [
  { x: 120, y: 144 }, { x: 120, y: 192 }, { x: 120, y: 288 },
  { x: 840, y: 144 }, { x: 840, y: 192 },
];
const STAR_POSITIONS_BOTTOM = [
  { x: 120, y: 1152 }, { x: 120, y: 1248 }, { x: 120, y: 1296 },
  { x: 840, y: 1248 }, { x: 840, y: 1152 },
];

const MULTIPLIER_POSITIONS = [
  { x: ARENA_WIDTH / 2, y: 192, side: 'top' as const },
  { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - 192, side: 'bottom' as const },
];

const WARP_PAIRS = [
  { leftX: 72, rightX: 888, y: 336 },
  { leftX: 72, rightX: 888, y: 1104 },
];

const WALL_MIN_X = 48;
const WALL_MAX_X = ARENA_WIDTH - 48;
const WALL_MIN_Y = 48;
const WALL_MAX_Y = ARENA_HEIGHT - 48;
const DOME_RADIUS = 24;

// ── Formation positions ──

function getFormationPositions(side: TeamSide): [number, number][] {
  const cx = ARENA_WIDTH / 2;
  const H = ARENA_HEIGHT;
  const isHome = side === TeamSide.HOME;
  const goalY = isHome ? H - 72 : 72;
  const defY = isHome ? H * 0.75 : H * 0.25;
  const midY = H * 0.5;
  const fwdY = isHome ? H * 0.25 : H * 0.75;
  return [
    [cx, goalY],
    [cx - 144, defY], [cx + 144, defY],
    [cx - 168, midY], [cx + 168, midY],
    [cx, fwdY],
  ];
}

function createPlayer(def: { role: PlayerRole; stats: PlayerStats; name: string; number: number }, x: number, y: number): ServerPlayerState {
  return {
    x, y, vx: 0, vy: 0,
    state: PState.IDLE,
    hasBall: false,
    facingAngle: 0,
    role: def.role,
    stats: { ...def.stats },
    injuryTimer: 0,
    stateTimer: 0,
    homeX: x, homeY: y,
  };
}

export class ServerSimulation {
  public gameState: GameState;
  private tickCount = 0;
  private kickoffTeam: TeamSide = TeamSide.HOME;
  private goalPauseTimer = 0;
  private halftimePauseTimer = 0;

  constructor(homeTeam: TeamDef, awayTeam: TeamDef) {
    const homePositions = getFormationPositions(TeamSide.HOME);
    const awayPositions = getFormationPositions(TeamSide.AWAY);

    const homePlayers = homeTeam.players.slice(0, 6).map((p, i) =>
      createPlayer(p, homePositions[i][0], homePositions[i][1])
    );
    const awayPlayers = awayTeam.players.slice(0, 6).map((p, i) =>
      createPlayer(p, awayPositions[i][0], awayPositions[i][1])
    );

    const stars: StarState[] = [
      ...STAR_POSITIONS_TOP.map(p => ({ ...p, side: 'top' as const, activated: false, activatedBy: null })),
      ...STAR_POSITIONS_BOTTOM.map(p => ({ ...p, side: 'bottom' as const, activated: false, activatedBy: null })),
    ];
    const multipliers: MultiplierState[] = MULTIPLIER_POSITIONS.map(p => ({
      x: p.x, y: p.y, side: p.side, activeForTeam: null, respawnTimer: 0,
    }));

    this.gameState = {
      ball: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2, vx: 0, vy: 0, ownerSide: null, ownerIndex: -1 },
      home: { score: 0, goals: 0, tackles: 0, hasMultiplier: false, controlledPlayerIndex: 5, players: homePlayers },
      away: { score: 0, goals: 0, tackles: 0, hasMultiplier: false, controlledPlayerIndex: 5, players: awayPlayers },
      stars,
      multipliers,
      timer: HALF_DURATION,
      half: 1,
      matchState: MatchState.KICKOFF,
      tick: 0,
    };
  }

  // ── Main tick ──

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    const gs = this.gameState;

    // Handle non-playing states
    if (gs.matchState === MatchState.GOAL_SCORED) {
      this.goalPauseTimer -= dt;
      if (this.goalPauseTimer <= 0) {
        gs.matchState = MatchState.KICKOFF;
        this.resetPositions();
      }
      return;
    }
    if (gs.matchState === MatchState.HALFTIME) {
      this.halftimePauseTimer -= dt;
      if (this.halftimePauseTimer <= 0) {
        this.kickoffTeam = TeamSide.AWAY;
        gs.matchState = MatchState.KICKOFF;
        this.resetPositions();
      }
      return;
    }
    if (gs.matchState === MatchState.KICKOFF) {
      gs.matchState = MatchState.PLAYING;
    }
    if (gs.matchState === MatchState.MATCH_END) return;

    // Playing state
    gs.timer -= dt;
    if (gs.timer <= 0) {
      gs.timer = 0;
      if (gs.half === 1) {
        gs.half = 2;
        gs.timer = HALF_DURATION;
        gs.matchState = MatchState.HALFTIME;
        this.halftimePauseTimer = 3;
        return;
      } else {
        gs.matchState = MatchState.MATCH_END;
        return;
      }
    }

    // Update multiplier respawn timers
    for (const m of gs.multipliers) {
      if (m.respawnTimer > 0) m.respawnTimer -= dt;
    }

    // Update player state timers
    this.updatePlayerTimers(gs.home.players, dt);
    this.updatePlayerTimers(gs.away.players, dt);

    // Ball physics
    this.updateBall(dt);

    // Collisions and game checks
    this.checkBallPickup();
    this.checkGoals();
    this.checkStars();
    this.checkMultipliers();
    this.checkWarps();

    gs.tick = ++this.tickCount;
  }

  // ── Input processing (called by GameRoom) ──

  applyInput(side: TeamSide, input: ClientInput): void {
    const gs = this.gameState;
    if (gs.matchState !== MatchState.PLAYING) return;

    const team = side === TeamSide.HOME ? gs.home : gs.away;
    const opponentTeam = side === TeamSide.HOME ? gs.away : gs.home;
    const player = team.players[team.controlledPlayerIndex];

    if (!player || player.state === PState.INJURED) {
      this.switchControlled(team, gs.ball);
      return;
    }
    if (player.state === PState.TACKLING || player.state === PState.STUNNED) return;

    // Movement
    if (input.dx !== 0 || input.dy !== 0) {
      const len = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
      const speed = getMaxSpeed(player.stats.speed);
      player.vx = (input.dx / len) * speed;
      player.vy = (input.dy / len) * speed;
      player.facingAngle = Math.atan2(input.dy, input.dx);
      player.state = PState.RUNNING;
    } else {
      player.vx = 0;
      player.vy = 0;
      player.state = PState.IDLE;
    }

    // Fire
    if (input.fire) {
      if (player.hasBall) {
        const targetY = side === TeamSide.HOME ? GOAL_Y_TOP : GOAL_Y_BOTTOM;
        this.shootBall(player, side, ARENA_WIDTH / 2, targetY);
      } else {
        this.handleTackle(player, side, opponentTeam);
      }
    }

    // Pass
    if (input.pass) {
      if (player.hasBall) {
        this.passBall(player, side, team);
      } else {
        this.switchControlled(team, gs.ball);
      }
    }
  }

  // ── AI for non-controlled players (called by GameRoom) ──

  runAI(side: TeamSide, dtMs: number): void {
    const gs = this.gameState;
    if (gs.matchState !== MatchState.PLAYING) return;

    const team = side === TeamSide.HOME ? gs.home : gs.away;
    const opponentTeam = side === TeamSide.HOME ? gs.away : gs.home;

    for (let i = 0; i < team.players.length; i++) {
      if (i === team.controlledPlayerIndex) continue; // human-controlled
      const p = team.players[i];
      if (p.state === PState.INJURED || p.state === PState.STUNNED || p.state === PState.TACKLING) continue;

      if (p.role === PlayerRole.GOALKEEPER) {
        this.aiKeeper(p, side);
      } else {
        this.aiOutfield(p, i, team, opponentTeam, side);
      }
    }
  }

  // ── Ball ──

  private updateBall(dt: number): void {
    const b = this.gameState.ball;

    if (b.ownerSide !== null) {
      // Ball follows owner
      const team = b.ownerSide === TeamSide.HOME ? this.gameState.home : this.gameState.away;
      const owner = team.players[b.ownerIndex];
      if (owner) {
        b.x = owner.x;
        b.y = owner.y;
        b.vx = 0; b.vy = 0;
      }
      return;
    }

    // Move
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Friction
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (speed > 0) {
      const reduction = BALL_FRICTION * dt;
      const newSpeed = Math.max(0, speed - reduction);
      const ratio = speed > 0 ? newSpeed / speed : 0;
      b.vx *= ratio;
      b.vy *= ratio;
    }

    // Wall bounce
    if (b.x < WALL_MIN_X) { b.x = WALL_MIN_X; b.vx = Math.abs(b.vx) * BALL_WALL_RESTITUTION; }
    if (b.x > WALL_MAX_X) { b.x = WALL_MAX_X; b.vx = -Math.abs(b.vx) * BALL_WALL_RESTITUTION; }
    if (b.y < WALL_MIN_Y) { b.y = WALL_MIN_Y; b.vy = Math.abs(b.vy) * BALL_WALL_RESTITUTION; }
    if (b.y > WALL_MAX_Y) { b.y = WALL_MAX_Y; b.vy = -Math.abs(b.vy) * BALL_WALL_RESTITUTION; }

    // Dome bounce
    for (const dome of DOME_POSITIONS) {
      const dx = b.x - dome.x;
      const dy = b.y - dome.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < DOME_RADIUS + 9) { // ball radius ~9
        const angle = Math.atan2(dy, dx);
        const variance = (Math.random() - 0.5) * 2 * BALL_DOME_ANGLE_VARIANCE * Math.PI / 180;
        const bounceAngle = angle + variance;
        const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy) * BALL_DOME_RESTITUTION;
        b.vx = Math.cos(bounceAngle) * spd;
        b.vy = Math.sin(bounceAngle) * spd;
        b.x = dome.x + Math.cos(angle) * (DOME_RADIUS + 10);
        b.y = dome.y + Math.sin(angle) * (DOME_RADIUS + 10);
      }
    }
  }

  // ── Player timers ──

  private updatePlayerTimers(players: ServerPlayerState[], dt: number): void {
    for (const p of players) {
      // Move player by velocity
      if (p.state !== PState.INJURED) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Clamp to walls
        p.x = Math.max(WALL_MIN_X, Math.min(WALL_MAX_X, p.x));
        p.y = Math.max(WALL_MIN_Y, Math.min(WALL_MAX_Y, p.y));
      }

      if (p.stateTimer > 0) {
        p.stateTimer -= dt;
        if (p.stateTimer <= 0) {
          p.stateTimer = 0;
          if (p.state === PState.TACKLING || p.state === PState.STUNNED) {
            p.state = PState.IDLE;
            p.vx = 0; p.vy = 0;
          }
        }
      }
      if (p.state === PState.INJURED) {
        p.injuryTimer -= dt;
        if (p.injuryTimer <= 0) {
          p.state = PState.IDLE;
          p.injuryTimer = 0;
          p.x = p.homeX; p.y = p.homeY;
        }
      }
    }
  }

  // ── Checks ──

  private checkBallPickup(): void {
    const b = this.gameState.ball;
    if (b.ownerSide !== null) return;

    const allPlayers = [
      ...this.gameState.home.players.map((p, i) => ({ p, side: TeamSide.HOME, i })),
      ...this.gameState.away.players.map((p, i) => ({ p, side: TeamSide.AWAY, i })),
    ];

    for (const { p, side, i } of allPlayers) {
      if (p.state === PState.INJURED || p.state === PState.STUNNED) continue;
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < BALL_PICKUP_RANGE) {
        b.ownerSide = side;
        b.ownerIndex = i;
        p.hasBall = true;
        return;
      }
    }
  }

  private checkGoals(): void {
    const b = this.gameState.ball;
    const cx = ARENA_WIDTH / 2;
    const halfGoal = GOAL_WIDTH / 2;
    if (b.x < cx - halfGoal || b.x > cx + halfGoal) return;

    if (b.y < GOAL_Y_TOP + 48) {
      this.scoreGoal(TeamSide.HOME);
    } else if (b.y > GOAL_Y_BOTTOM - 48) {
      this.scoreGoal(TeamSide.AWAY);
    }
  }

  private scoreGoal(scoringSide: TeamSide): void {
    const gs = this.gameState;
    const team = scoringSide === TeamSide.HOME ? gs.home : gs.away;
    let points = POINTS_GOAL;
    if (team.hasMultiplier) {
      points *= SCORE_MULTIPLIER;
      team.hasMultiplier = false;
      for (const m of gs.multipliers) {
        if (m.activeForTeam === scoringSide) {
          m.activeForTeam = null;
          m.respawnTimer = MULTIPLIER_RESPAWN_TIME;
        }
      }
    }
    team.score += points;
    team.goals++;
    this.releaseBall();
    this.kickoffTeam = scoringSide === TeamSide.HOME ? TeamSide.AWAY : TeamSide.HOME;
    gs.matchState = MatchState.GOAL_SCORED;
    this.goalPauseTimer = 2;
  }

  private checkStars(): void {
    const b = this.gameState.ball;
    if (b.ownerSide === null) return;
    const team = b.ownerSide === TeamSide.HOME ? this.gameState.home : this.gameState.away;

    for (const star of this.gameState.stars) {
      if (star.activated) continue;
      const dx = b.x - star.x;
      const dy = b.y - star.y;
      if (Math.sqrt(dx * dx + dy * dy) < 24) {
        star.activated = true;
        star.activatedBy = b.ownerSide;

        // Check if all 5 on same side by same team
        const sideStars = this.gameState.stars.filter(s => s.side === star.side);
        if (sideStars.every(s => s.activated && s.activatedBy === b.ownerSide)) {
          team.score += POINTS_STAR_BONUS;
          sideStars.forEach(s => { s.activated = false; s.activatedBy = null; });
        }
      }
    }
  }

  private checkMultipliers(): void {
    const b = this.gameState.ball;
    if (b.ownerSide === null) return;

    for (const m of this.gameState.multipliers) {
      if (m.activeForTeam !== null || m.respawnTimer > 0) continue;
      const dx = b.x - m.x;
      const dy = b.y - m.y;
      if (Math.sqrt(dx * dx + dy * dy) < 36) {
        m.activeForTeam = b.ownerSide;
        const team = b.ownerSide === TeamSide.HOME ? this.gameState.home : this.gameState.away;
        team.hasMultiplier = true;
      }
    }
  }

  private checkWarps(): void {
    const b = this.gameState.ball;
    if (b.ownerSide !== null) return;

    for (const warp of WARP_PAIRS) {
      const dxL = b.x - warp.leftX;
      const dyL = b.y - warp.y;
      if (Math.sqrt(dxL * dxL + dyL * dyL) < 30 && b.vx < 0) {
        b.x = warp.rightX;
        b.y = warp.y;
        return;
      }
      const dxR = b.x - warp.rightX;
      const dyR = b.y - warp.y;
      if (Math.sqrt(dxR * dxR + dyR * dyR) < 30 && b.vx > 0) {
        b.x = warp.leftX;
        b.y = warp.y;
        return;
      }
    }
  }

  // ── Actions ──

  private shootBall(player: ServerPlayerState, side: TeamSide, targetX: number, targetY: number): void {
    if (!player.hasBall) return;
    player.hasBall = false;
    const b = this.gameState.ball;
    b.ownerSide = null; b.ownerIndex = -1;
    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    const speed = getShotSpeed(player.stats.strength);
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
  }

  private passBall(player: ServerPlayerState, side: TeamSide, team: TeamState): void {
    if (!player.hasBall) return;
    let nearest: ServerPlayerState | null = null;
    let nearestDist = Infinity;
    for (const mate of team.players) {
      if (mate === player || mate.state === PState.INJURED || mate.role === PlayerRole.GOALKEEPER) continue;
      const dx = mate.x - player.x;
      const dy = mate.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) { nearestDist = dist; nearest = mate; }
    }
    if (!nearest) return;

    player.hasBall = false;
    const b = this.gameState.ball;
    b.ownerSide = null; b.ownerIndex = -1;
    const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    b.vx = Math.cos(angle) * BALL_PASS_SPEED;
    b.vy = Math.sin(angle) * BALL_PASS_SPEED;
  }

  private handleTackle(attacker: ServerPlayerState, attackerSide: TeamSide, opponentTeam: TeamState): void {
    if (attacker.state !== PState.IDLE && attacker.state !== PState.RUNNING) return;
    attacker.state = PState.TACKLING;
    attacker.stateTimer = TACKLE_RECOVERY_TIME;

    const lungeX = attacker.x + Math.cos(attacker.facingAngle) * PLAYER_TACKLE_LUNGE;
    const lungeY = attacker.y + Math.sin(attacker.facingAngle) * PLAYER_TACKLE_LUNGE;

    for (const opp of opponentTeam.players) {
      if (opp.state === PState.INJURED) continue;
      const dx = opp.x - lungeX;
      const dy = opp.y - lungeY;
      if (Math.sqrt(dx * dx + dy * dy) < PLAYER_TACKLE_HIT_RADIUS) {
        const chance = getTackleSuccessChance(attacker.stats.strength, opp.stats.defense);
        if (Math.random() < chance) {
          // Successful tackle
          const team = attackerSide === TeamSide.HOME ? this.gameState.home : this.gameState.away;
          team.score += POINTS_TACKLE;
          team.tackles++;

          if (opp.hasBall) {
            opp.hasBall = false;
            this.gameState.ball.ownerSide = null;
            this.gameState.ball.ownerIndex = -1;
          }
          opp.state = PState.STUNNED;
          opp.stateTimer = STUN_DURATION;
          opp.vx = 0; opp.vy = 0;

          if (Math.random() < getInjuryChance(attacker.stats.strength)) {
            opp.state = PState.INJURED;
            opp.injuryTimer = INJURY_TIME_MAX;
          }
        }
        break;
      }
    }
  }

  private switchControlled(team: TeamState, ball: BallState): void {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < team.players.length; i++) {
      const p = team.players[i];
      if (p.state === PState.INJURED || p.role === PlayerRole.GOALKEEPER) continue;
      const dx = p.x - ball.x;
      const dy = p.y - ball.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    }
    team.controlledPlayerIndex = nearestIdx;
  }

  private releaseBall(): void {
    const b = this.gameState.ball;
    if (b.ownerSide !== null) {
      const team = b.ownerSide === TeamSide.HOME ? this.gameState.home : this.gameState.away;
      team.players[b.ownerIndex].hasBall = false;
    }
    b.ownerSide = null;
    b.ownerIndex = -1;
    b.vx = 0; b.vy = 0;
  }

  resetPositions(): void {
    const gs = this.gameState;
    const homePos = getFormationPositions(TeamSide.HOME);
    const awayPos = getFormationPositions(TeamSide.AWAY);
    gs.home.players.forEach((p, i) => { p.x = homePos[i][0]; p.y = homePos[i][1]; p.vx = 0; p.vy = 0; p.hasBall = false; });
    gs.away.players.forEach((p, i) => { p.x = awayPos[i][0]; p.y = awayPos[i][1]; p.vx = 0; p.vy = 0; p.hasBall = false; });
    gs.ball.x = ARENA_WIDTH / 2; gs.ball.y = ARENA_HEIGHT / 2;
    gs.ball.vx = 0; gs.ball.vy = 0;
    gs.ball.ownerSide = null; gs.ball.ownerIndex = -1;
  }

  // ── AI helpers ──

  private aiKeeper(p: ServerPlayerState, side: TeamSide): void {
    const goalY = side === TeamSide.HOME ? ARENA_HEIGHT - 72 : 72;
    const cx = ARENA_WIDTH / 2;
    const targetX = Math.max(cx - KEEPER_RANGE, Math.min(cx + KEEPER_RANGE, this.gameState.ball.x));
    const dx = targetX - p.x;
    const speed = getMaxSpeed(p.stats.speed);
    p.vx = Math.abs(dx) > 8 ? Math.sign(dx) * speed : 0;
    p.vy = 0;
    p.y = goalY;
  }

  private aiOutfield(
    p: ServerPlayerState, idx: number,
    team: TeamState, opponentTeam: TeamState,
    side: TeamSide,
  ): void {
    const b = this.gameState.ball;
    const speed = getMaxSpeed(p.stats.speed);

    // Determine team state
    const weHaveBall = b.ownerSide === side;
    const theyHaveBall = b.ownerSide !== null && b.ownerSide !== side;

    if (weHaveBall && p.hasBall) {
      // Ball carrier AI: advance toward goal
      const goalY = side === TeamSide.HOME ? GOAL_Y_TOP : GOAL_Y_BOTTOM;
      if (Math.abs(p.y - goalY) < 360) {
        this.shootBall(p, side, ARENA_WIDTH / 2, goalY);
      } else {
        const dy = goalY < p.y ? -1 : 1;
        p.vx = (Math.random() - 0.5) * speed * 0.5;
        p.vy = dy * speed;
        p.facingAngle = Math.atan2(p.vy, p.vx);
        p.state = PState.RUNNING;
      }
    } else if (theyHaveBall) {
      // Defend: move toward nearest opponent
      let nearOpp: ServerPlayerState | null = null;
      let nearDist = Infinity;
      for (const opp of opponentTeam.players) {
        if (opp.state === PState.INJURED) continue;
        const dx = opp.x - p.x;
        const dy = opp.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearDist) { nearDist = dist; nearOpp = opp; }
      }
      if (nearOpp && nearDist < 90) {
        // Tackle
        p.facingAngle = Math.atan2(nearOpp.y - p.y, nearOpp.x - p.x);
        if (Math.random() < 0.3) {
          this.handleTackle(p, side, opponentTeam);
        }
      } else if (nearOpp) {
        this.moveToward(p, nearOpp.x, nearOpp.y, speed);
      } else {
        this.moveToward(p, p.homeX, p.homeY, speed);
      }
    } else {
      // Loose ball or team attacking without ball: position or chase
      const isNearest = this.isNearestToBall(p, team);
      if (b.ownerSide === null && isNearest) {
        this.moveToward(p, b.x, b.y, speed);
      } else {
        this.moveToward(p, p.homeX, p.homeY, speed);
      }
    }
  }

  private moveToward(p: ServerPlayerState, tx: number, ty: number, speed: number): void {
    const dx = tx - p.x;
    const dy = ty - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 12) {
      p.vx = 0; p.vy = 0;
      p.state = PState.IDLE;
    } else {
      p.vx = (dx / dist) * speed;
      p.vy = (dy / dist) * speed;
      p.facingAngle = Math.atan2(dy, dx);
      p.state = PState.RUNNING;
    }
  }

  private isNearestToBall(p: ServerPlayerState, team: TeamState): boolean {
    const b = this.gameState.ball;
    const myDist = Math.sqrt((p.x - b.x) ** 2 + (p.y - b.y) ** 2);
    for (const mate of team.players) {
      if (mate === p || mate.state === PState.INJURED || mate.role === PlayerRole.GOALKEEPER) continue;
      const dist = Math.sqrt((mate.x - b.x) ** 2 + (mate.y - b.y) ** 2);
      if (dist < myDist) return false;
    }
    return true;
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd server && npx tsc`
Expected: 0 errors (may need to adjust import paths based on actual tsconfig resolution)

- [ ] **Step 3: Commit**

```bash
git add server/src/ServerSimulation.ts
git commit -m "feat(online): add ServerSimulation with headless game physics and AI"
```

---

## Chunk 3: GameRoom & Server Wiring

### Task 5: Full GameRoom implementation

**Files:**
- Modify: `server/src/GameRoom.ts`

- [ ] **Step 1: Replace GameRoom stub with full implementation**

```typescript
import type { WebSocket } from 'ws';
import { ServerSimulation } from './ServerSimulation.js';
import { MatchState, TeamSide, type ClientInput, type GameState } from '../../src/utils/types.js';
import { brutalDeluxe, revengers } from '../../src/config/teams.js';

const TICK_RATE = 50; // ms (20 ticks/sec)
const HEARTBEAT_INTERVAL = 5000;
const HEARTBEAT_TIMEOUT = 3000;
const READY_TIMEOUT = 10000;

function send(ws: WebSocket, msg: object): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export class GameRoom {
  public code: string;
  public timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  public isMatchActive = false;
  public isFull = false;

  private homeWs: WebSocket;
  private awayWs: WebSocket | null = null;
  private sim: ServerSimulation | null = null;
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;
  private homeReady = false;
  private awayReady = false;
  private homeInput: ClientInput = { dx: 0, dy: 0, fire: false, pass: false };
  private awayInput: ClientInput = { dx: 0, dy: 0, fire: false, pass: false };
  private onDestroy: () => void = () => {};

  constructor(code: string, homeWs: WebSocket) {
    this.code = code;
    this.homeWs = homeWs;
    this.setupWs(homeWs, TeamSide.HOME);
  }

  setOnDestroy(fn: () => void): void { this.onDestroy = fn; }

  addAway(ws: WebSocket): void {
    this.awayWs = ws;
    this.isFull = true;
    this.setupWs(ws, TeamSide.AWAY);

    // Send match_start to both
    const msg = { type: 'match_start', homeTeam: 'Brutal Deluxe', awayTeam: 'Revengers' };
    send(this.homeWs, msg);
    send(ws, msg);

    // Wait for ready
    const readyTimeout = setTimeout(() => this.startMatch(), READY_TIMEOUT);
    this.timeoutHandle = readyTimeout;
  }

  private setupWs(ws: WebSocket, side: TeamSide): void {
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(side, msg);
      } catch { /* ignore malformed */ }
    });

    ws.on('close', () => {
      const other = side === TeamSide.HOME ? this.awayWs : this.homeWs;
      if (other && this.isMatchActive) {
        send(other, { type: 'opponent_disconnected' });
      }
      this.destroy();
      this.onDestroy();
    });
  }

  private handleMessage(side: TeamSide, msg: any): void {
    switch (msg.type) {
      case 'input':
        if (side === TeamSide.HOME) {
          this.homeInput = { dx: msg.dx || 0, dy: msg.dy || 0, fire: !!msg.fire, pass: !!msg.pass };
        } else {
          this.awayInput = { dx: msg.dx || 0, dy: msg.dy || 0, fire: !!msg.fire, pass: !!msg.pass };
        }
        break;
      case 'ready':
        if (side === TeamSide.HOME) this.homeReady = true;
        else this.awayReady = true;
        if (this.homeReady && this.awayReady) this.startMatch();
        break;
      case 'pong':
        // heartbeat acknowledged
        break;
    }
  }

  private startMatch(): void {
    if (this.isMatchActive) return;
    this.isMatchActive = true;
    if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }

    this.sim = new ServerSimulation(brutalDeluxe, revengers);

    // Game loop
    this.tickHandle = setInterval(() => this.tick(), TICK_RATE);

    // Heartbeat
    this.heartbeatHandle = setInterval(() => {
      send(this.homeWs, { type: 'ping' });
      if (this.awayWs) send(this.awayWs, { type: 'ping' });
    }, HEARTBEAT_INTERVAL);
  }

  private tick(): void {
    if (!this.sim) return;

    // Apply inputs
    this.sim.applyInput(TeamSide.HOME, this.homeInput);
    this.sim.applyInput(TeamSide.AWAY, this.awayInput);

    // Clear one-shot inputs
    this.homeInput.fire = false; this.homeInput.pass = false;
    this.awayInput.fire = false; this.awayInput.pass = false;

    // Run AI for non-controlled players
    this.sim.runAI(TeamSide.HOME, TICK_RATE);
    this.sim.runAI(TeamSide.AWAY, TICK_RATE);

    // Simulate
    this.sim.update(TICK_RATE);

    // Broadcast state
    const gs = this.sim.gameState;
    const stateMsg = { type: 'state', ...this.serializeState(gs) };
    send(this.homeWs, stateMsg);
    if (this.awayWs) send(this.awayWs, stateMsg);

    // Check for goal event
    if (gs.matchState === MatchState.GOAL_SCORED) {
      const goalMsg = {
        type: 'goal',
        homeScore: gs.home.score,
        awayScore: gs.away.score,
      };
      send(this.homeWs, goalMsg);
      if (this.awayWs) send(this.awayWs, goalMsg);
    }

    // Check match end
    if (gs.matchState === MatchState.MATCH_END) {
      const endMsg = { type: 'match_end', homeScore: gs.home.score, awayScore: gs.away.score };
      send(this.homeWs, endMsg);
      if (this.awayWs) send(this.awayWs, endMsg);
      setTimeout(() => { this.destroy(); this.onDestroy(); }, 5000);
    }
  }

  private serializeState(gs: GameState): object {
    return {
      tick: gs.tick,
      timer: gs.timer,
      half: gs.half,
      matchState: gs.matchState,
      ball: gs.ball,
      home: {
        score: gs.home.score,
        controlledIdx: gs.home.controlledPlayerIndex,
        players: gs.home.players.map(p => ({
          x: p.x, y: p.y, state: p.state, hasBall: p.hasBall, facingAngle: p.facingAngle,
        })),
      },
      away: {
        score: gs.away.score,
        controlledIdx: gs.away.controlledPlayerIndex,
        players: gs.away.players.map(p => ({
          x: p.x, y: p.y, state: p.state, hasBall: p.hasBall, facingAngle: p.facingAngle,
        })),
      },
      stars: gs.stars.map(s => ({ activated: s.activated, activatedBy: s.activatedBy })),
      multipliers: gs.multipliers.map(m => ({ activeForTeam: m.activeForTeam })),
    };
  }

  destroy(): void {
    if (this.tickHandle) { clearInterval(this.tickHandle); this.tickHandle = null; }
    if (this.heartbeatHandle) { clearInterval(this.heartbeatHandle); this.heartbeatHandle = null; }
    if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }
    this.isMatchActive = false;
    this.sim = null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/GameRoom.ts
git commit -m "feat(online): implement GameRoom with game loop and state broadcast"
```

### Task 6: Wire up server index.ts

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Replace index.ts with full connection handler**

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { RoomManager } from './RoomManager.js';
import { TeamSide } from '../../src/utils/types.js';

const PORT = Number(process.env.PORT) || 3000;
const roomManager = new RoomManager();

const wss = new WebSocketServer({ port: PORT });
console.log(`Speedball 2 server listening on port ${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  console.log(`Client connected (rooms: ${roomManager.roomCount})`);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'create_room': {
          const code = roomManager.createRoom(ws);
          if (code) {
            const room = roomManager.getRoom(code);
            room?.setOnDestroy(() => roomManager.removeRoom(code));
            ws.send(JSON.stringify({ type: 'room_created', code, side: 'home' }));
            console.log(`Room ${code} created`);
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Server full' }));
          }
          break;
        }
        case 'join_room': {
          const code = (msg.code || '').toUpperCase();
          const room = roomManager.joinRoom(code, ws);
          if (room) {
            ws.send(JSON.stringify({ type: 'room_joined', side: 'away' }));
            console.log(`Room ${code} joined — match starting`);
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found or full' }));
          }
          break;
        }
        // input, ready, pong are handled by GameRoom's ws.on('message')
      }
    } catch { /* ignore malformed */ }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
```

- [ ] **Step 2: Verify full server compiles and runs**

Run: `cd server && npx tsc && node dist/index.js`
Expected: "Speedball 2 server listening on port 3000"

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(online): wire server entry point with room creation and joining"
```

---

## Chunk 4: Client — NetworkManager & Scenes

### Task 7: NetworkManager

**Files:**
- Create: `src/systems/NetworkManager.ts`

- [ ] **Step 1: Create NetworkManager**

```typescript
const DEFAULT_URL = import.meta.env.VITE_WS_URL || 'wss://speedball2-ws.sander.ninja';

type MessageHandler = (data: any) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private disconnectHandlers = new Set<() => void>();

  connect(url: string = DEFAULT_URL): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('Connection failed'));
      this.ws.onclose = () => {
        this.disconnectHandlers.forEach(h => h());
      };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          // Auto pong
          if (msg.type === 'ping') {
            this.send({ type: 'pong' });
            return;
          }
          const handlers = this.handlers.get(msg.type);
          if (handlers) handlers.forEach(h => h(msg));
        } catch { /* ignore */ }
      };
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }

  offMessage(type: string, handler?: MessageHandler): void {
    if (handler) {
      this.handlers.get(type)?.delete(handler);
    } else {
      this.handlers.delete(type);
    }
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.add(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton
export const networkManager = new NetworkManager();
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/NetworkManager.ts
git commit -m "feat(online): add NetworkManager WebSocket wrapper"
```

### Task 8: OnlineScene (Lobby)

**Files:**
- Create: `src/scenes/OnlineScene.ts`

- [ ] **Step 1: Create OnlineScene**

```typescript
import Phaser from 'phaser';
import { createMenuText, MenuSelector } from '../ui/MenuComponents';
import { networkManager } from '../systems/NetworkManager';
import { TeamSide } from '../utils/types';

export class OnlineScene extends Phaser.Scene {
  private menuSelector!: MenuSelector;
  private statusText!: Phaser.GameObjects.Text;
  private mySide: TeamSide = TeamSide.HOME;
  private inputText = '';

  constructor() {
    super({ key: 'OnlineScene' });
  }

  create(): void {
    this.inputText = '';
    this.showMainMenu();
  }

  private showMainMenu(): void {
    this.children.removeAll(true);
    const cx = this.cameras.main.centerX;

    createMenuText(this, cx, 80, 'ONLINE', 48);

    const create = createMenuText(this, cx, 250, 'CREATE GAME', 30).setData('label', 'CREATE GAME');
    const join = createMenuText(this, cx, 310, 'JOIN GAME', 30).setData('label', 'JOIN GAME');
    const back = createMenuText(this, cx, 400, 'BACK', 30).setData('label', 'BACK');

    this.menuSelector = new MenuSelector(this, [create, join, back], [
      () => this.createGame(),
      () => this.showJoinInput(),
      () => this.scene.start('TitleScene'),
    ]);
  }

  private async createGame(): Promise<void> {
    this.children.removeAll(true);
    const cx = this.cameras.main.centerX;
    this.statusText = createMenuText(this, cx, 300, 'CONNECTING...', 24);

    try {
      await networkManager.connect();

      networkManager.onMessage('room_created', (msg) => {
        this.mySide = TeamSide.HOME;
        this.statusText.setText(`ROOM: ${msg.code}\n\nWAITING FOR OPPONENT...`);
      });

      networkManager.onMessage('match_start', () => {
        this.startOnlineMatch();
      });

      networkManager.onMessage('error', (msg) => {
        this.statusText.setText(`ERROR: ${msg.message}`);
        this.time.delayedCall(2000, () => this.showMainMenu());
      });

      networkManager.send({ type: 'create_room' });
    } catch {
      this.statusText.setText('CONNECTION FAILED');
      this.time.delayedCall(2000, () => this.showMainMenu());
    }
  }

  private showJoinInput(): void {
    this.children.removeAll(true);
    const cx = this.cameras.main.centerX;
    this.inputText = '';

    createMenuText(this, cx, 200, 'ENTER ROOM CODE', 30);
    const codeDisplay = createMenuText(this, cx, 300, '____', 48);
    this.statusText = createMenuText(this, cx, 400, 'TYPE 4 LETTERS, THEN PRESS ENTER', 18);

    // Keyboard input for room code
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.input.keyboard!.removeAllListeners('keydown');
        this.showMainMenu();
        return;
      }
      if (event.key === 'Backspace' && this.inputText.length > 0) {
        this.inputText = this.inputText.slice(0, -1);
      } else if (event.key === 'Enter' && this.inputText.length === 4) {
        this.input.keyboard!.removeAllListeners('keydown');
        this.joinGame(this.inputText);
        return;
      } else if (/^[a-zA-Z]$/.test(event.key) && this.inputText.length < 4) {
        this.inputText += event.key.toUpperCase();
      }
      const display = this.inputText.padEnd(4, '_');
      codeDisplay.setText(display);
    });
  }

  private async joinGame(code: string): Promise<void> {
    this.children.removeAll(true);
    const cx = this.cameras.main.centerX;
    this.statusText = createMenuText(this, cx, 300, 'JOINING...', 24);

    try {
      await networkManager.connect();

      networkManager.onMessage('room_joined', (msg) => {
        this.mySide = msg.side === 'home' ? TeamSide.HOME : TeamSide.AWAY;
        this.statusText.setText('JOINED! WAITING FOR MATCH...');
      });

      networkManager.onMessage('match_start', () => {
        this.startOnlineMatch();
      });

      networkManager.onMessage('error', (msg) => {
        this.statusText.setText(`ERROR: ${msg.message}`);
        this.time.delayedCall(2000, () => this.showMainMenu());
      });

      networkManager.send({ type: 'join_room', code });
    } catch {
      this.statusText.setText('CONNECTION FAILED');
      this.time.delayedCall(2000, () => this.showMainMenu());
    }
  }

  private startOnlineMatch(): void {
    networkManager.offMessage('room_created');
    networkManager.offMessage('room_joined');
    networkManager.offMessage('match_start');
    networkManager.offMessage('error');
    this.scene.start('OnlineMatchScene', { side: this.mySide });
  }

  update(): void {
    this.menuSelector?.update();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/OnlineScene.ts
git commit -m "feat(online): add OnlineScene lobby with create/join room"
```

### Task 9: OnlineMatchScene

**Files:**
- Create: `src/scenes/OnlineMatchScene.ts`

- [ ] **Step 1: Create OnlineMatchScene**

This scene creates the same visual arena as MatchScene but is **passive** — it receives state from the server and just renders it.

```typescript
import Phaser from 'phaser';
import {
  ARENA_WIDTH, ARENA_HEIGHT, TILE_WIDTH, TILE_HEIGHT, GOAL_Y_TOP, GOAL_Y_BOTTOM,
} from '../config/gameConfig';
import { TeamSide, MatchState, type PlayerState as PState } from '../utils/types';
import { ALL_TEAMS } from '../config/teams';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { createArena, type ArenaLayout } from '../entities/ArenaElements';
import { HUD } from '../ui/HUD';
import { networkManager } from '../systems/NetworkManager';
import { createMenuText } from '../ui/MenuComponents';

export class OnlineMatchScene extends Phaser.Scene {
  private ball!: Ball;
  private arena!: ArenaLayout;
  private hud!: HUD;
  private homePlayers: Player[] = [];
  private awayPlayers: Player[] = [];
  private mySide!: TeamSide;
  private messageText!: Phaser.GameObjects.Text;

  // Keyboard state
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private passKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'OnlineMatchScene' });
  }

  init(data: { side: TeamSide }): void {
    this.mySide = data.side;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Floor
    const cols = ARENA_WIDTH / TILE_WIDTH;
    const rows = ARENA_HEIGHT / TILE_HEIGHT;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.add.image(c * TILE_WIDTH + TILE_WIDTH / 2, r * TILE_HEIGHT + TILE_HEIGHT / 2, 'floor_tile');
      }
    }

    // Arena elements
    this.arena = createArena(this);

    // Ball
    this.ball = new Ball(this, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);

    // Players
    const homeTeam = ALL_TEAMS[0]; // Brutal Deluxe
    const awayTeam = ALL_TEAMS[1]; // Revengers
    this.homePlayers = this.createTeamSprites(homeTeam, TeamSide.HOME);
    this.awayPlayers = this.createTeamSprites(awayTeam, TeamSide.AWAY);

    // HUD
    this.hud = new HUD(this, homeTeam.shortName, awayTeam.shortName);

    // Camera
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.startFollow(this.ball, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(120, 120);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.passKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // Message overlay
    this.messageText = this.add.text(480, 336, '', {
      fontSize: '30px', color: '#f59e0b', fontFamily: 'monospace',
    }).setScrollFactor(0).setOrigin(0.5).setDepth(100);

    // Network handlers
    networkManager.onMessage('state', (msg) => this.applyState(msg));
    networkManager.onMessage('goal', () => this.showMessage('GOAL!'));
    networkManager.onMessage('match_end', (msg) => {
      this.showMessage('FULL TIME');
      this.time.delayedCall(3000, () => {
        networkManager.disconnect();
        this.scene.start('ResultScene', {
          result: {
            homeTeam: homeTeam.name,
            awayTeam: awayTeam.name,
            homeScore: msg.homeScore,
            awayScore: msg.awayScore,
            homeTackles: 0, awayTackles: 0,
            homeGoals: [], awayGoals: [],
            mvp: '', creditsEarned: 0,
          },
        });
      });
    });
    networkManager.onMessage('opponent_disconnected', () => {
      this.showMessage('OPPONENT DISCONNECTED');
      this.time.delayedCall(3000, () => {
        networkManager.disconnect();
        this.scene.start('TitleScene');
      });
    });

    // Send ready
    networkManager.send({ type: 'ready' });
  }

  update(): void {
    // Send input to server
    let dx = 0, dy = 0;
    if (this.cursors.left?.isDown) dx -= 1;
    if (this.cursors.right?.isDown) dx += 1;
    if (this.cursors.up?.isDown) dy -= 1;
    if (this.cursors.down?.isDown) dy += 1;

    networkManager.send({
      type: 'input',
      dx, dy,
      fire: Phaser.Input.Keyboard.JustDown(this.fireKey),
      pass: Phaser.Input.Keyboard.JustDown(this.passKey),
    });
  }

  private applyState(msg: any): void {
    // Ball
    this.ball.setPosition(msg.ball.x, msg.ball.y);

    // Players
    this.applyPlayerStates(this.homePlayers, msg.home.players, msg.home.controlledIdx);
    this.applyPlayerStates(this.awayPlayers, msg.away.players, msg.away.controlledIdx);

    // HUD (create minimal TeamMatchData-compatible objects)
    this.hud.update(
      { side: TeamSide.HOME, score: msg.home.score } as any,
      { side: TeamSide.AWAY, score: msg.away.score } as any,
      msg.timer,
      msg.half,
    );

    // Stars
    if (msg.stars) {
      msg.stars.forEach((s: any, i: number) => {
        if (i < this.arena.stars.length) {
          if (s.activated && !this.arena.stars[i].activated) {
            this.arena.stars[i].activate(s.activatedBy);
          } else if (!s.activated && this.arena.stars[i].activated) {
            this.arena.stars[i].reset();
          }
        }
      });
    }

    // Clear message when playing
    if (msg.matchState === MatchState.PLAYING) {
      this.messageText.setText('');
    }
  }

  private applyPlayerStates(players: Player[], states: any[], controlledIdx: number): void {
    for (let i = 0; i < players.length && i < states.length; i++) {
      const p = players[i];
      const s = states[i];
      p.setPosition(s.x, s.y);
      p.setAlpha(s.state === 'INJURED' ? 0.3 : (i === controlledIdx ? 1 : 0.7));
    }
  }

  private createTeamSprites(teamDef: any, side: TeamSide): Player[] {
    const players: Player[] = [];
    const starters = teamDef.players.slice(0, 6);
    for (let i = 0; i < starters.length; i++) {
      const p = new Player(this, 0, 0, starters[i], side, teamDef.color);
      players.push(p);
    }
    return players;
  }

  private showMessage(text: string): void {
    this.messageText.setText(text);
  }

  shutdown(): void {
    networkManager.offMessage('state');
    networkManager.offMessage('goal');
    networkManager.offMessage('match_end');
    networkManager.offMessage('opponent_disconnected');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/OnlineMatchScene.ts
git commit -m "feat(online): add OnlineMatchScene for server-driven gameplay"
```

### Task 10: Register scenes and add ONLINE menu option

**Files:**
- Modify: `src/main.ts`
- Modify: `src/scenes/TitleScene.ts`

- [ ] **Step 1: Add OnlineScene and OnlineMatchScene to main.ts**

Add imports and include both scenes in the scene array.

- [ ] **Step 2: Add ONLINE option to TitleScene**

Add "ONLINE" menu item between FRIENDLY and OPTIONS. Routes to `'OnlineScene'`.

- [ ] **Step 3: Verify client compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/scenes/TitleScene.ts
git commit -m "feat(online): add ONLINE menu option and register new scenes"
```

---

## Chunk 5: Docker, Infrastructure & Deployment

### Task 11: Dockerfile

**Files:**
- Create: `server/Dockerfile`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Note: The server must be compiled locally first (`cd server && npm run build`), then the `dist/` directory is copied into the image. The shared code imports are resolved at compile time.

- [ ] **Step 2: Commit**

```bash
git add server/Dockerfile
git commit -m "feat(online): add server Dockerfile"
```

### Task 12: Pulumi infra — add speedball2-ws service

**Files:**
- Modify: `D:/Projects/infra/src/config.ts`

- [ ] **Step 1: Read current infra config to find the publicServices section**

Read `D:/Projects/infra/src/config.ts` and find where `publicServices` is defined.

- [ ] **Step 2: Add speedball2-ws entry**

Add to `publicServices`:
```typescript
'speedball2-ws': { host: unraidIp, port: 3000 },
```

- [ ] **Step 3: Deploy infra**

Run: `cd D:/Projects/infra && npx tsc && pulumi up --yes`

- [ ] **Step 4: Commit infra change**

```bash
cd D:/Projects/infra && git add src/config.ts && git commit -m "feat: add speedball2-ws service for online multiplayer"
```

### Task 13: Build, deploy server, push client

- [ ] **Step 1: Build server**

```bash
cd D:/Projects/Speedball2/server && npm run build
```

- [ ] **Step 2: Build and push Docker image**

```bash
cd D:/Projects/Speedball2/server && docker build -t speedball2-server .
# Deploy to Unraid (method depends on setup — docker save/load, registry push, etc.)
```

- [ ] **Step 3: Push client changes**

```bash
cd D:/Projects/Speedball2 && git push
```

GitHub Actions will auto-deploy the client to speedball2.roesink.dev.

- [ ] **Step 4: Test end-to-end**

1. Open speedball2.roesink.dev in two browser tabs
2. Tab 1: ONLINE → CREATE GAME → note room code
3. Tab 2: ONLINE → JOIN GAME → enter code
4. Both should see the match start and be able to play against each other
