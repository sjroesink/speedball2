# Speedball 2: Online Multiplayer Design Spec

## Overview

Add online multiplayer to Speedball 2 via WebSocket. An authoritative Node.js game server runs the MatchEngine; clients send input and receive game state. Players find each other via 4-letter room codes. Runs on Unraid via Docker + Traefik.

Existing local gameplay (singleplayer, local multiplayer, league mode) remains unchanged.

## Architecture

```
Client A  →  { input }  →  WebSocket Server  ←  { input }  ←  Client B
                                   ↓
                             MatchEngine.update()
                                   ↓
              { state }  →  Both Clients  ←  { state }
```

Three components:
1. **Game Server** — Node.js + `ws`, runs on Unraid, exposed as `wss://speedball2-ws.sander.ninja`
2. **Client** — existing Phaser game with new OnlineScene + OnlineMatchScene
3. **Shared code** — MatchEngine, gameConfig, types used by both server and client

## Server

### Tech Stack

- Node.js + TypeScript
- `ws` library for WebSocket
- Runs as Docker container on Unraid
- Traefik reverse proxy: `speedball2-ws.sander.ninja` → container port 3000

### Directory Structure

```
server/
├── package.json
├── tsconfig.json
├── Dockerfile
├── src/
│   ├── index.ts          # WebSocket server entry, connection handling
│   ├── RoomManager.ts    # Room creation, joining, cleanup
│   └── GameRoom.ts       # Single match: game loop, input, state broadcast
```

### Shared Code

The following files are used by both client and server:

- `src/config/gameConfig.ts` — constants and stat formulas
- `src/utils/types.ts` — enums and interfaces
- `src/systems/MatchEngine.ts` — game rules, scoring, timer
- `src/entities/Ball.ts` — ball state (server uses logic only, no Phaser sprite)
- `src/entities/Player.ts` — player state (server uses logic only, no Phaser sprite)

**Approach:** The server imports these files but runs headless (no Phaser). The MatchEngine and entities need to work without Phaser's physics — the server uses its own simple position/velocity math. To achieve this:

- Extract game logic interfaces (`BallState`, `PlayerState`) into `src/utils/types.ts`
- Server operates on plain state objects, not Phaser sprites
- MatchEngine accepts state objects instead of Phaser entities
- Client-side Phaser entities wrap these state objects for rendering

This requires refactoring MatchEngine and entities to separate logic from rendering. The refactor is scoped in the implementation plan.

### RoomManager

- `createRoom(): string` — generates random 4-letter code (A-Z), retries on collision. Returns code
- `joinRoom(code, ws): boolean` — adds second player, returns success
- `getRoom(code): GameRoom | null`
- `removeRoom(code): void`
- Limits: max 50 simultaneous rooms
- Cleanup: rooms without activity for 5 minutes are auto-removed
- Room codes are recycled after cleanup

### GameRoom

