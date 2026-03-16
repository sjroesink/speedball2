// ============================================================
// Speedball 2: Brutal Deluxe — OnlineScene (Lobby)
// Handles CREATE GAME / JOIN GAME flow before online match.
// ============================================================

import Phaser from 'phaser';
import { createMenuText, createMenuItem, MenuSelector } from '../ui/MenuComponents';
import { networkManager } from '../systems/NetworkManager';
import { TeamSide } from '../utils/types';

// Possible UI states for this scene
type LobbyState = 'MENU' | 'WAITING' | 'JOIN_INPUT';

export class OnlineScene extends Phaser.Scene {
  // ------ UI ---------------------------------------------------------------
  private menuSelector!: MenuSelector;
  private menuItems:     Phaser.GameObjects.Text[] = [];
  private statusText!:   Phaser.GameObjects.Text;
  private inputText!:    Phaser.GameObjects.Text;
  private promptText!:   Phaser.GameObjects.Text;

  // ------ State ------------------------------------------------------------
  private lobbyState: LobbyState = 'MENU';
  private joinCode:   string     = '';

  // ------ Bound handlers (kept for cleanup) --------------------------------
  private handleMatchStart!: (data: Record<string, unknown>) => void;
  private handleRoomCreated!: (data: Record<string, unknown>) => void;
  private handleError!:       (data: Record<string, unknown>) => void;
  private handleDisconnect!:  () => void;
  private keyListener!:       (event: KeyboardEvent) => void;

  // ------ Construction -----------------------------------------------------

  constructor() {
    super({ key: 'OnlineScene' });
  }

  // ------ Lifecycle --------------------------------------------------------

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Title
    createMenuText(this, cx, 144, 'ONLINE', 48);
    createMenuText(this, cx, 210, 'MULTIPLAYER', 24);
    createMenuText(this, cx, 258, '─────────────────', 24);

    // Menu items
    const menuY     = [336, 396, 456];
    const labels    = ['CREATE GAME', 'JOIN GAME', 'BACK'];
    const callbacks: Array<() => void> = [
      () => this.createGame(),
      () => this.startJoinInput(),
      () => this.goBack(),
    ];

    this.menuItems = labels.map((label, i) =>
      createMenuItem(this, cx, menuY[i], label, callbacks[i]),
    );

    this.menuSelector = new MenuSelector(this, this.menuItems, callbacks);

