# Sprite System Design — PNG-based Graphics

## Overview

Replace all procedurally generated textures with PNG sprite assets inspired by the original Amiga Speedball 2: Brutal Deluxe visual style. New pixel-art sprites are created at 48x48 resolution (matching existing physics bodies) using the original game as visual reference — same color palette, proportions, and metallic arena aesthetic.

## Sprite Files

All sprites go in `public/sprites/`:

| File | Size | Description |
|---|---|---|
| `player_home.png` | 384x384 | Home team spritesheet (8 cols x 8 rows) |
| `player_away.png` | 384x384 | Away team spritesheet (8 cols x 8 rows) |
| `ball.png` | 24x24 | Single frame ball |
| `floor_tile.png` | 48x48 | Metallic arena floor tile |
| `dome.png` | 48x48 | Bounce dome |
| `star.png` | 24x24 | Inactive bonus star |
| `star_active.png` | 24x24 | Active bonus star |
| `multiplier.png` | 48x48 | x2 multiplier pad |
| `warp.png` | 48x48 | Warp portal |
| `goal.png` | 288x48 | Goal mouth with net |
| `wall_tile.png` | 48x48 | Wall segment (tiled to fill) |

## Player Spritesheet Layout

Each player spritesheet is 384x384 pixels (8 columns x 8 rows, each frame 48x48).

**Columns — 8 directions (clockwise from North):**

| Col | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Dir | N | NE | E | SE | S | SW | W | NW |

**Rows — animation states:**

| Row | State | Frame count per direction | Notes |
|---|---|---|---|
| 0 | Idle | 1 | Standing still |
| 1 | Run frame 1 | 1 | Loop: rows 1-3 |
| 2 | Run frame 2 | 1 | Loop: rows 1-3 |
| 3 | Run frame 3 | 1 | Loop: rows 1-3 |
| 4 | Tackle | 1 | Lunge pose |
| 5 | Stunned | 1 | Knocked back |
| 6 | Injured | 1 | Down on ground |
| 7 | Shoot/Pass | 1 | Throwing motion |

**Total: 64 frames per spritesheet.**

## Direction Mapping

`Player.facingAngle` (radians, 0 = East, increases counter-clockwise) maps to a direction index 0-7:

```
function angleToDirIndex(angle: number): number {
  // Convert from math-angle (0=East, CCW) to compass (0=North, CW)
  // In Phaser/game: up is negative Y, so atan2(dy,dx) where:
  //   right = 0, down = PI/2, left = PI, up = -PI/2
  // We want: N=0, NE=1, E=2, SE=3, S=4, SW=5, W=6, NW=7

  // Shift so N (angle = -PI/2) maps to 0, then divide into 8 sectors
  const adjusted = angle + Math.PI / 2; // now N=0, E=PI/2, S=PI, W=3PI/2
  const normalized = ((adjusted % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor((normalized + Math.PI / 8) / (Math.PI / 4)) % 8;
}
```

## BootScene Changes

### Before (current)
```
preload() → createLoadingBar()
create()  → generateTextures() → scene.start('TitleScene')
```

### After
```
preload() → createLoadingBar() + loadSprites()
create()  → registerAnimations() → scene.start('TitleScene')
```

**`loadSprites()`** — loads all PNG assets:
```typescript
// Spritesheets (player animations)
this.load.spritesheet('player_home', 'sprites/player_home.png', { frameWidth: 48, frameHeight: 48 });
this.load.spritesheet('player_away', 'sprites/player_away.png', { frameWidth: 48, frameHeight: 48 });

// Single images (arena + ball)
this.load.image('ball', 'sprites/ball.png');
this.load.image('floor_tile', 'sprites/floor_tile.png');
this.load.image('dome', 'sprites/dome.png');
this.load.image('star', 'sprites/star.png');
this.load.image('star_active', 'sprites/star_active.png');
this.load.image('multiplier', 'sprites/multiplier.png');
this.load.image('warp', 'sprites/warp.png');
this.load.image('goal', 'sprites/goal.png');
this.load.image('wall_tile', 'sprites/wall_tile.png');
```

**`registerAnimations()`** — creates Phaser animation configs:
```typescript
for (const team of ['home', 'away']) {
  const key = `player_${team}`;
  for (let dir = 0; dir < 8; dir++) {
    // Run animation: rows 1-3, loop
    this.anims.create({
      key: `run_${team}_${dir}`,
      frames: [
        { key, frame: 8 + dir },   // row 1
        { key, frame: 16 + dir },  // row 2
        { key, frame: 24 + dir },  // row 3
      ],
      frameRate: 10,
      repeat: -1,
    });
  }
}
```

