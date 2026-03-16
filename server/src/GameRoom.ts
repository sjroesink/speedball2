import type { WebSocket } from 'ws';

export class GameRoom {
  readonly code: string;
  readonly homeWs: WebSocket;
  awayWs: WebSocket | null = null;
  isFull: boolean = false;
  isMatchActive: boolean = false;

  constructor(code: string, homeWs: WebSocket) {
    this.code = code;
    this.homeWs = homeWs;
  }

  addAway(ws: WebSocket): void {
    this.awayWs = ws;
    this.isFull = true;
  }

  destroy(): void {
    this.isMatchActive = false;
    try { this.homeWs.close(); } catch { /* already closed */ }
    try { this.awayWs?.close(); } catch { /* already closed */ }
  }
}
