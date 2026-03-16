// ============================================================
// Speedball 2: Brutal Deluxe — GameRoom
// ============================================================
// Manages one match between two WebSocket clients.
// HOME = room creator, AWAY = joiner.
// ============================================================

import type { WebSocket } from 'ws';
import { TeamSide, MatchState, type ClientInput } from '../../src/utils/types.js';
import { ServerSimulation } from './ServerSimulation.js';
import { brutalDeluxe, revengers } from '../../src/config/teams.js';

const TICK_INTERVAL_MS = 50;          // 20 ticks/sec
const PING_INTERVAL_MS = 5_000;       // 5 s heartbeat
const READY_TIMEOUT_MS = 10_000;      // 10 s for both players to send ready
const MATCH_END_CLEANUP_MS = 5_000;   // 5 s before destroying room after match

// ── Helpers ──────────────────────────────────────────────────

function send(ws: WebSocket, msg: object): void {
  if (ws.readyState === ws.OPEN) {
    try { ws.send(JSON.stringify(msg)); } catch { /* ignore */ }
  }
}

// ── GameRoom ─────────────────────────────────────────────────

export class GameRoom {
  readonly code: string;
  readonly homeWs: WebSocket;
  awayWs: WebSocket | null = null;

  isFull: boolean = false;
  isMatchActive: boolean = false;

  // Latest input per side (cleared one-shots after application)
  private homeInput: ClientInput = { dx: 0, dy: 0, fire: false, pass: false };
  private awayInput: ClientInput = { dx: 0, dy: 0, fire: false, pass: false };

  // Ready flags
  private homeReady = false;
  private awayReady = false;

  // Simulation
  private sim: ServerSimulation | null = null;

  // Timers / intervals
  private gameLoopId: ReturnType<typeof setInterval> | null = null;
  private pingLoopId: ReturnType<typeof setInterval> | null = null;
  private readyTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private cleanupTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Destroy callback (registered by RoomManager)
  private onDestroy: (() => void) | null = null;

  // Track last broadcast match state to detect goals / match end
  private lastMatchState: MatchState | null = null;
  private lastHomeGoals = 0;
  private lastAwayGoals = 0;

  // ── Constructor ──────────────────────────────────────────

  constructor(code: string, homeWs: WebSocket) {
    this.code = code;
    this.homeWs = homeWs;
    this.attachHomeListeners();
  }

  // ── Public API ───────────────────────────────────────────

  setOnDestroy(fn: () => void): void {
    this.onDestroy = fn;
  }

  addAway(ws: WebSocket): void {
    this.awayWs = ws;
    this.isFull = true;
    this.attachAwayListeners();
    this.startMatch();
  }

  destroy(): void {
    this.isMatchActive = false;
    this.stopLoops();
    try { this.homeWs.close(); } catch { /* already closed */ }
    try { this.awayWs?.close(); } catch { /* already closed */ }
    this.onDestroy?.();
  }

  // ── Socket listeners ─────────────────────────────────────

  private attachHomeListeners(): void {
    this.homeWs.on('message', (raw) => this.handleMessage(TeamSide.HOME, raw.toString()));
    this.homeWs.on('close', () => this.handleDisconnect(TeamSide.HOME));
    this.homeWs.on('error', () => this.handleDisconnect(TeamSide.HOME));
  }

  private attachAwayListeners(): void {
    if (!this.awayWs) return;
    this.awayWs.on('message', (raw) => this.handleMessage(TeamSide.AWAY, raw.toString()));
    this.awayWs.on('close', () => this.handleDisconnect(TeamSide.AWAY));
    this.awayWs.on('error', () => this.handleDisconnect(TeamSide.AWAY));
  }

  // ── Message routing ───────────────────────────────────────