**`generateTextures()` and all `make*Texture()` methods are deleted entirely.**

## Player.ts Changes

### Constructor
- Texture key: `teamSide === TeamSide.HOME ? 'player_home' : 'player_away'`
- Remove `this.setTint(teamColor)` — color is baked into spritesheet
- Remove `teamColor` parameter

### New private property
```typescript
private teamKey: string; // 'home' | 'away' — used for animation key lookup
```

### New method — `updateAnimation()`
Called from `update()` after state/direction changes:

```typescript
private updateAnimation(): void {
  const dir = angleToDirIndex(this.facingAngle);
  const team = this.teamKey;

  switch (this.playerState) {
    case PlayerState.IDLE:
      this.stop();
      this.setFrame(dir); // row 0, col = dir
      break;
    case PlayerState.RUNNING:
      const animKey = `run_${team}_${dir}`;
      if (this.anims.currentAnim?.key !== animKey) {
        this.play(animKey);
      }
      break;
    case PlayerState.TACKLING:
      this.stop();
      this.setFrame(32 + dir); // row 4
      break;
    case PlayerState.STUNNED:
      this.stop();
      this.setFrame(40 + dir); // row 5
      break;
    case PlayerState.INJURED:
      this.stop();
      this.setFrame(48 + dir); // row 6
      break;
    case PlayerState.SHOOTING:
    case PlayerState.PASSING:
      this.stop();
      this.setFrame(56 + dir); // row 7
      break;
  }
}
```

## ArenaElements.ts Changes

### Walls
Replace dynamic `generateTexture()` walls with `TileSprite`:

```typescript
function addWall(x: number, y: number, w: number, h: number): void {
  const wall = scene.add.tileSprite(x + w / 2, y + h / 2, w, h, 'wall_tile');
  const physWall = scene.physics.add.staticImage(x + w / 2, y + h / 2);
  physWall.setSize(w, h);
  physWall.setImmovable(true);
  physWall.setVisible(false); // physics only, tileSprite handles rendering
  physWall.refreshBody();
  walls.add(physWall);
}
```

### Other elements
No code changes needed — `dome`, `star`, `star_active`, `multiplier`, `warp`, `goal` texture keys already match the loaded PNG filenames.

## Floor Rendering

The MatchScene currently tiles `floor_tile` across the arena using `scene.add.image()` in a grid loop. This continues to work unchanged since the texture key `floor_tile` is preserved.

Alternative: replace the grid loop with a single `scene.add.tileSprite(cx, cy, ARENA_WIDTH, ARENA_HEIGHT, 'floor_tile')` for better performance.

## Scope of Changes

### Files modified:
1. **`src/scenes/BootScene.ts`** — replace `generateTextures()` with `loadSprites()` + `registerAnimations()`
2. **`src/entities/Player.ts`** — add direction-based animation, remove tint
3. **`src/entities/ArenaElements.ts`** — walls use TileSprite

### Files unchanged:
- All game logic (`MatchEngine.ts`, `PhysicsManager.ts`, `AIController.ts`, `InputManager.ts`)
- All UI (`HUD.ts`, `MenuComponents.ts`, `LeagueTable.ts`)
- All types (`types.ts`)
- All scene flow (`TitleScene`, `ResultScene`, `FriendlyScene`, `LeagueScene`, `TeamMgmtScene`)
- Physics configuration (body sizes, collision, bounce)

### New files:
- `public/sprites/*.png` — 11 sprite image files

### Files with removed code:
- **`src/scenes/BootScene.ts`** — all `make*Texture()` methods deleted (~470 lines)

## Visual Style Reference

Sprites should capture the Amiga Speedball 2 aesthetic:
- Dark metallic blue/grey arena floor with grid pattern
- Red metallic walls with rivet details
- Cyan/teal dome bumpers with specular highlights
- Players in team colors with visible armor/padding
- Chrome/silver ball
- Yellow goal frames with dark net
- Glowing green warp portals
- Gold/amber stars
- Purple multiplier pads

All at 48x48 resolution (or 24x24 for ball/stars) — higher than the Amiga original (~16x21) but preserving the pixel-art aesthetic with clean, readable sprites.
