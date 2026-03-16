// ============================================================
// Speedball 2: Brutal Deluxe — Menu UI Components
// ============================================================

import Phaser from 'phaser';

const TEXT_COLOR_NORMAL   = '#ffffff';
const TEXT_COLOR_SELECTED = '#f59e0b';

// ------ Factory helpers --------------------------------------------------

/**
 * Creates a centered white monospace text object.
 * @param scene  The Phaser scene to add the text to
 * @param x      World X position
 * @param y      World Y position
 * @param text   The string to display
 * @param size   Font size in pixels (default 8)
 */
export function createMenuText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number = 24,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontSize: `${size}px`,
    color: TEXT_COLOR_NORMAL,
    fontFamily: 'monospace',
  }).setOrigin(0.5);
}

/**
 * Creates an interactive menu item that changes colour on pointer hover.
 * @param scene    The Phaser scene to add the item to
 * @param x        World X position
 * @param y        World Y position
 * @param text     The label string
 * @param callback Function called when the item is activated
 */
export function createMenuItem(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  callback: () => void,
): Phaser.GameObjects.Text {
  const item = scene.add.text(x, y, text, {
    fontSize: '30px',
    color: TEXT_COLOR_NORMAL,
    fontFamily: 'monospace',
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  item.setData('label', text);

  item.on('pointerover',  () => item.setStyle({ color: TEXT_COLOR_SELECTED }));
  item.on('pointerout',   () => item.setStyle({ color: TEXT_COLOR_NORMAL }));
  item.on('pointerdown',  () => callback());

  return item;
}

// ------ MenuSelector -----------------------------------------------------

/**
 * Keyboard-navigable menu selector.
 *
 * - Up / Down arrows move the selection.
 * - Z or Space activates the selected item.
 * - The selected item is displayed as  `> LABEL <`  in amber.
 */
export class MenuSelector {
  private items:     Phaser.GameObjects.Text[];
  private callbacks: Array<() => void>;
  private index:     number = 0;
  private cursors:   Phaser.Types.Input.Keyboard.CursorKeys;
  private keyZ:      Phaser.Input.Keyboard.Key;
  private keySpace:  Phaser.Input.Keyboard.Key;
  private keyEnter:  Phaser.Input.Keyboard.Key;

  // Debounce flags – prevent holding a key from firing continuously
  // selectWasDown starts true so a held key from the previous menu doesn't
  // immediately trigger on the first frame of a newly created MenuSelector.
  private upWasDown    = false;
  private downWasDown  = false;
  private selectWasDown = true;

  constructor(
    scene: Phaser.Scene,
    items: Phaser.GameObjects.Text[],
    callbacks: Array<() => void>,
  ) {
    this.items     = items;
    this.callbacks = callbacks;

    if (!scene.input.keyboard) {
      throw new Error('MenuSelector requires a keyboard-enabled scene');
    }

    this.cursors  = scene.input.keyboard.createCursorKeys();
    this.keyZ     = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keySpace = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyEnter = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.highlight(this.index);
  }

  // ------ Public API -------------------------------------------------------

  update(): void {
    const upDown    = this.cursors.up.isDown;
    const downDown  = this.cursors.down.isDown;
    const selectDown = this.keyZ.isDown || this.keySpace.isDown || this.keyEnter.isDown;

    if (upDown && !this.upWasDown) {
      this.move(-1);
    }
    if (downDown && !this.downWasDown) {
      this.move(1);
    }
    if (selectDown && !this.selectWasDown) {
      this.activate();
    }

    this.upWasDown    = upDown;
    this.downWasDown  = downDown;
    this.selectWasDown = selectDown;
  }

  // ------ Private ----------------------------------------------------------

  private move(direction: -1 | 1): void {
    this.unhighlight(this.index);
    this.index = (this.index + direction + this.items.length) % this.items.length;
    this.highlight(this.index);
  }

  private activate(): void {
    this.callbacks[this.index]?.();
  }

  private highlight(i: number): void {
    const item  = this.items[i];
    const label = item.getData('label') as string;
    item.setText(`> ${label} <`);
    item.setStyle({ color: TEXT_COLOR_SELECTED });
  }

  private unhighlight(i: number): void {
    const item  = this.items[i];
    const label = item.getData('label') as string;
    item.setText(label);
    item.setStyle({ color: TEXT_COLOR_NORMAL });
  }
}
