import type { WebSocket } from 'ws';
import { GameRoom } from './GameRoom.js';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O
const CODE_LEN = 4;
const MAX_ROOMS = 50;
const ROOM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LEN; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Create a new room for the home player. Returns the room or null if at capacity. */
  create(homeWs: WebSocket): GameRoom | null {
    if (this.rooms.size >= MAX_ROOMS) return null;

    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      if (attempts > 1000) return null; // safety valve
    } while (this.rooms.has(code));

    const room = new GameRoom(code, homeWs);
    this.rooms.set(code, room);
    this.scheduleTimeout(code);
    return room;
  }

  /** Join an existing room as the away player. Returns the room or null if not found / already full. */
  join(code: string, awayWs: WebSocket): GameRoom | null {
    const room = this.rooms.get(code);
    if (!room || room.isFull) return null;
    room.addAway(awayWs);
    this.clearTimeout(code);
    return room;
  }

  /** Remove and destroy a room by code. */
  remove(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    this.clearTimeout(code);
    room.destroy();
    this.rooms.delete(code);
  }

  /** Find the room a given WebSocket belongs to (home or away). */
  findBySocket(ws: WebSocket): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.homeWs === ws || room.awayWs === ws) return room;
    }
    return undefined;
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  private scheduleTimeout(code: string): void {
    const timer = setTimeout(() => {
      console.log(`Room ${code} timed out — removing`);
      this.remove(code);
    }, ROOM_TIMEOUT_MS);
    this.timers.set(code, timer);
  }

  private clearTimeout(code: string): void {
    const timer = this.timers.get(code);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(code);
    }
  }
}