  private handleMessage(side: TeamSide, raw: string): void {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'input':
        this.handleInput(side, msg);
        break;
      case 'ready':
        this.handleReady(side);
        break;
      case 'pong':
        // heartbeat acknowledged — nothing to do
        break;
    }
  }

  private handleInput(side: TeamSide, msg: Record<string, unknown>): void {
    if (!this.isMatchActive) return;
    const input: ClientInput = {
      dx:   typeof msg.dx   === 'number'  ? msg.dx   : 0,
      dy:   typeof msg.dy   === 'number'  ? msg.dy   : 0,
      fire: typeof msg.fire === 'boolean' ? msg.fire : false,
      pass: typeof msg.pass === 'boolean' ? msg.pass : false,
    };
    if (side === TeamSide.HOME) {
      this.homeInput = input;
    } else {
      this.awayInput = input;
    }
  }

  // ── Match startup ─────────────────────────────────────────

  private startMatch(): void {
    // Notify both players — match is starting, wait for ready
    const matchStartMsg = {
      type:     'match_start',
      homeTeam: brutalDeluxe.name,
      awayTeam: revengers.name,
    };
    send(this.homeWs, matchStartMsg);
    send(this.awayWs!, matchStartMsg);

    // Start 10 s ready timeout
    this.readyTimeoutId = setTimeout(() => {
      console.log(`Room ${this.code}: ready timeout — destroying`);
      this.destroy();
    }, READY_TIMEOUT_MS);
  }

  private handleReady(side: TeamSide): void {
    if (side === TeamSide.HOME) this.homeReady = true;
    else this.awayReady = true;

    if (this.homeReady && this.awayReady) {
      // Both ready — clear timeout and start simulation
      if (this.readyTimeoutId !== null) {
        clearTimeout(this.readyTimeoutId);
        this.readyTimeoutId = null;
      }
      this.beginGameLoop();
    }
  }

  // ── Game loop ─────────────────────────────────────────────

  private beginGameLoop(): void {
    this.sim = new ServerSimulation(brutalDeluxe, revengers);
    this.isMatchActive = true;
    this.lastMatchState = null;
    this.lastHomeGoals = 0;
    this.lastAwayGoals = 0;

    // Heartbeat
    this.pingLoopId = setInterval(() => {
      send(this.homeWs, { type: 'ping' });
      if (this.awayWs) send(this.awayWs, { type: 'ping' });
    }, PING_INTERVAL_MS);

    // Game tick
    this.gameLoopId = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  private tick(): void {
    if (!this.sim || !this.isMatchActive) return;

    // Apply inputs
    this.sim.applyInput(TeamSide.HOME, this.homeInput);
    this.sim.applyInput(TeamSide.AWAY, this.awayInput);

    // Clear one-shot inputs
    this.homeInput.fire = false;
    this.homeInput.pass = false;
    this.awayInput.fire = false;
    this.awayInput.pass = false;

    // Run AI for non-controlled players on both sides
    this.sim.runAI(TeamSide.HOME, TICK_INTERVAL_MS);
    this.sim.runAI(TeamSide.AWAY, TICK_INTERVAL_MS);

    // Advance simulation
    this.sim.update(TICK_INTERVAL_MS);

    const gs = this.sim.gameState;

    // Detect goal
    const homeGoals = gs.home.goals;
    const awayGoals = gs.away.goals;
    if (homeGoals !== this.lastHomeGoals || awayGoals !== this.lastAwayGoals) {
      this.lastHomeGoals = homeGoals;
      this.lastAwayGoals = awayGoals;
      const goalMsg = { type: 'goal', homeScore: gs.home.score, awayScore: gs.away.score };
      send(this.homeWs, goalMsg);
      if (this.awayWs) send(this.awayWs, goalMsg);
    }

    // Broadcast state
    const stateMsg = { type: 'state', ...gs };
    send(this.homeWs, stateMsg);
    if (this.awayWs) send(this.awayWs, stateMsg);

    // Detect match end
    if (gs.matchState === MatchState.MATCH_END && this.lastMatchState !== MatchState.MATCH_END) {
      this.lastMatchState = MatchState.MATCH_END;
      const endMsg = { type: 'match_end', homeScore: gs.home.score, awayScore: gs.away.score };
      send(this.homeWs, endMsg);
      if (this.awayWs) send(this.awayWs, endMsg);

      // Stop loops and schedule cleanup
      this.stopLoops();
      this.cleanupTimeoutId = setTimeout(() => this.destroy(), MATCH_END_CLEANUP_MS);
    } else {
      this.lastMatchState = gs.matchState;
    }
  }

  // ── Disconnect handling ───────────────────────────────────

  private handleDisconnect(side: TeamSide): void {
    if (!this.isMatchActive && !this.isFull) {
      // Pre-match disconnect — just clean up
      this.destroy();
      return;
    }

    // Notify opponent
    const opponentWs = side === TeamSide.HOME ? this.awayWs : this.homeWs;
    if (opponentWs) {
      send(opponentWs, { type: 'opponent_disconnected' });
    }

    this.destroy();
  }

  // ── Cleanup ───────────────────────────────────────────────

  private stopLoops(): void {
    if (this.gameLoopId !== null) {
      clearInterval(this.gameLoopId);
      this.gameLoopId = null;
    }
    if (this.pingLoopId !== null) {
      clearInterval(this.pingLoopId);
      this.pingLoopId = null;
    }
    if (this.readyTimeoutId !== null) {
      clearTimeout(this.readyTimeoutId);
      this.readyTimeoutId = null;
    }
    if (this.cleanupTimeoutId !== null) {
      clearTimeout(this.cleanupTimeoutId);
      this.cleanupTimeoutId = null;
    }
  }
}
