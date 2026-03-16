// ============================================================
// Speedball 2: Brutal Deluxe — Input Manager
// ============================================================

import Phaser from 'phaser';

export interface PlayerInput {
  /** Horizontal direction: -1 (left), 0, or 1 (right) */
  dx: number;
  /** Vertical direction: -1 (up), 0, or 1 (down) */
  dy: number;
  /** Fire button — true only on the frame it is first pressed */
  fire: boolean;
  /** Pass button — true only on the frame it is first pressed */
  pass: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;

  // P1 keys: arrow keys + Space (fire) + Ctrl (pass)
  private p1Up:    Phaser.Input.Keyboard.Key;
  private p1Down:  Phaser.Input.Keyboard.Key;
  private p1Left:  Phaser.Input.Keyboard.Key;
  private p1Right: Phaser.Input.Keyboard.Key;
  private p1Fire:  Phaser.Input.Keyboard.Key;
  private p1Pass:  Phaser.Input.Keyboard.Key;

  // P2 keys: WASD + Q (fire) + E (pass)
  private p2Up:    Phaser.Input.Keyboard.Key;
  private p2Down:  Phaser.Input.Keyboard.Key;
  private p2Left:  Phaser.Input.Keyboard.Key;
  private p2Right: Phaser.Input.Keyboard.Key;
  private p2Fire:  Phaser.Input.Keyboard.Key;
  private p2Pass:  Phaser.Input.Keyboard.Key;

  // Manual debounce — JustDown can be unreliable across scenes
  private p1FireWasDown = false;
  private p1PassWasDown = false;
  private p2FireWasDown = false;
  private p2PassWasDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const kb = scene.input.keyboard!;

    // Player 1 — arrows + Space (fire) + Ctrl (pass)
    this.p1Up    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.p1Down  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.p1Left  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.p1Right = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.p1Fire  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.p1Pass  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);

    // Player 2 — WASD + Q/E
    this.p2Up    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.p2Down  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.p2Left  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.p2Right = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.p2Fire  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.p2Pass  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  /** Returns the current input state for Player 1 (arrows + Space/Ctrl). */
  getP1Input(): PlayerInput {
    const fireDown = this.p1Fire.isDown;
    const passDown = this.p1Pass.isDown;
    const fireJust = fireDown && !this.p1FireWasDown;
    const passJust = passDown && !this.p1PassWasDown;
    this.p1FireWasDown = fireDown;
    this.p1PassWasDown = passDown;

    return {
      dx: (this.p1Left.isDown ? -1 : 0) + (this.p1Right.isDown ? 1 : 0),
      dy: (this.p1Up.isDown ? -1 : 0) + (this.p1Down.isDown ? 1 : 0),
      fire: fireJust,
      pass: passJust,
    };
  }

  /** Returns the current input state for Player 2 (WASD + Q/E). */
  getP2Input(): PlayerInput {
    const fireDown = this.p2Fire.isDown;
    const passDown = this.p2Pass.isDown;
    const fireJust = fireDown && !this.p2FireWasDown;
    const passJust = passDown && !this.p2PassWasDown;
    this.p2FireWasDown = fireDown;
    this.p2PassWasDown = passDown;

    return {
      dx: (this.p2Left.isDown ? -1 : 0) + (this.p2Right.isDown ? 1 : 0),
      dy: (this.p2Up.isDown ? -1 : 0) + (this.p2Down.isDown ? 1 : 0),
      fire: fireJust,
      pass: passJust,
    };
  }
}
