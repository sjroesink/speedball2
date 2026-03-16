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

  // P1 keys: arrow keys + Z (fire) + X (pass)
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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const kb = scene.input.keyboard!;

    // Player 1 — arrows + Z/X
    this.p1Up    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.p1Down  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.p1Left  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.p1Right = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.p1Fire  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.p1Pass  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // Player 2 — WASD + Q/E
    this.p2Up    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.p2Down  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.p2Left  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.p2Right = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.p2Fire  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.p2Pass  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  /** Returns the current input state for Player 1 (arrow keys + Z/X). */
  getP1Input(): PlayerInput {
    return this.readInput(
      this.p1Up, this.p1Down, this.p1Left, this.p1Right,
      this.p1Fire, this.p1Pass,
    );
  }

  /** Returns the current input state for Player 2 (WASD + Q/E). */
  getP2Input(): PlayerInput {
    return this.readInput(
      this.p2Up, this.p2Down, this.p2Left, this.p2Right,
      this.p2Fire, this.p2Pass,
    );
  }

  // ------ Private helpers --------------------------------------------------

  private readInput(
    up:    Phaser.Input.Keyboard.Key,
    down:  Phaser.Input.Keyboard.Key,
    left:  Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key,
    fire:  Phaser.Input.Keyboard.Key,
    pass:  Phaser.Input.Keyboard.Key,
  ): PlayerInput {
    const JustDown = Phaser.Input.Keyboard.JustDown;

    let dx = 0;
    let dy = 0;

    if (left.isDown)  dx -= 1;
    if (right.isDown) dx += 1;
    if (up.isDown)    dy -= 1;
    if (down.isDown)  dy += 1;

    return {
      dx,
      dy,
      fire: JustDown(fire),
      pass: JustDown(pass),
    };
  }
}
