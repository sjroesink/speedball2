// ============================================================
// Speedball 2: Brutal Deluxe — NetworkManager
// WebSocket singleton for online multiplayer communication.
// ============================================================

type MessageHandler = (data: Record<string, unknown>) => void;

class NetworkManager {
  private socket: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private disconnectHandlers: Array<() => void> = [];

  // ------ Connection -------------------------------------------------------

  /**
   * Connects to the WebSocket server.
   * @param url  WebSocket URL (defaults to VITE_WS_URL env var or wss://speedball2-ws.sander.ninja)
   */
  connect(url: string = import.meta.env.VITE_WS_URL || 'wss://speedball2-ws.sander.ninja'): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.socket = new WebSocket(url);

    this.socket.addEventListener('message', (event: MessageEvent) => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(event.data as string) as Record<string, unknown>;
      } catch {
        console.warn('[NetworkManager] Failed to parse message:', event.data);
        return;
      }

      const type = parsed['type'] as string | undefined;
      if (!type) return;

      // Auto-respond to ping
      if (type === 'ping') {
        this.send({ type: 'pong' });
        return;
      }

      const set = this.handlers.get(type);
      if (set) {
        for (const handler of set) {
          handler(parsed);
        }
      }
    });

    this.socket.addEventListener('close', () => {
      for (const handler of this.disconnectHandlers) {
        handler();
      }
    });

    this.socket.addEventListener('error', (err) => {
      console.error('[NetworkManager] WebSocket error:', err);
    });
  }

  /** Closes the WebSocket connection. */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // ------ Sending ----------------------------------------------------------

  /** JSON-serialises and sends a message. No-op if not connected. */
  send(message: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[NetworkManager] Cannot send — socket not open');
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  // ------ Receiving --------------------------------------------------------

  /**
   * Registers a handler for the given message type.
   * Multiple handlers per type are supported.
   */
  onMessage(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  /**
   * Removes a handler for the given message type.
   * If no handler is supplied, removes ALL handlers for that type.
   */
  offMessage(type: string, handler?: MessageHandler): void {
    if (!handler) {
      this.handlers.delete(type);
      return;
    }
    this.handlers.get(type)?.delete(handler);
  }

  /**
   * Registers a callback that fires when the connection closes.
   */
  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  /**
   * Removes a previously-registered disconnect callback.
   */
  offDisconnect(handler: () => void): void {
    this.disconnectHandlers = this.disconnectHandlers.filter(h => h !== handler);
  }

  // ------ State ------------------------------------------------------------

  /** Returns true if the WebSocket is currently open. */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

// Export singleton
export const networkManager = new NetworkManager();