- Holds two WebSocket connections (home/away)
- Room creator is always HOME side. Joiner is AWAY. `room_created` includes `side: "home"`.
- Creates headless game simulation with two fixed teams (Brutal Deluxe vs Revengers for v1)
- Game loop: `setInterval` at 20 ticks/sec (50ms)
- Each tick:
  1. Apply latest input from each client to their controlled player (see Input Processing below)
  2. Run AI for the 5 non-controlled outfield players per team (server runs AIController for both teams' uncontrolled players)
  3. Run ServerSimulation.update(50) — ball physics, collisions, goals, stars, multipliers, warps, tackles
  4. Run MatchEngine.update(50) — timer, state transitions
  5. Serialize full state → broadcast to both clients
- Match states handled: kickoff, playing, goal_scored, halftime, match_end
- On disconnect: opponent wins automatically, room cleaned up
- On match end: send result, clean up room after 5 seconds
- Ready handshake: after `match_start`, server waits for `ready` from both clients before starting the game loop. Timeout: 10 seconds, then auto-start.

### Input Processing on Server

The client sends raw input `{ dx, dy, fire, pass }`. The server interprets this identically to how `processHumanInput()` works in the local MatchScene:

- **dx/dy** → move the controlled player in that direction
- **fire** → if controlled player has ball: shoot toward opponent goal. If no ball: tackle (lunge in facing direction, check opponents in range)
- **pass** → if controlled player has ball: pass to nearest teammate. If no ball: switch controlled player to nearest-to-ball

The server maintains `controlledPlayerIndex` per team and runs the same logic as the local game.

### Server Simulation (ServerSimulation)

The server must simulate ALL gameplay that currently lives across PhysicsManager, Ball, Player, ArenaElements, and AIController. This is the **headless game simulation**:

**Ball simulation:**
- Position update: `x += vx * dt`, `y += vy * dt`
- Friction when loose: decelerate by BALL_FRICTION * dt
- Wall bounce: reflect velocity, apply 0.8 restitution
- Dome bounce: reflect + random ±15° variance, 0.9 restitution
- Pickup: nearest active player within 12px (scaled: 36px) auto-picks up loose ball
- When owned: ball position follows owner

**Player simulation:**
- Position update from velocity (set by input or AI)
- State timers: tackle recovery (0.3s), stun (0.5s), injury (10s)
- Collision with walls (stop), domes (bounce)

**Arena elements:**
- Stars: ball contact activates. All 5 on one side by same team = 10 bonus + reset
- Multipliers: ball contact activates x2 for team. Deactivates on score, respawns after 10s
- Warps: ball entering left exit exits right (and vice versa), same velocity
- Goals: ball past goal line within goal width = score

**AI for non-controlled players:**
- Server runs AIController for each team's 5 non-controlled outfield players
- Same attack/defend/loose_ball state machine as local AI
- Keeper auto-positions as in local play

This is implemented as a self-contained `ServerSimulation` class that holds all game state as plain objects (no Phaser dependencies).

### Connection Handling

- Heartbeat: server sends `ping` every 5 seconds, expects `pong` within 3 seconds
- No response → connection considered dead → opponent wins
- No auto-reconnect (match is real-time, reconnecting mid-match is impractical for v1)

## Wire Protocol

All messages are JSON with a `type` field.

### Client → Server

| Type | Fields | When |
|------|--------|------|
| `create_room` | — | Player creates a room |
| `join_room` | `code: string` | Player joins with 4-letter code |
| `input` | `dx, dy: number, fire, pass: boolean` | Every frame while match is playing |
| `ready` | — | Client has loaded arena and is ready to start |
| `pong` | — | Response to server ping |

### Server → Client

| Type | Fields | When |
|------|--------|------|
| `room_created` | `code: string, side: "home"` | Room created, waiting for opponent |
| `room_joined` | `side: "home" \| "away"` | Successfully joined room |
| `match_start` | `homeTeam, awayTeam: string` | Both players connected, match starting |
| `state` | `tick, timer, half, matchState, ball: {x,y,vx,vy,ownerSide}, home: {score, controlledIdx, players:[{x,y,state,hasBall,facingAngle}]}, away: {score, controlledIdx, players:[{x,y,state,hasBall,facingAngle}]}, stars:[{activated,activatedBy}], multipliers:[{activeForTeam}]` | 20x/sec during match |
| `goal` | `scorer: "home"\|"away", homeScore, awayScore: number` | Goal scored |
| `match_end` | `homeScore, awayScore: number` | Match finished |
| `opponent_disconnected` | — | Other player left |
| `error` | `message: string` | Room not found, room full, etc. |
| `ping` | — | Heartbeat check |

### State Message Size

~500 bytes per tick. At 20 ticks/sec = ~10 KB/sec per client. Well within any connection's capacity.

## Client Changes

### New Files

| File | Purpose |
|------|---------|
| `src/scenes/OnlineScene.ts` | Lobby UI: create/join room |
| `src/scenes/OnlineMatchScene.ts` | Online match renderer (passive, no local MatchEngine) |
| `src/systems/NetworkManager.ts` | WebSocket wrapper |

### OnlineScene (Lobby)

Three-step flow:
1. Menu: CREATE GAME / JOIN GAME / BACK
2. CREATE: connects to server, sends `create_room`, displays "Room: ABCD — Waiting..."
3. JOIN: text input for 4-letter code, sends `join_room`, displays "Joining..."

On `match_start` from server → transition to OnlineMatchScene.

Error handling: "Room not found", "Room full" → display message, return to menu.

### OnlineMatchScene

Similar to MatchScene but **passive** — no MatchEngine, no AI, no InputManager processing:

- Creates arena, sprites, HUD (same visual setup as MatchScene)
- Every frame: reads local keyboard input → sends `{ type: "input", dx, dy, fire, pass }` to server
- On `state` message: updates all player positions, ball position, scores, timer
- On `goal` message: shows "GOAL!" overlay
- On `match_end` message: shows "FULL TIME" → ResultScene
- On `opponent_disconnected`: shows "OPPONENT DISCONNECTED" → ResultScene with win

Entity updates from server state: directly set `x, y` positions on Phaser sprites. No physics simulation client-side. For v1, this means movement may appear slightly jerky at high latency — acceptable per the "start simple, upgrade later" decision.

### NetworkManager

```typescript
class NetworkManager {
  connect(url: string): Promise<void>
  disconnect(): void
  send(message: object): void
  onMessage(type: string, handler: (data: any) => void): void
  offMessage(type: string): void
  isConnected(): boolean
}
```

- Single WebSocket connection
- JSON serialize/deserialize
- Event-based message routing by `type` field
- Responds to `ping` with `pong` automatically
- Emits `disconnected` event on close

### TitleScene Change

Add "ONLINE" as 4th menu option between FRIENDLY and OPTIONS. Routes to OnlineScene.

## Infrastructure

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production
COPY server/dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

The server compiles to a self-contained bundle. Shared code (gameConfig, types) is imported at compile time via TypeScript path aliases and bundled into `dist/`. No runtime `shared/` directory needed.

### Pulumi / Traefik

Add to `publicServices` in infra config:
- Service: `speedball2-ws`
- Host: Unraid IP
- Port: 3000
- Domain: `speedball2-ws.sander.ninja`

Traefik handles TLS termination and WebSocket upgrade automatically.

### Deployment

- Server: `docker build` + deploy to Unraid
- Client: existing GitHub Pages pipeline (auto-deploys on push to main)
- Client connects to `wss://speedball2-ws.sander.ninja` by default. Configurable via Vite env var `VITE_WS_URL` for local dev (e.g. `ws://localhost:3000`)

## Refactoring Scope

### What's shared (import at compile time)

These files have NO Phaser dependencies and can be imported directly by the server:
- `src/config/gameConfig.ts` — constants and formulas
- `src/utils/types.ts` — enums, interfaces (+ new state interfaces below)

### New state interfaces in types.ts

```typescript
interface BallState { x: number; y: number; vx: number; vy: number; ownerSide: TeamSide | null; }
interface PlayerState { x: number; y: number; vx: number; vy: number; state: PlayerState; hasBall: boolean; facingAngle: number; role: PlayerRole; stats: PlayerStats; injuryTimer: number; stateTimer: number; }
interface StarState { activated: boolean; activatedBy: TeamSide | null; x: number; y: number; side: 'top' | 'bottom'; }
interface MultiplierState { activeForTeam: TeamSide | null; respawnTimer: number; x: number; y: number; }
interface ArenaState { stars: StarState[]; multipliers: MultiplierState[]; domePositions: {x:number,y:number}[]; warpPairs: {leftX:number,rightX:number,y:number}[]; }
interface GameState { ball: BallState; homePlayers: PlayerState[]; awayPlayers: PlayerState[]; arena: ArenaState; homeScore: number; awayScore: number; timer: number; half: number; matchState: MatchState; homeControlledIdx: number; awayControlledIdx: number; }
```

### Server-only code (new)

- `server/src/ServerSimulation.ts` — complete headless game simulation. Operates on GameState. Implements all physics, collisions, goals, stars, multipliers, warps, ball pickup, shooting, passing, tackles. This duplicates logic from PhysicsManager/Ball/Player/ArenaElements but without Phaser dependencies.
- `server/src/ServerAI.ts` — headless AI controller. Duplicates AIController logic but operates on PlayerState arrays instead of Phaser sprites.

### What stays unchanged

- All existing client code (MatchScene, PhysicsManager, Ball, Player, ArenaElements, AIController) — untouched. Local play works exactly as before.
- The duplication is intentional for v1: keeps the refactor contained, doesn't risk breaking existing gameplay, and allows the server simulation to be optimized independently.

## Out of Scope (v1)

- Client-side prediction / interpolation (upgrade path for later)
- Team selection for online matches (fixed teams for now)
- Spectator mode
- Multiple matches per room (one match, then room closes)
- Matchmaking / ELO
- Chat
- Mobile support
- Reconnection after disconnect