    // Status text (room code / waiting message / error)
    this.statusText = this.add.text(cx, 540, '', {
      fontSize: '24px',
      color: '#f59e0b',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(false);

    // Join input prompt (hidden until JOIN state)
    this.promptText = this.add.text(cx, 336, 'ENTER ROOM CODE:', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(false);

    this.inputText = this.add.text(cx, 396, '____', {
      fontSize: '36px',
      color: '#f59e0b',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(false);

    // Footer
    createMenuText(this, cx, height - 48, 'UP/DOWN  Z/SPACE/ENTER TO SELECT', 18);

    // Register network handlers
    this.registerNetworkHandlers();

    // Native keyboard for join code entry
    this.keyListener = (event: KeyboardEvent) => this.onKeyDown(event);
    window.addEventListener('keydown', this.keyListener);
  }

  update(_time: number, _delta: number): void {
    if (this.lobbyState === 'MENU') {
      this.menuSelector.update();
    }
  }

  shutdown(): void {
    this.cleanupNetworkHandlers();
    window.removeEventListener('keydown', this.keyListener);
  }

  // ------ Menu Actions -----------------------------------------------------

  private createGame(): void {
    if (this.lobbyState !== 'MENU') return;

    networkManager.connect();

    // Wait for socket to open, then send create_room
    const tryCreate = () => {
      if (networkManager.isConnected()) {
        networkManager.send({ type: 'create_room' });
        this.showWaiting('Connecting...');
      } else {
        this.time.delayedCall(100, tryCreate);
      }
    };
    tryCreate();
  }

  private startJoinInput(): void {
    if (this.lobbyState !== 'MENU') return;

    this.lobbyState = 'JOIN_INPUT';
    this.joinCode   = '';

    // Hide menu items
    for (const item of this.menuItems) item.setVisible(false);
    this.statusText.setVisible(false);

    // Show join input UI
    this.promptText.setVisible(true);
    this.inputText.setVisible(true);
    this.updateJoinDisplay();
  }

  private goBack(): void {
    networkManager.disconnect();
    this.scene.start('TitleScene');
  }

  // ------ Join Input -------------------------------------------------------

  private onKeyDown(event: KeyboardEvent): void {
    if (this.lobbyState !== 'JOIN_INPUT') return;

    const key = event.key.toUpperCase();

    if (event.key === 'Escape') {
      this.cancelJoinInput();
      return;
    }

    if (event.key === 'Backspace') {
      this.joinCode = this.joinCode.slice(0, -1);
      this.updateJoinDisplay();
      return;
    }

    if (event.key === 'Enter' && this.joinCode.length === 4) {
      this.submitJoinCode();
      return;
    }

    // Accept A–Z only, up to 4 characters
    if (/^[A-Z]$/.test(key) && this.joinCode.length < 4) {
      this.joinCode += key;
      this.updateJoinDisplay();
    }
  }

  private updateJoinDisplay(): void {
    const display = this.joinCode.padEnd(4, '_');
    this.inputText.setText(display);
  }

  private cancelJoinInput(): void {
    this.lobbyState = 'MENU';
    this.joinCode   = '';

    // Restore menu items
    for (const item of this.menuItems) item.setVisible(true);
    this.promptText.setVisible(false);
    this.inputText.setVisible(false);
  }

  private submitJoinCode(): void {
    networkManager.connect();

    const tryJoin = () => {
      if (networkManager.isConnected()) {
        networkManager.send({ type: 'join_room', code: this.joinCode });
        this.showWaiting(`Joining ${this.joinCode}...`);
      } else {
        this.time.delayedCall(100, tryJoin);
      }
    };
    tryJoin();
  }

  // ------ UI helpers -------------------------------------------------------

  private showWaiting(message: string): void {
    this.lobbyState = 'WAITING';

    // Hide menu and join input
    for (const item of this.menuItems) item.setVisible(false);
    this.promptText.setVisible(false);
    this.inputText.setVisible(false);

    // Show status
    this.statusText.setText(message).setVisible(true);
  }

  private showError(message: string): void {
    this.statusText.setText(message).setVisible(true);

    // Return to menu after 2 s
    this.time.delayedCall(2000, () => {
      networkManager.disconnect();
      this.returnToMenu();
    });
  }

  private returnToMenu(): void {
    this.lobbyState = 'MENU';
    this.joinCode   = '';

    for (const item of this.menuItems) item.setVisible(true);
    this.promptText.setVisible(false);
    this.inputText.setVisible(false);
    this.statusText.setVisible(false);
  }

  // ------ Network Handlers -------------------------------------------------

  private registerNetworkHandlers(): void {
    this.handleRoomCreated = (data) => {
      const code = data['code'] as string;
      this.statusText.setText(`Room: ${code} — Waiting...`);
    };

    this.handleMatchStart = (data) => {
      const side = data['side'] as TeamSide;
      this.cleanupNetworkHandlers();
      this.scene.start('OnlineMatchScene', { side });
    };

    this.handleError = (data) => {
      const msg = (data['message'] as string | undefined) ?? 'Connection error';
      this.showError(msg);
    };

    this.handleDisconnect = () => {
      if (this.lobbyState === 'WAITING') {
        this.showError('Disconnected from server');
      }
    };

    networkManager.onMessage('room_created',  this.handleRoomCreated);
    networkManager.onMessage('match_start',   this.handleMatchStart);
    networkManager.onMessage('error',         this.handleError);
    networkManager.onDisconnect(this.handleDisconnect);
  }

  private cleanupNetworkHandlers(): void {
    networkManager.offMessage('room_created',  this.handleRoomCreated);
    networkManager.offMessage('match_start',   this.handleMatchStart);
    networkManager.offMessage('error',         this.handleError);
    networkManager.offDisconnect(this.handleDisconnect);
  }
}
