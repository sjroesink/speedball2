// ============================================================
// Speedball 2: Brutal Deluxe — Server Entry Point
// ============================================================

import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { RoomManager } from './RoomManager.js';

const PORT = Number(process.env.PORT) || 3000;
const wss = new WebSocketServer({ port: PORT });
const roomManager = new RoomManager();

console.log(`Speedball 2 server listening on port ${PORT}`);

// ── Helper ────────────────────────────────────────────────────

function send(ws: WebSocket, msg: object): void {
  if (ws.readyState === ws.OPEN) {
    try { ws.send(JSON.stringify(msg)); } catch { /* ignore */ }
  }
}

// ── Connection handler ────────────────────────────────────────

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (raw) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case 'create_room': {
        const room = roomManager.create(ws);
        if (!room) {
          send(ws, { type: 'error', message: 'Server is full — try again later' });
          return;
        }
        // Register cleanup so RoomManager can remove the room on destroy
        room.setOnDestroy(() => roomManager.remove(room.code));
        send(ws, { type: 'room_created', code: room.code, side: 'HOME' });
        console.log(`Room ${room.code} created`);
        break;
      }

      case 'join_room': {
        const code = typeof msg.code === 'string' ? msg.code.toUpperCase() : '';
        const room = roomManager.join(code, ws);
        if (!room) {
          send(ws, { type: 'error', message: 'Room not found or already full' });
          return;
        }
        send(ws, { type: 'room_joined', side: 'AWAY' });
        console.log(`Client joined room ${room.code}`);
        // addAway triggers match_start → ready flow internally
        room.addAway(ws);
        break;
      }

      // input / ready / pong are handled by GameRoom directly once the
      // client's WebSocket is registered with a room.
      default:
        break;
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
