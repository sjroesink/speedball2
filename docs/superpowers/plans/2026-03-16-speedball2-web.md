# Speedball 2: Brutal Deluxe — Web Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a faithful web recreation of Speedball 2: Brutal Deluxe with Phaser 3

**Architecture:** Phaser 3 scene-based architecture with TypeScript. Core gameplay in MatchScene backed by MatchEngine, PhysicsManager, AIController, and InputManager systems. Pixel-art at 320x224 viewport, 320x480 arena with vertical scrolling.

**Tech Stack:** Phaser 3, TypeScript, Vite

**Spec:** `docs/superpowers/specs/2026-03-16-speedball2-web-design.md`

---

## Chunk 1: Project Scaffold & Core Types

### Task 1: Initialize project with Vite + Phaser 3

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`

- [ ] **Step 1: Initialize npm project and install dependencies**

Run:
```bash
cd D:/Projects/Speedball2
npm init -y
npm install phaser
npm install -D typescript vite
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
  },
});
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Speedball 2: Brutal Deluxe</title>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; }
    canvas { image-rendering: pixelated; image-rendering: crisp-edges; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.superpowers/
```

- [ ] **Step 6: Commit**

```bash
git init
git add package.json tsconfig.json vite.config.ts index.html .gitignore
git commit -m "chore: scaffold Vite + Phaser 3 project"
```

### Task 2: Core types and game config

**Files:**
- Create: `src/utils/types.ts`
- Create: `src/config/gameConfig.ts`
- Create: `src/config/teams.ts`

- [ ] **Step 1: Create src/utils/types.ts**

```ts
export enum TeamSide {
  HOME = 'home', // bottom goal
  AWAY = 'away', // top goal
}

export enum MatchState {
  KICKOFF = 'kickoff',
  PLAYING = 'playing',
  GOAL_SCORED = 'goal_scored',
  HALFTIME = 'halftime',
  MATCH_END = 'match_end',
}

export enum PlayerRole {
  GOALKEEPER = 'goalkeeper',
  DEFENDER = 'defender',
  MIDFIELDER = 'midfielder',
  FORWARD = 'forward',
}

export enum PlayerState {
  IDLE = 'idle',
  RUNNING = 'running',
  TACKLING = 'tackling',
  STUNNED = 'stunned',
  INJURED = 'injured',
  SHOOTING = 'shooting',
  PASSING = 'passing',
}

export enum AITeamState {
  ATTACKING = 'attacking',
  DEFENDING = 'defending',
  LOOSE_BALL = 'loose_ball',
}

export enum AIPlayerBehavior {
  SEEK_BALL = 'seek_ball',
  RUN_TO_POSITION = 'run_to_position',
  PASS = 'pass',
  SHOOT = 'shoot',
  TACKLE = 'tackle',
  MARK_OPPONENT = 'mark_opponent',
  GUARD_GOAL = 'guard_goal',
  COLLECT_STAR = 'collect_star',
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export interface PlayerStats {
  speed: number;   // 1-15
  strength: number; // 1-15
  defense: number;  // 1-15
}

export interface PlayerDef {
  name: string;
  number: number;
  role: PlayerRole;
  stats: PlayerStats;
}

export interface TeamDef {
  name: string;
  shortName: string;
  color: number; // hex color
  players: PlayerDef[];
}

export interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeTackles: number;
  awayTackles: number;
  homeGoals: number;
  awayGoals: number;
  mvp: string;
  creditsEarned: number;
}

export interface LeagueStanding {
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
}
```

- [ ] **Step 2: Create src/config/gameConfig.ts**

```ts
export const GAME_CONFIG = {
  // Viewport
  VIEWPORT_WIDTH: 320,
  VIEWPORT_HEIGHT: 224,
  SCALE_MODE: Phaser.Scale.FIT,

  // Arena
  ARENA_WIDTH: 320,
  ARENA_HEIGHT: 480,
  TILE_SIZE: 16,

  // Goals
  GOAL_WIDTH: 96,
  GOAL_Y_TOP: 16,
  GOAL_Y_BOTTOM: 448,

  // Timing
  HALF_DURATION: 90, // seconds
  INJURY_DURATION: 10, // seconds
  STUN_DURATION: 0.5, // seconds
  TACKLE_RECOVERY: 0.3, // seconds
  MULTIPLIER_RESPAWN: 10, // seconds

  // Scoring
  GOAL_POINTS: 10,
  TACKLE_POINTS: 2,
  STAR_BONUS_POINTS: 10,
  MULTIPLIER_FACTOR: 2,

  // Ball physics
  PASS_SPEED: 180,
  BALL_FRICTION: 30,
  WALL_RESTITUTION: 0.8,
  DOME_RESTITUTION: 0.9,
  DOME_ANGLE_VARIANCE: 15, // degrees
  BALL_PICKUP_RANGE: 12,

  // Player physics
  TACKLE_LUNGE_DISTANCE: 24,
  TACKLE_HIT_RADIUS: 20,
  KEEPER_RANGE: 48,
  KEEPER_SAVE_ZONE: 32,

  // Credits
  WIN_BONUS: 5000,
  DRAW_BONUS: 2000,
  SCORE_CREDIT_MULTIPLIER: 10,

  // Team management
  SPEED_TRAINING_COST: 10000,
  STRENGTH_TRAINING_COST: 10000,
  DEFENSE_TRAINING_COST: 10000,
  BUY_PLAYER_COST: 25000,
  STAT_CAP: 15,

  // AI difficulty
  DIFFICULTY: {
    easy: { reactionTime: 500, passAccuracy: 0.6, tackleAggression: 0.2, starAwareness: 0 },
    medium: { reactionTime: 250, passAccuracy: 0.8, tackleAggression: 0.5, starAwareness: 0.5 },
    hard: { reactionTime: 100, passAccuracy: 0.95, tackleAggression: 0.8, starAwareness: 1.0 },
  },
} as const;

// Stat formulas
export function getMaxSpeed(spd: number): number {
  return 60 + spd * 8;
}

export function getShotSpeed(str: number): number {
  return 150 + str * 10;
}

export function getTackleSuccessChance(attackerStr: number, targetDef: number): number {
  return attackerStr / (attackerStr + targetDef);
}

export function getInjuryChance(targetDef: number): number {
  return Math.max(0.05, 0.3 - targetDef * 0.015);
}

export function getKeeperSaveChance(keeperDef: number): number {
  return 0.4 + keeperDef * 0.03;
}

export function getCreditsEarned(score: number, won: boolean, drawn: boolean): number {
  const base = score * GAME_CONFIG.SCORE_CREDIT_MULTIPLIER;
  if (won) return base + GAME_CONFIG.WIN_BONUS;
  if (drawn) return base + GAME_CONFIG.DRAW_BONUS;
  return base;
}
```

- [ ] **Step 3: Create src/config/teams.ts**

```ts
import { PlayerDef, PlayerRole, TeamDef } from '../utils/types';

function generateRoster(avgSpd: number, avgStr: number, avgDef: number): PlayerDef[] {
  const roles: { role: PlayerRole; name: string; number: number }[] = [
    { role: PlayerRole.GOALKEEPER, name: 'Keeper', number: 1 },
    { role: PlayerRole.DEFENDER, name: 'Def L', number: 2 },
    { role: PlayerRole.DEFENDER, name: 'Def R', number: 3 },
    { role: PlayerRole.MIDFIELDER, name: 'Mid L', number: 4 },
    { role: PlayerRole.MIDFIELDER, name: 'Mid R', number: 5 },
    { role: PlayerRole.FORWARD, name: 'Fwd', number: 6 },
    // Bench
    { role: PlayerRole.DEFENDER, name: 'Sub D', number: 7 },
    { role: PlayerRole.MIDFIELDER, name: 'Sub M', number: 8 },
    { role: PlayerRole.FORWARD, name: 'Sub F', number: 9 },
  ];

  return roles.map((r) => ({
    name: r.name,
    number: r.number,
    role: r.role,
    stats: {
      speed: clampStat(avgSpd + randVariance()),
      strength: clampStat(avgStr + randVariance()),
      defense: clampStat(avgDef + randVariance()),
    },
  }));
}

function clampStat(val: number): number {
  return Math.max(1, Math.min(15, Math.round(val)));
}

function randVariance(): number {
  return Math.floor(Math.random() * 5) - 2; // -2 to +2
}

export const TEAMS: TeamDef[] = [
  { name: 'Brutal Deluxe', shortName: 'BDX', color: 0x3b82f6, players: generateRoster(4, 4, 4) },
  { name: 'Revengers', shortName: 'REV', color: 0xef4444, players: generateRoster(5, 6, 5) },
  { name: 'Mean Machines', shortName: 'MMC', color: 0x10b981, players: generateRoster(6, 5, 6) },
  { name: 'Iron Fist', shortName: 'IFT', color: 0xf59e0b, players: generateRoster(7, 6, 6) },
  { name: 'Steel Fury', shortName: 'SFY', color: 0x8b5cf6, players: generateRoster(7, 7, 7) },
  { name: 'Lethal Zone', shortName: 'LTZ', color: 0x06b6d4, players: generateRoster(8, 7, 8) },
  { name: 'Titanium Dogs', shortName: 'TDG', color: 0xec4899, players: generateRoster(8, 9, 8) },
  { name: 'Super Nashwan', shortName: 'SNW', color: 0xffffff, players: generateRoster(9, 9, 9) },
];
```

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: add core types, game config, and team definitions"
```

### Task 3: Phaser entry point + BootScene

**Files:**
- Create: `src/main.ts`
- Create: `src/scenes/BootScene.ts`

- [ ] **Step 1: Create src/main.ts**

```ts
import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { MatchScene } from './scenes/MatchScene';
import { ResultScene } from './scenes/ResultScene';
import { FriendlyScene } from './scenes/FriendlyScene';
import { LeagueScene } from './scenes/LeagueScene';
import { TeamMgmtScene } from './scenes/TeamMgmtScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.VIEWPORT_WIDTH,
  height: GAME_CONFIG.VIEWPORT_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, FriendlyScene, LeagueScene, TeamMgmtScene, MatchScene, ResultScene],
};

new Phaser.Game(config);
```

- [ ] **Step 2: Create src/scenes/BootScene.ts**

```ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const barW = 200;
    const barH = 16;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    const bg = this.add.rectangle(width / 2, barY, barW, barH, 0x333333);
    const bar = this.add.rectangle(barX + 2, barY, 0, barH - 4, 0x3b82f6);
    bar.setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      bar.width = (barW - 4) * value;
    });

    const title = this.add.text(width / 2, barY - 30, 'LOADING...', {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    title.setOrigin(0.5);

    // Generate placeholder assets
    this.generatePlaceholderAssets();
  }

  create(): void {
    this.scene.start('TitleScene');
  }

  private generatePlaceholderAssets(): void {
    // Player sprite (16x16, simple colored square with direction indicator)
    const playerCanvas = this.textures.createCanvas('player', 16, 16);
    if (playerCanvas) {
      const ctx = playerCanvas.getContext();
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 2, 4, 4); // direction indicator (top)
      playerCanvas.refresh();
    }

    // Ball (8x8)
    const ballCanvas = this.textures.createCanvas('ball', 8, 8);
    if (ballCanvas) {
      const ctx = ballCanvas.getContext();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4, 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ballCanvas.refresh();
    }

    // Arena floor tile (16x16)
    const tileCanvas = this.textures.createCanvas('floor_tile', 16, 16);
    if (tileCanvas) {
      const ctx = tileCanvas.getContext();
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, 16, 16);
      ctx.strokeStyle = '#252540';
      ctx.strokeRect(0, 0, 16, 16);
      tileCanvas.refresh();
    }

    // Bounce dome (16x16)
    const domeCanvas = this.textures.createCanvas('dome', 16, 16);
    if (domeCanvas) {
      const ctx = domeCanvas.getContext();
      ctx.fillStyle = '#4a6fa5';
      ctx.beginPath();
      ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.fill();
      domeCanvas.refresh();
    }

    // Star (8x8)
    const starCanvas = this.textures.createCanvas('star', 8, 8);
    if (starCanvas) {
      const ctx = starCanvas.getContext();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(4, 4, 3, 0, Math.PI * 2);
      ctx.fill();
      starCanvas.refresh();
    }

    // Star active
    const starActiveCanvas = this.textures.createCanvas('star_active', 8, 8);
    if (starActiveCanvas) {
      const ctx = starActiveCanvas.getContext();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(4, 4, 4, 0, Math.PI * 2);
      ctx.fill();
      starActiveCanvas.refresh();
    }

    // Multiplier (16x16)
    const multCanvas = this.textures.createCanvas('multiplier', 16, 16);
    if (multCanvas) {
      const ctx = multCanvas.getContext();
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText('x2', 2, 12);
      multCanvas.refresh();
    }

    // Warp (16x16)
    const warpCanvas = this.textures.createCanvas('warp', 16, 16);
    if (warpCanvas) {
      const ctx = warpCanvas.getContext();
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(8, 8, 3, 0, Math.PI * 2);
      ctx.fill();
      warpCanvas.refresh();
    }

    // Goal zone (96x16)
    const goalCanvas = this.textures.createCanvas('goal', 96, 16);
    if (goalCanvas) {
      const ctx = goalCanvas.getContext();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 0, 96, 16);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 94, 14);
      goalCanvas.refresh();
    }

    // Wall horizontal (320x16)
    const wallHCanvas = this.textures.createCanvas('wall_h', 320, 16);
    if (wallHCanvas) {
      const ctx = wallHCanvas.getContext();
      ctx.fillStyle = '#4a6fa5';
      ctx.fillRect(0, 0, 320, 16);
      wallHCanvas.refresh();
    }

    // Wall vertical (16x480)
    const wallVCanvas = this.textures.createCanvas('wall_v', 16, 480);
    if (wallVCanvas) {
      const ctx = wallVCanvas.getContext();
      ctx.fillStyle = '#4a6fa5';
      ctx.fillRect(0, 0, 16, 480);
      wallVCanvas.refresh();
    }
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`

Note: This will fail because scene files don't exist yet. That's expected — we'll create stubs next.

- [ ] **Step 4: Create stub scenes so main.ts compiles**

Create minimal stubs for all imported scenes:

`src/scenes/TitleScene.ts`:
```ts
import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'TitleScene' }); }
  create(): void {}
}
```

`src/scenes/MatchScene.ts`:
```ts
import Phaser from 'phaser';

export class MatchScene extends Phaser.Scene {
  constructor() { super({ key: 'MatchScene' }); }
  create(): void {}
}
```

`src/scenes/ResultScene.ts`:
```ts
import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
  constructor() { super({ key: 'ResultScene' }); }
  create(): void {}
}
```

`src/scenes/FriendlyScene.ts`:
```ts
import Phaser from 'phaser';

export class FriendlyScene extends Phaser.Scene {
  constructor() { super({ key: 'FriendlyScene' }); }
  create(): void {}
}
```

`src/scenes/LeagueScene.ts`:
```ts
import Phaser from 'phaser';

export class LeagueScene extends Phaser.Scene {
  constructor() { super({ key: 'LeagueScene' }); }
  create(): void {}
}
```

`src/scenes/TeamMgmtScene.ts`:
```ts
import Phaser from 'phaser';

export class TeamMgmtScene extends Phaser.Scene {
  constructor() { super({ key: 'TeamMgmtScene' }); }
  create(): void {}
}
```

- [ ] **Step 5: Verify compilation and dev server**

Run: `npx vite --open`
Expected: Black screen, no errors in console. Boot scene runs and transitions to empty TitleScene.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Phaser entry point, BootScene with placeholder assets, stub scenes"
```

---

## Chunk 2: Title Scene & Menu UI

### Task 4: Title scene with main menu

**Files:**
- Create: `src/ui/MenuComponents.ts`
- Modify: `src/scenes/TitleScene.ts`

- [ ] **Step 1: Create src/ui/MenuComponents.ts**

```ts
import Phaser from 'phaser';

export function createMenuText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number = 8,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontSize: `${size}px`,
    color: '#ffffff',
    fontFamily: 'monospace',
  }).setOrigin(0.5);
}

export function createMenuItem(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  callback: () => void,
): Phaser.GameObjects.Text {
  const item = createMenuText(scene, x, y, text, 10);
  item.setInteractive({ useHandCursor: true });
  item.on('pointerover', () => item.setColor('#f59e0b'));
  item.on('pointerout', () => item.setColor('#ffffff'));
  item.on('pointerdown', callback);
  return item;
}

export class MenuSelector {
  private scene: Phaser.Scene;
  private items: Phaser.GameObjects.Text[];
  private selectedIndex: number = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private callbacks: (() => void)[];

  constructor(scene: Phaser.Scene, items: Phaser.GameObjects.Text[], callbacks: (() => void)[]) {
    this.scene = scene;
    this.items = items;
    this.callbacks = callbacks;
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.fireKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.updateHighlight();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
      this.updateHighlight();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      this.updateHighlight();
    }
    if (Phaser.Input.Keyboard.JustDown(this.fireKey) || Phaser.Input.Keyboard.JustDown(this.cursors.space!)) {
      this.callbacks[this.selectedIndex]();
    }
  }

  private updateHighlight(): void {
    this.items.forEach((item, i) => {
      item.setColor(i === this.selectedIndex ? '#f59e0b' : '#ffffff');
      item.setText(i === this.selectedIndex ? `> ${item.getData('label')} <` : item.getData('label'));
    });
  }
}
```

- [ ] **Step 2: Implement TitleScene**

```ts
import Phaser from 'phaser';
import { createMenuText, MenuSelector } from '../ui/MenuComponents';

export class TitleScene extends Phaser.Scene {
  private menuSelector!: MenuSelector;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const cx = this.cameras.main.centerX;

    // Title
    createMenuText(this, cx, 40, 'SPEEDBALL 2', 16);
    createMenuText(this, cx, 60, 'BRUTAL DELUXE', 10);

    // Menu items
    const league = createMenuText(this, cx, 110, 'LEAGUE', 10).setData('label', 'LEAGUE');
    const friendly = createMenuText(this, cx, 130, 'FRIENDLY', 10).setData('label', 'FRIENDLY');
    const options = createMenuText(this, cx, 150, 'OPTIONS', 10).setData('label', 'OPTIONS');

    this.menuSelector = new MenuSelector(this, [league, friendly, options], [
      () => this.scene.start('LeagueScene'),
      () => this.scene.start('FriendlyScene'),
      () => {}, // Options - placeholder
    ]);
  }

  update(): void {
    this.menuSelector.update();
  }
}
```

- [ ] **Step 3: Verify in browser**

Run: `npx vite`
Expected: Title screen with "SPEEDBALL 2 / BRUTAL DELUXE" and navigable menu using arrow keys + Z.

- [ ] **Step 4: Commit**

```bash
git add src/ui/MenuComponents.ts src/scenes/TitleScene.ts
git commit -m "feat: add title scene with keyboard-navigable menu"
```

---

## Chunk 3: Core Entities — Ball & Player

### Task 5: Ball entity

**Files:**
- Create: `src/entities/Ball.ts`

- [ ] **Step 1: Create src/entities/Ball.ts**

```ts
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { TeamSide } from '../utils/types';

export class Ball extends Phaser.Physics.Arcade.Sprite {
  public owner: Phaser.Physics.Arcade.Sprite | null = null;
  public lastTouchedBy: TeamSide | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'ball');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(false); // We handle walls manually
    this.setBounce(GAME_CONFIG.WALL_RESTITUTION);
    this.setDrag(GAME_CONFIG.BALL_FRICTION);
    this.setDamping(false);
    this.setCircle(3); // 8x8 texture, 3px radius hitbox
  }

  attachTo(sprite: Phaser.Physics.Arcade.Sprite, side: TeamSide): void {
    this.owner = sprite;
    this.lastTouchedBy = side;
    this.setVelocity(0, 0);
  }

  release(): void {
    this.owner = null;
  }

  isLoose(): boolean {
    return this.owner === null;
  }

  followOwner(): void {
    if (this.owner) {
      // Ball sits in front of the owner based on their facing direction
      this.setPosition(this.owner.x, this.owner.y);
    }
  }

  applyFriction(delta: number): void {
    if (!this.isLoose()) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = body.velocity.length();
    if (speed > 0) {
      const reduction = GAME_CONFIG.BALL_FRICTION * (delta / 1000);
      const newSpeed = Math.max(0, speed - reduction);
      body.velocity.normalize().scale(newSpeed);
    }
  }

  update(_time: number, delta: number): void {
    if (this.owner) {
      this.followOwner();
    } else {
      this.applyFriction(delta);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/Ball.ts
git commit -m "feat: add Ball entity with ownership and friction"
```

### Task 6: Player entity

**Files:**
- Create: `src/entities/Player.ts`

- [ ] **Step 1: Create src/entities/Player.ts**

```ts
import Phaser from 'phaser';
import { GAME_CONFIG, getMaxSpeed, getShotSpeed } from '../config/gameConfig';
import { PlayerDef, PlayerRole, PlayerState, TeamSide } from '../utils/types';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public playerDef: PlayerDef;
  public teamSide: TeamSide;
  public playerState: PlayerState = PlayerState.IDLE;
  public isControlledByHuman: boolean = false;
  public hasBall: boolean = false;

  private stateTimer: number = 0;
  private injuryTimer: number = 0;
  private maxSpeed: number;
  public facingAngle: number = 0; // radians

  // Formation home position (for AI positioning)
  public homeX: number = 0;
  public homeY: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerDef: PlayerDef,
    teamSide: TeamSide,
    teamColor: number,
  ) {
    super(scene, x, y, 'player');
    this.playerDef = playerDef;
    this.teamSide = teamSide;
    this.maxSpeed = getMaxSpeed(playerDef.stats.speed);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setTint(teamColor);
    this.setCircle(6, 2, 2); // 16x16 texture, 6px radius hitbox centered
    this.setCollideWorldBounds(false);

    this.homeX = x;
    this.homeY = y;
  }

  get isGoalkeeper(): boolean {
    return this.playerDef.role === PlayerRole.GOALKEEPER;
  }

  get isActive(): boolean {
    return this.playerState !== PlayerState.INJURED;
  }

  get canAct(): boolean {
    return this.playerState === PlayerState.IDLE || this.playerState === PlayerState.RUNNING;
  }

  moveInDirection(dx: number, dy: number): void {
    if (!this.canAct) return;

    if (dx === 0 && dy === 0) {
      this.setVelocity(0, 0);
      this.playerState = PlayerState.IDLE;
      return;
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    this.setVelocity(
      (dx / len) * this.maxSpeed,
      (dy / len) * this.maxSpeed,
    );
    this.facingAngle = Math.atan2(dy, dx);
    this.playerState = PlayerState.RUNNING;
  }

  tackle(): boolean {
    if (!this.canAct || this.hasBall) return false;

    this.playerState = PlayerState.TACKLING;
    this.stateTimer = GAME_CONFIG.TACKLE_RECOVERY;

    // Lunge in facing direction
    const lungeX = Math.cos(this.facingAngle) * GAME_CONFIG.TACKLE_LUNGE_DISTANCE;
    const lungeY = Math.sin(this.facingAngle) * GAME_CONFIG.TACKLE_LUNGE_DISTANCE;
    this.setVelocity(lungeX * 4, lungeY * 4); // Quick burst

    return true;
  }

  stun(): void {
    this.playerState = PlayerState.STUNNED;
    this.stateTimer = GAME_CONFIG.STUN_DURATION;
    this.setVelocity(0, 0);
  }

  injure(): void {
    this.playerState = PlayerState.INJURED;
    this.injuryTimer = GAME_CONFIG.INJURY_DURATION;
    this.setVelocity(0, 0);
    this.setAlpha(0.3);
    this.setActive(false);
  }

  getShotSpeed(): number {
    return getShotSpeed(this.playerDef.stats.strength);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // State timers
    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.stateTimer = 0;
        if (this.playerState === PlayerState.TACKLING || this.playerState === PlayerState.STUNNED) {
          this.playerState = PlayerState.IDLE;
          this.setVelocity(0, 0);
        }
      }
    }

    // Injury timer
    if (this.playerState === PlayerState.INJURED) {
      this.injuryTimer -= dt;
      if (this.injuryTimer <= 0) {
        this.playerState = PlayerState.IDLE;
        this.setAlpha(1);
        this.setActive(true);
        // Return to home position
        this.setPosition(this.homeX, this.homeY);
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/Player.ts
git commit -m "feat: add Player entity with stats, states, tackling, and injury"
```

### Task 7: Arena elements

**Files:**
- Create: `src/entities/ArenaElements.ts`

- [ ] **Step 1: Create src/entities/ArenaElements.ts**

```ts
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { TeamSide } from '../utils/types';

export interface ArenaLayout {
  walls: Phaser.Physics.Arcade.StaticGroup;
  domes: Phaser.Physics.Arcade.StaticGroup;
  stars: StarElement[];
  multipliers: MultiplierElement[];
  warps: WarpPair[];
  goals: { top: Phaser.Physics.Arcade.StaticImage; bottom: Phaser.Physics.Arcade.StaticImage };
}

export class StarElement {
  public sprite: Phaser.Physics.Arcade.StaticImage;
  public activated: boolean = false;
  public side: 'top' | 'bottom';
  public activatedBy: TeamSide | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, side: 'top' | 'bottom') {
    this.sprite = scene.physics.add.staticImage(x, y, 'star');
    this.side = side;
  }

  activate(team: TeamSide): void {
    this.activated = true;
    this.activatedBy = team;
    this.sprite.setTexture('star_active');
  }

  reset(): void {
    this.activated = false;
    this.activatedBy = null;
    this.sprite.setTexture('star');
  }
}

export class MultiplierElement {
  public sprite: Phaser.Physics.Arcade.StaticImage;
  public activeForTeam: TeamSide | null = null;
  public respawnTimer: number = 0;
  public side: 'top' | 'bottom';

  constructor(scene: Phaser.Scene, x: number, y: number, side: 'top' | 'bottom') {
    this.sprite = scene.physics.add.staticImage(x, y, 'multiplier');
    this.side = side;
  }

  activate(team: TeamSide): void {
    this.activeForTeam = team;
    this.sprite.setAlpha(0.3);
  }

  deactivate(): void {
    this.activeForTeam = null;
    this.respawnTimer = GAME_CONFIG.MULTIPLIER_RESPAWN;
    this.sprite.setAlpha(0);
  }

  update(delta: number): void {
    if (this.respawnTimer > 0) {
      this.respawnTimer -= delta / 1000;
      if (this.respawnTimer <= 0) {
        this.respawnTimer = 0;
        this.sprite.setAlpha(1);
      }
    }
  }

  isAvailable(): boolean {
    return this.activeForTeam === null && this.respawnTimer <= 0;
  }
}

export class WarpPair {
  public left: Phaser.Physics.Arcade.StaticImage;
  public right: Phaser.Physics.Arcade.StaticImage;

  constructor(scene: Phaser.Scene, y: number) {
    this.left = scene.physics.add.staticImage(24, y, 'warp');
    this.right = scene.physics.add.staticImage(296, y, 'warp');
  }
}

export function createArena(scene: Phaser.Scene): ArenaLayout {
  const W = GAME_CONFIG.ARENA_WIDTH;
  const H = GAME_CONFIG.ARENA_HEIGHT;

  // Walls
  const walls = scene.physics.add.staticGroup();
  // Top wall
  walls.add(scene.add.rectangle(W / 2, 8, W, 16, 0x4a6fa5).setOrigin(0.5));
  // Bottom wall
  walls.add(scene.add.rectangle(W / 2, H - 8, W, 16, 0x4a6fa5).setOrigin(0.5));
  // Left wall
  walls.add(scene.add.rectangle(8, H / 2, 16, H, 0x4a6fa5).setOrigin(0.5));
  // Right wall
  walls.add(scene.add.rectangle(W - 8, H / 2, 16, H, 0x4a6fa5).setOrigin(0.5));

  // Enable physics on wall rectangles
  walls.children.iterate((child) => {
    scene.physics.add.existing(child as Phaser.GameObjects.GameObject, true);
    return true;
  });

  // Goals
  const goalTop = scene.physics.add.staticImage(W / 2, 24, 'goal');
  const goalBottom = scene.physics.add.staticImage(W / 2, H - 24, 'goal');

  // Bounce domes (8 total, symmetrical)
  const domes = scene.physics.add.staticGroup();
  const domePositions = [
    // Top half
    { x: 96, y: 48 }, { x: 224, y: 48 },
    { x: 112, y: 80 }, { x: 208, y: 80 },
    // Center
    { x: 96, y: 224 }, { x: 224, y: 224 },
    // Bottom half (mirrored)
    { x: 112, y: 400 }, { x: 208, y: 400 },
  ];
  domePositions.forEach((pos) => {
    const dome = scene.physics.add.staticImage(pos.x, pos.y, 'dome');
    dome.setCircle(8);
    domes.add(dome);
  });

  // Stars (5 per side)
  const starPositions = {
    top: [
      { x: 40, y: 48 }, { x: 40, y: 64 }, { x: 40, y: 96 },
      { x: 280, y: 48 }, { x: 280, y: 64 },
    ],
    bottom: [
      { x: 40, y: 384 }, { x: 40, y: 416 }, { x: 40, y: 432 },
      { x: 280, y: 416 }, { x: 280, y: 384 },
    ],
  };

  const stars: StarElement[] = [];
  starPositions.top.forEach((pos) => stars.push(new StarElement(scene, pos.x, pos.y, 'top')));
  starPositions.bottom.forEach((pos) => stars.push(new StarElement(scene, pos.x, pos.y, 'bottom')));

  // Multipliers
  const multipliers: MultiplierElement[] = [
    new MultiplierElement(scene, W / 2, 64, 'top'),
    new MultiplierElement(scene, W / 2, H - 64, 'bottom'),
  ];

  // Warps
  const warps: WarpPair[] = [
    new WarpPair(scene, 112),
    new WarpPair(scene, 368),
  ];

  return {
    walls,
    domes,
    stars,
    multipliers,
    warps,
    goals: { top: goalTop, bottom: goalBottom },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/ArenaElements.ts
git commit -m "feat: add arena elements - walls, domes, stars, multipliers, warps"
```

---

## Chunk 4: Input & Match Systems

### Task 8: Input manager

**Files:**
- Create: `src/systems/InputManager.ts`

- [ ] **Step 1: Create src/systems/InputManager.ts**

```ts
import Phaser from 'phaser';

export interface PlayerInput {
  dx: number; // -1, 0, 1
  dy: number; // -1, 0, 1
  fire: boolean;  // just pressed
  pass: boolean;  // just pressed
}

export class InputManager {
  private scene: Phaser.Scene;

  // P1 keys
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private p1Fire!: Phaser.Input.Keyboard.Key;
  private p1Pass!: Phaser.Input.Keyboard.Key;

  // P2 keys
  private p2Up!: Phaser.Input.Keyboard.Key;
  private p2Down!: Phaser.Input.Keyboard.Key;
  private p2Left!: Phaser.Input.Keyboard.Key;
  private p2Right!: Phaser.Input.Keyboard.Key;
  private p2Fire!: Phaser.Input.Keyboard.Key;
  private p2Pass!: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;

    this.cursors = kb.createCursorKeys();
    this.p1Fire = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.p1Pass = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    this.p2Up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.p2Down = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.p2Left = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.p2Right = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.p2Fire = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.p2Pass = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  getP1Input(): PlayerInput {
    let dx = 0;
    let dy = 0;
    if (this.cursors.left?.isDown) dx -= 1;
    if (this.cursors.right?.isDown) dx += 1;
    if (this.cursors.up?.isDown) dy -= 1;
    if (this.cursors.down?.isDown) dy += 1;

    return {
      dx,
      dy,
      fire: Phaser.Input.Keyboard.JustDown(this.p1Fire),
      pass: Phaser.Input.Keyboard.JustDown(this.p1Pass),
    };
  }

  getP2Input(): PlayerInput {
    let dx = 0;
    let dy = 0;
    if (this.p2Left.isDown) dx -= 1;
    if (this.p2Right.isDown) dx += 1;
    if (this.p2Up.isDown) dy -= 1;
    if (this.p2Down.isDown) dy += 1;

    return {
      dx,
      dy,
      fire: Phaser.Input.Keyboard.JustDown(this.p2Fire),
      pass: Phaser.Input.Keyboard.JustDown(this.p2Pass),
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/InputManager.ts
git commit -m "feat: add InputManager for P1/P2 keyboard controls"
```

### Task 9: Match engine

**Files:**
- Create: `src/systems/MatchEngine.ts`

- [ ] **Step 1: Create src/systems/MatchEngine.ts**

```ts
import { GAME_CONFIG, getCreditsEarned, getInjuryChance, getTackleSuccessChance } from '../config/gameConfig';
import { MatchResult, MatchState, TeamSide } from '../utils/types';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { StarElement, MultiplierElement } from '../entities/ArenaElements';

export interface TeamMatchData {
  side: TeamSide;
  score: number;
  goals: number;
  tackles: number;
  starsActivated: { top: number; bottom: number };
  hasMultiplier: boolean;
  players: Player[];
  controlledPlayerIndex: number;
}

export class MatchEngine {
  public state: MatchState = MatchState.KICKOFF;
  public half: number = 1;
  public timer: number = GAME_CONFIG.HALF_DURATION;
  public homeTeam!: TeamMatchData;
  public awayTeam!: TeamMatchData;

  private stateTimer: number = 0;
  private kickoffTeam: TeamSide = TeamSide.HOME;

  initTeams(homePlayers: Player[], awayPlayers: Player[]): void {
    this.homeTeam = {
      side: TeamSide.HOME,
      score: 0,
      goals: 0,
      tackles: 0,
      starsActivated: { top: 0, bottom: 0 },
      hasMultiplier: false,
      players: homePlayers,
      controlledPlayerIndex: 4, // forward
    };
    this.awayTeam = {
      side: TeamSide.AWAY,
      score: 0,
      goals: 0,
      tackles: 0,
      starsActivated: { top: 0, bottom: 0 },
      hasMultiplier: false,
      players: awayPlayers,
      controlledPlayerIndex: 4,
    };
  }

  getTeam(side: TeamSide): TeamMatchData {
    return side === TeamSide.HOME ? this.homeTeam : this.awayTeam;
  }

  getOpponentTeam(side: TeamSide): TeamMatchData {
    return side === TeamSide.HOME ? this.awayTeam : this.homeTeam;
  }

  getControlledPlayer(team: TeamMatchData): Player {
    return team.players[team.controlledPlayerIndex];
  }

  switchControlledPlayer(team: TeamMatchData, ball: Ball): void {
    // Switch to the player nearest to the ball
    let nearestIdx = 0;
    let nearestDist = Infinity;
    team.players.forEach((p, i) => {
      if (!p.isActive || p.isGoalkeeper) return;
      const dist = Phaser.Math.Distance.Between(p.x, p.y, ball.x, ball.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    });
    team.controlledPlayerIndex = nearestIdx;
  }

  scoreGoal(scoringTeam: TeamSide, multipliers: MultiplierElement[]): void {
    const team = this.getTeam(scoringTeam);
    let points = GAME_CONFIG.GOAL_POINTS;

    // Check multiplier
    if (team.hasMultiplier) {
      points *= GAME_CONFIG.MULTIPLIER_FACTOR;
      team.hasMultiplier = false;
      // Deactivate the multiplier element
      multipliers.forEach((m) => {
        if (m.activeForTeam === scoringTeam) {
          m.deactivate();
        }
      });
    }

    team.score += points;
    team.goals += 1;

    // Set up kickoff for opponent
    this.kickoffTeam = scoringTeam === TeamSide.HOME ? TeamSide.AWAY : TeamSide.HOME;
    this.state = MatchState.GOAL_SCORED;
    this.stateTimer = 2; // 2 second pause
  }

  scoreTackle(tacklingTeam: TeamSide): void {
    const team = this.getTeam(tacklingTeam);
    team.score += GAME_CONFIG.TACKLE_POINTS;
    team.tackles += 1;
  }

  tryTackle(attacker: Player, target: Player, ball: Ball): boolean {
    const chance = getTackleSuccessChance(attacker.playerDef.stats.strength, target.playerDef.stats.defense);
    const success = Math.random() < chance;

    if (success && target.hasBall) {
      // Ball drops loose
      ball.release();
      target.hasBall = false;
      target.stun();

      this.scoreTackle(attacker.teamSide);

      // Injury check
      const injuryChance = getInjuryChance(target.playerDef.stats.defense);
      if (Math.random() < injuryChance) {
        target.injure();
      }
      return true;
    }
    return false;
  }

  activateStar(star: StarElement, team: TeamSide, allStars: StarElement[]): void {
    star.activate(team);

    // Check if all 5 on that side are activated by the same team
    const sideStars = allStars.filter((s) => s.side === star.side);
    const allActivated = sideStars.every((s) => s.activated && s.activatedBy === team);

    if (allActivated) {
      this.getTeam(team).score += GAME_CONFIG.STAR_BONUS_POINTS;
      sideStars.forEach((s) => s.reset());
    }
  }

  activateMultiplier(mult: MultiplierElement, team: TeamSide): void {
    if (mult.isAvailable()) {
      mult.activate(team);
      this.getTeam(team).hasMultiplier = true;
    }
  }

  update(delta: number): void {
    const dt = delta / 1000;

    if (this.state === MatchState.GOAL_SCORED) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = MatchState.KICKOFF;
      }
      return;
    }

    if (this.state === MatchState.PLAYING) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 0;
        if (this.half === 1) {
          this.half = 2;
          this.timer = GAME_CONFIG.HALF_DURATION;
          this.state = MatchState.HALFTIME;
          this.stateTimer = 3; // 3 second halftime pause
        } else {
          this.state = MatchState.MATCH_END;
        }
      }
    }

    if (this.state === MatchState.HALFTIME) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.kickoffTeam = TeamSide.AWAY;
        this.state = MatchState.KICKOFF;
      }
    }
  }

  getKickoffTeam(): TeamSide {
    return this.kickoffTeam;
  }

  startPlay(): void {
    this.state = MatchState.PLAYING;
  }

  getResult(playerTeam: TeamSide): MatchResult {
    const home = this.homeTeam;
    const away = this.awayTeam;
    const playerData = this.getTeam(playerTeam);
    const won = playerData.score > this.getOpponentTeam(playerTeam).score;
    const drawn = home.score === away.score;

    // Find MVP (highest scoring player approximation — most tackles)
    let mvpName = 'Unknown';
    let mvpScore = 0;
    [...home.players, ...away.players].forEach((p) => {
      const score = p.playerDef.stats.strength + p.playerDef.stats.speed;
      if (score > mvpScore) {
        mvpScore = score;
        mvpName = p.playerDef.name;
      }
    });

    return {
      homeTeam: 'Home',
      awayTeam: 'Away',
      homeScore: home.score,
      awayScore: away.score,
      homeTackles: home.tackles,
      awayTackles: away.tackles,
      homeGoals: home.goals,
      awayGoals: away.goals,
      mvp: mvpName,
      creditsEarned: getCreditsEarned(playerData.score, won, drawn),
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/MatchEngine.ts
git commit -m "feat: add MatchEngine with scoring, tackles, stars, multipliers, timer"
```

### Task 10: Physics manager

**Files:**
- Create: `src/systems/PhysicsManager.ts`

- [ ] **Step 1: Create src/systems/PhysicsManager.ts**

```ts
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { ArenaLayout, WarpPair } from '../entities/ArenaElements';
import { MatchEngine } from './MatchEngine';
import { TeamSide } from '../utils/types';

export class PhysicsManager {
  private scene: Phaser.Scene;
  private ball!: Ball;
  private arena!: ArenaLayout;
  private engine!: MatchEngine;
  private homePlayers: Player[] = [];
  private awayPlayers: Player[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setup(
    ball: Ball,
    arena: ArenaLayout,
    engine: MatchEngine,
    homePlayers: Player[],
    awayPlayers: Player[],
  ): void {
    this.ball = ball;
    this.arena = arena;
    this.engine = engine;
    this.homePlayers = homePlayers;
    this.awayPlayers = awayPlayers;

    // Ball vs walls
    this.scene.physics.add.collider(ball, arena.walls, () => {
      // Restitution handled by Phaser bounce setting
    });

    // Ball vs domes
    this.scene.physics.add.collider(ball, arena.domes, (_ball, _dome) => {
      const body = ball.body as Phaser.Physics.Arcade.Body;
      const angle = Phaser.Math.DegToRad(
        Phaser.Math.Between(-GAME_CONFIG.DOME_ANGLE_VARIANCE, GAME_CONFIG.DOME_ANGLE_VARIANCE),
      );
      const speed = body.velocity.length() * GAME_CONFIG.DOME_RESTITUTION;
      const currentAngle = Math.atan2(body.velocity.y, body.velocity.x);
      body.velocity.set(
        Math.cos(currentAngle + angle) * speed,
        Math.sin(currentAngle + angle) * speed,
      );
    });

    // Players vs walls
    const allPlayers = [...homePlayers, ...awayPlayers];
    this.scene.physics.add.collider(allPlayers, arena.walls);

    // Players vs domes
    this.scene.physics.add.collider(allPlayers, arena.domes);

    // Ball pickup (overlap check each frame in update)
  }

  update(): void {
    this.checkBallPickup();
    this.checkGoals();
    this.checkStars();
    this.checkMultipliers();
    this.checkWarps();
  }

  private checkBallPickup(): void {
    if (!this.ball.isLoose()) return;

    const allPlayers = [...this.homePlayers, ...this.awayPlayers];
    for (const player of allPlayers) {
      if (!player.isActive || !player.canAct) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, this.ball.x, this.ball.y);
      if (dist < GAME_CONFIG.BALL_PICKUP_RANGE) {
        this.ball.attachTo(player, player.teamSide);
        player.hasBall = true;
        break;
      }
    }
  }

  private checkGoals(): void {
    const ballY = this.ball.y;
    const ballX = this.ball.x;
    const centerX = GAME_CONFIG.ARENA_WIDTH / 2;
    const halfGoal = GAME_CONFIG.GOAL_WIDTH / 2;

    if (ballX > centerX - halfGoal && ballX < centerX + halfGoal) {
      // Top goal (away team's goal, home team scores)
      if (ballY < GAME_CONFIG.GOAL_Y_TOP + 16) {
        this.engine.scoreGoal(TeamSide.HOME, this.arena.multipliers);
        this.ball.release();
        this.clearBallOwnership();
      }
      // Bottom goal (home team's goal, away team scores)
      if (ballY > GAME_CONFIG.GOAL_Y_BOTTOM - 16) {
        this.engine.scoreGoal(TeamSide.AWAY, this.arena.multipliers);
        this.ball.release();
        this.clearBallOwnership();
      }
    }
  }

  private clearBallOwnership(): void {
    [...this.homePlayers, ...this.awayPlayers].forEach((p) => (p.hasBall = false));
  }

  private checkStars(): void {
    if (this.ball.isLoose() || !this.ball.lastTouchedBy) return;

    for (const star of this.arena.stars) {
      if (star.activated) continue;
      const dist = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, star.sprite.x, star.sprite.y);
      if (dist < 8) {
        this.engine.activateStar(star, this.ball.lastTouchedBy, this.arena.stars);
      }
    }
  }

  private checkMultipliers(): void {
    if (this.ball.isLoose() || !this.ball.lastTouchedBy) return;

    for (const mult of this.arena.multipliers) {
      if (!mult.isAvailable()) continue;
      const dist = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, mult.sprite.x, mult.sprite.y);
      if (dist < 12) {
        this.engine.activateMultiplier(mult, this.ball.lastTouchedBy);
      }
    }
  }

  private checkWarps(): void {
    for (const warp of this.arena.warps) {
      this.checkSingleWarp(warp);
    }
  }

  private checkSingleWarp(warp: WarpPair): void {
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;

    // Left entrance
    const distL = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, warp.left.x, warp.left.y);
    if (distL < 10 && ballBody.velocity.x < 0) {
      this.ball.setPosition(warp.right.x, warp.right.y);
      return;
    }

    // Right entrance
    const distR = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, warp.right.x, warp.right.y);
    if (distR < 10 && ballBody.velocity.x > 0) {
      this.ball.setPosition(warp.left.x, warp.left.y);
    }
  }

  shootBall(player: Player, targetX: number, targetY: number): void {
    if (!player.hasBall) return;

    player.hasBall = false;
    this.ball.release();

    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    const speed = player.getShotSpeed();
    this.ball.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.ball.lastTouchedBy = player.teamSide;
  }

  passBall(player: Player, teammates: Player[]): void {
    if (!player.hasBall) return;

    // Find nearest active teammate
    let nearest: Player | null = null;
    let nearestDist = Infinity;
    for (const mate of teammates) {
      if (mate === player || !mate.isActive || mate.isGoalkeeper) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, mate.x, mate.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = mate;
      }
    }

    if (!nearest) return;

    player.hasBall = false;
    this.ball.release();

    const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    this.ball.setVelocity(
      Math.cos(angle) * GAME_CONFIG.PASS_SPEED,
      Math.sin(angle) * GAME_CONFIG.PASS_SPEED,
    );
    this.ball.lastTouchedBy = player.teamSide;
  }

  handleTackle(attacker: Player, opponents: Player[]): void {
    if (!attacker.tackle()) return;

    // Check if any opponent is in tackle range
    const lungeX = attacker.x + Math.cos(attacker.facingAngle) * GAME_CONFIG.TACKLE_LUNGE_DISTANCE;
    const lungeY = attacker.y + Math.sin(attacker.facingAngle) * GAME_CONFIG.TACKLE_LUNGE_DISTANCE;

    for (const opp of opponents) {
      if (!opp.isActive) continue;
      const dist = Phaser.Math.Distance.Between(lungeX, lungeY, opp.x, opp.y);
      if (dist < GAME_CONFIG.TACKLE_HIT_RADIUS) {
        this.engine.tryTackle(attacker, opp, this.ball);
        break;
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/PhysicsManager.ts
git commit -m "feat: add PhysicsManager with collisions, goals, warps, tackles"
```

---

## Chunk 5: MatchScene — The Core Game Loop

### Task 11: Implement MatchScene

**Files:**
- Modify: `src/scenes/MatchScene.ts`
- Create: `src/ui/HUD.ts`

- [ ] **Step 1: Create src/ui/HUD.ts**

```ts
import Phaser from 'phaser';
import { TeamMatchData } from '../systems/MatchEngine';

export class HUD {
  private scene: Phaser.Scene;
  private scoreTextHome: Phaser.GameObjects.Text;
  private scoreTextAway: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private halfText: Phaser.GameObjects.Text;
  private messageText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, homeName: string, awayName: string) {
    this.scene = scene;

    // HUD is fixed to camera (setScrollFactor 0)
    this.scoreTextHome = scene.add.text(8, 4, `${homeName}: 0`, {
      fontSize: '7px', color: '#3b82f6', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(100);

    this.scoreTextAway = scene.add.text(312, 4, `${awayName}: 0`, {
      fontSize: '7px', color: '#ef4444', fontFamily: 'monospace',
    }).setScrollFactor(0).setOrigin(1, 0).setDepth(100);

    this.timerText = scene.add.text(160, 4, '90', {
      fontSize: '7px', color: '#ffffff', fontFamily: 'monospace',
    }).setScrollFactor(0).setOrigin(0.5, 0).setDepth(100);

    this.halfText = scene.add.text(160, 14, 'H1', {
      fontSize: '6px', color: '#888888', fontFamily: 'monospace',
    }).setScrollFactor(0).setOrigin(0.5, 0).setDepth(100);

    this.messageText = scene.add.text(160, 112, '', {
      fontSize: '10px', color: '#f59e0b', fontFamily: 'monospace',
    }).setScrollFactor(0).setOrigin(0.5).setDepth(100);
  }

  update(home: TeamMatchData, away: TeamMatchData, timer: number, half: number): void {
    this.scoreTextHome.setText(`${home.side}: ${home.score}`);
    this.scoreTextAway.setText(`${away.side}: ${away.score}`);
    this.timerText.setText(Math.ceil(timer).toString());
    this.halfText.setText(`H${half}`);
  }

  showMessage(text: string): void {
    this.messageText.setText(text);
  }

  clearMessage(): void {
    this.messageText.setText('');
  }
}
```

- [ ] **Step 2: Implement MatchScene**

```ts
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { TeamDef, TeamSide, MatchState, PlayerRole } from '../utils/types';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { createArena, ArenaLayout } from '../entities/ArenaElements';
import { MatchEngine } from '../systems/MatchEngine';
import { PhysicsManager } from '../systems/PhysicsManager';
import { InputManager, PlayerInput } from '../systems/InputManager';
import { HUD } from '../ui/HUD';
import { TEAMS } from '../config/teams';

interface MatchConfig {
  homeTeam: TeamDef;
  awayTeam: TeamDef;
  p1Controls: TeamSide | null; // null = AI
  p2Controls: TeamSide | null; // null = AI
}

export class MatchScene extends Phaser.Scene {
  private ball!: Ball;
  private arena!: ArenaLayout;
  private engine!: MatchEngine;
  private physics!: PhysicsManager;
  private input_!: InputManager;
  private hud!: HUD;

  private homePlayers: Player[] = [];
  private awayPlayers: Player[] = [];
  private matchConfig!: MatchConfig;

  constructor() {
    super({ key: 'MatchScene' });
  }

  init(data?: Partial<MatchConfig>): void {
    this.matchConfig = {
      homeTeam: data?.homeTeam ?? TEAMS[0],
      awayTeam: data?.awayTeam ?? TEAMS[1],
      p1Controls: data?.p1Controls ?? TeamSide.HOME,
      p2Controls: data?.p2Controls ?? null,
    };
  }

  create(): void {
    // Set world bounds to arena size
    this.physics.world.setBounds(0, 0, GAME_CONFIG.ARENA_WIDTH, GAME_CONFIG.ARENA_HEIGHT);

    // Draw floor
    for (let x = 0; x < GAME_CONFIG.ARENA_WIDTH; x += 16) {
      for (let y = 0; y < GAME_CONFIG.ARENA_HEIGHT; y += 16) {
        this.add.image(x + 8, y + 8, 'floor_tile');
      }
    }

    // Create arena elements
    this.arena = createArena(this);

    // Create ball at center
    this.ball = new Ball(this, GAME_CONFIG.ARENA_WIDTH / 2, GAME_CONFIG.ARENA_HEIGHT / 2);

    // Create players
    this.homePlayers = this.createTeamPlayers(this.matchConfig.homeTeam, TeamSide.HOME);
    this.awayPlayers = this.createTeamPlayers(this.matchConfig.awayTeam, TeamSide.AWAY);

    // Initialize systems
    this.engine = new MatchEngine();
    this.engine.initTeams(this.homePlayers, this.awayPlayers);

    this.physics = new PhysicsManager(this);
    this.physics.setup(this.ball, this.arena, this.engine, this.homePlayers, this.awayPlayers);

    this.input_ = new InputManager(this);

    // HUD
    this.hud = new HUD(this, this.matchConfig.homeTeam.shortName, this.matchConfig.awayTeam.shortName);

    // Camera follows ball
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.ARENA_WIDTH, GAME_CONFIG.ARENA_HEIGHT);
    this.cameras.main.startFollow(this.ball, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(40, 40);

    // Start with kickoff
    this.setupKickoff();
  }

  private createTeamPlayers(teamDef: TeamDef, side: TeamSide): Player[] {
    const players: Player[] = [];
    const starters = teamDef.players.slice(0, 6); // 6 starters (1 keeper + 5 outfield)
    const centerX = GAME_CONFIG.ARENA_WIDTH / 2;

    // Formation positions depend on side
    const isHome = side === TeamSide.HOME;
    const goalY = isHome ? GAME_CONFIG.ARENA_HEIGHT - 24 : 24;
    const defY = isHome ? GAME_CONFIG.ARENA_HEIGHT * 0.75 : GAME_CONFIG.ARENA_HEIGHT * 0.25;
    const midY = GAME_CONFIG.ARENA_HEIGHT * 0.5;
    const fwdY = isHome ? GAME_CONFIG.ARENA_HEIGHT * 0.25 : GAME_CONFIG.ARENA_HEIGHT * 0.75;

    const positions: { x: number; y: number }[] = [
      { x: centerX, y: goalY },           // Keeper
      { x: centerX - 48, y: defY },       // Def L
      { x: centerX + 48, y: defY },       // Def R
      { x: centerX - 56, y: midY },       // Mid L
      { x: centerX + 56, y: midY },       // Mid R
      { x: centerX, y: fwdY },            // Forward
    ];

    starters.forEach((pDef, i) => {
      const pos = positions[i];
      const player = new Player(this, pos.x, pos.y, pDef, side, teamDef.color);
      player.homeX = pos.x;
      player.homeY = pos.y;
      players.push(player);
    });

    return players;
  }

  private setupKickoff(): void {
    // Reset positions
    this.homePlayers.forEach((p) => p.setPosition(p.homeX, p.homeY));
    this.awayPlayers.forEach((p) => p.setPosition(p.homeX, p.homeY));

    // Ball at center
    this.ball.setPosition(GAME_CONFIG.ARENA_WIDTH / 2, GAME_CONFIG.ARENA_HEIGHT / 2);
    this.ball.setVelocity(0, 0);
    this.ball.release();
    this.homePlayers.forEach((p) => (p.hasBall = false));
    this.awayPlayers.forEach((p) => (p.hasBall = false));

    this.hud.showMessage('KICK OFF');

    // Auto-start after a brief pause
    this.time.delayedCall(1000, () => {
      this.engine.startPlay();
      this.hud.clearMessage();
    });
  }

  update(time: number, delta: number): void {
    // Update engine (timer, state transitions)
    this.engine.update(delta);

    // Update arena elements
    this.arena.multipliers.forEach((m) => m.update(delta));

    // Handle match states
    if (this.engine.state === MatchState.MATCH_END) {
      this.hud.showMessage('FULL TIME');
      this.time.delayedCall(2000, () => {
        const result = this.engine.getResult(TeamSide.HOME);
        this.scene.start('ResultScene', { result, matchConfig: this.matchConfig });
      });
      this.engine.state = MatchState.KICKOFF; // prevent re-triggering
      return;
    }

    if (this.engine.state === MatchState.HALFTIME) {
      this.hud.showMessage('HALF TIME');
      return;
    }

    if (this.engine.state === MatchState.GOAL_SCORED) {
      this.hud.showMessage('GOAL!');
      return;
    }

    if (this.engine.state === MatchState.KICKOFF) {
      this.setupKickoff();
      return;
    }

    // Process input for human-controlled teams
    if (this.matchConfig.p1Controls) {
      this.processHumanInput(this.input_.getP1Input(), this.matchConfig.p1Controls);
    }
    if (this.matchConfig.p2Controls) {
      this.processHumanInput(this.input_.getP2Input(), this.matchConfig.p2Controls);
    }

    // Update entities
    this.ball.update(time, delta);
    this.homePlayers.forEach((p) => p.update(time, delta));
    this.awayPlayers.forEach((p) => p.update(time, delta));

    // Physics checks
    this.physics.update();

    // Update HUD
    this.hud.update(this.engine.homeTeam, this.engine.awayTeam, this.engine.timer, this.engine.half);
  }

  private processHumanInput(input: PlayerInput, side: TeamSide): void {
    const team = this.engine.getTeam(side);
    const controlled = this.engine.getControlledPlayer(team);

    if (!controlled.isActive) {
      this.engine.switchControlledPlayer(team, this.ball);
      return;
    }

    // Movement
    controlled.moveInDirection(input.dx, input.dy);

    // Fire button
    if (input.fire) {
      if (controlled.hasBall) {
        // Shoot toward opponent goal
        const goalY = side === TeamSide.HOME ? GAME_CONFIG.GOAL_Y_TOP : GAME_CONFIG.GOAL_Y_BOTTOM;
        this.physics.shootBall(controlled, GAME_CONFIG.ARENA_WIDTH / 2, goalY);
      } else {
        // Tackle
        const opponents = side === TeamSide.HOME ? this.awayPlayers : this.homePlayers;
        this.physics.handleTackle(controlled, opponents);
      }
    }

    // Pass button
    if (input.pass) {
      if (controlled.hasBall) {
        const teammates = side === TeamSide.HOME ? this.homePlayers : this.awayPlayers;
        this.physics.passBall(controlled, teammates);
      } else {
        this.engine.switchControlledPlayer(team, this.ball);
      }
    }
  }
}
```

- [ ] **Step 3: Verify in browser**

Run: `npx vite`
Expected: Title screen → select FRIENDLY → match starts with arena, players, ball, HUD. Player 1 can move with arrows, shoot with Z, pass with X.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/MatchScene.ts src/ui/HUD.ts
git commit -m "feat: implement MatchScene with full game loop, HUD, input, physics"
```

---

## Chunk 6: AI System

### Task 12: AI Controller

**Files:**
- Create: `src/systems/AIController.ts`

- [ ] **Step 1: Create src/systems/AIController.ts**

```ts
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { AITeamState, AIPlayerBehavior, Difficulty, TeamSide } from '../utils/types';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { PhysicsManager } from './PhysicsManager';
import { MatchEngine } from './MatchEngine';

interface DifficultyParams {
  reactionTime: number;
  passAccuracy: number;
  tackleAggression: number;
  starAwareness: number;
}

export class AIController {
  private difficulty: DifficultyParams;
  private teamSide: TeamSide;
  private players: Player[];
  private opponents: Player[];
  private ball: Ball;
  private physicsManager: PhysicsManager;
  private engine: MatchEngine;
  private teamState: AITeamState = AITeamState.LOOSE_BALL;
  private reactionTimer: number = 0;

  constructor(
    teamSide: TeamSide,
    players: Player[],
    opponents: Player[],
    ball: Ball,
    physicsManager: PhysicsManager,
    engine: MatchEngine,
    difficulty: Difficulty = Difficulty.MEDIUM,
  ) {
    this.teamSide = teamSide;
    this.players = players;
    this.opponents = opponents;
    this.ball = ball;
    this.physicsManager = physicsManager;
    this.engine = engine;
    this.difficulty = GAME_CONFIG.DIFFICULTY[difficulty];
  }

  update(delta: number): void {
    this.reactionTimer -= delta;
    if (this.reactionTimer > 0) return;
    this.reactionTimer = this.difficulty.reactionTime;

    // Determine team state
    this.updateTeamState();

    // Assign behaviors to each player
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (!player.isActive || !player.canAct) continue;
      if (player.isGoalkeeper) {
        this.updateKeeper(player);
        continue;
      }
      this.updateOutfieldPlayer(player, i);
    }
  }

  private updateTeamState(): void {
    if (this.ball.owner) {
      const ownerSide = this.players.includes(this.ball.owner as Player)
        ? this.teamSide
        : (this.teamSide === TeamSide.HOME ? TeamSide.AWAY : TeamSide.HOME);

      this.teamState = ownerSide === this.teamSide
        ? AITeamState.ATTACKING
        : AITeamState.DEFENDING;
    } else {
      this.teamState = AITeamState.LOOSE_BALL;
    }
  }

  private updateKeeper(keeper: Player): void {
    // Move horizontally toward ball X, stay on goal line
    const goalY = this.teamSide === TeamSide.HOME
      ? GAME_CONFIG.ARENA_HEIGHT - 24
      : 24;
    const centerX = GAME_CONFIG.ARENA_WIDTH / 2;

    const targetX = Phaser.Math.Clamp(
      this.ball.x,
      centerX - GAME_CONFIG.KEEPER_RANGE,
      centerX + GAME_CONFIG.KEEPER_RANGE,
    );

    const dx = targetX - keeper.x;
    keeper.moveInDirection(dx > 2 ? 1 : dx < -2 ? -1 : 0, 0);
    keeper.setY(goalY); // Lock Y position
  }

  private updateOutfieldPlayer(player: Player, index: number): void {
    switch (this.teamState) {
      case AITeamState.ATTACKING:
        this.attackBehavior(player, index);
        break;
      case AITeamState.DEFENDING:
        this.defendBehavior(player, index);
        break;
      case AITeamState.LOOSE_BALL:
        this.looseBallBehavior(player, index);
        break;
    }
  }

  private attackBehavior(player: Player, _index: number): void {
    if (player.hasBall) {
      // Ball carrier: advance toward goal or shoot/pass
      const goalY = this.teamSide === TeamSide.HOME
        ? GAME_CONFIG.GOAL_Y_TOP
        : GAME_CONFIG.GOAL_Y_BOTTOM;

      const distToGoal = Math.abs(player.y - goalY);

      if (distToGoal < 120) {
        // Close to goal — shoot
        this.physicsManager.shootBall(
          player,
          GAME_CONFIG.ARENA_WIDTH / 2,
          goalY,
        );
      } else if (Math.random() < 0.3) {
        // Sometimes pass
        if (Math.random() < this.difficulty.passAccuracy) {
          this.physicsManager.passBall(player, this.players);
        }
      } else {
        // Advance toward goal
        const dy = goalY < player.y ? -1 : 1;
        const dx = (Math.random() - 0.5) > 0 ? 1 : -1;
        player.moveInDirection(dx * 0.3, dy);
      }
    } else {
      // Support: move to attacking position
      const goalY = this.teamSide === TeamSide.HOME
        ? GAME_CONFIG.ARENA_HEIGHT * 0.3
        : GAME_CONFIG.ARENA_HEIGHT * 0.7;
      this.moveToward(player, player.homeX, goalY);
    }
  }

  private defendBehavior(player: Player, index: number): void {
    const nearestOpp = this.findNearestOpponent(player);

    if (nearestOpp && Phaser.Math.Distance.Between(player.x, player.y, nearestOpp.x, nearestOpp.y) < 30) {
      // Close enough to tackle
      if (Math.random() < this.difficulty.tackleAggression) {
        player.facingAngle = Math.atan2(nearestOpp.y - player.y, nearestOpp.x - player.x);
        this.physicsManager.handleTackle(player, this.opponents);
        return;
      }
    }

    // Mark nearest opponent or return to position
    if (nearestOpp && index > 0) { // index 0 is keeper
      this.moveToward(player, nearestOpp.x, nearestOpp.y);
    } else {
      this.moveToward(player, player.homeX, player.homeY);
    }
  }

  private looseBallBehavior(player: Player, index: number): void {
    // Nearest player chases ball, others position
    const nearest = this.findNearestPlayerToBall();
    if (nearest === player) {
      this.moveToward(player, this.ball.x, this.ball.y);
    } else {
      this.moveToward(player, player.homeX, player.homeY);
    }
  }

  private moveToward(player: Player, tx: number, ty: number): void {
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      player.moveInDirection(0, 0);
    } else {
      player.moveInDirection(dx / dist, dy / dist);
    }
  }

  private findNearestOpponent(player: Player): Player | null {
    let nearest: Player | null = null;
    let nearestDist = Infinity;
    for (const opp of this.opponents) {
      if (!opp.isActive) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, opp.x, opp.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = opp;
      }
    }
    return nearest;
  }

  private findNearestPlayerToBall(): Player {
    let nearest = this.players[0];
    let nearestDist = Infinity;
    for (const p of this.players) {
      if (!p.isActive || p.isGoalkeeper) continue;
      const dist = Phaser.Math.Distance.Between(p.x, p.y, this.ball.x, this.ball.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = p;
      }
    }
    return nearest;
  }
}
```

- [ ] **Step 2: Integrate AI into MatchScene**

Add to `src/scenes/MatchScene.ts`:
- Import `AIController` and `Difficulty`
- Add `private homeAI: AIController | null = null;` and `private awayAI: AIController | null = null;`
- In `create()`, after physics setup, create AI for non-human-controlled teams:

```ts
if (!this.matchConfig.p1Controls || this.matchConfig.p1Controls !== TeamSide.HOME) {
  this.homeAI = new AIController(TeamSide.HOME, this.homePlayers, this.awayPlayers, this.ball, this.physics, this.engine);
}
if (!this.matchConfig.p2Controls && (!this.matchConfig.p1Controls || this.matchConfig.p1Controls !== TeamSide.AWAY)) {
  this.awayAI = new AIController(TeamSide.AWAY, this.awayPlayers, this.homePlayers, this.ball, this.physics, this.engine);
}
```

- In `update()`, after human input processing, add:

```ts
if (this.homeAI) this.homeAI.update(delta);
if (this.awayAI) this.awayAI.update(delta);
```

- [ ] **Step 3: Verify AI works in browser**

Run: `npx vite`
Expected: In friendly match, AI team moves, chases ball, tackles, passes, and shoots at goal.

- [ ] **Step 4: Commit**

```bash
git add src/systems/AIController.ts src/scenes/MatchScene.ts
git commit -m "feat: add AI controller with attack/defend/loose ball behaviors"
```

---

## Chunk 7: Result Scene, Friendly Scene, Audio

### Task 13: Result scene

**Files:**
- Modify: `src/scenes/ResultScene.ts`

- [ ] **Step 1: Implement ResultScene**

```ts
import Phaser from 'phaser';
import { MatchResult } from '../utils/types';
import { createMenuText, MenuSelector } from '../ui/MenuComponents';

export class ResultScene extends Phaser.Scene {
  private menuSelector!: MenuSelector;

  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: { result: MatchResult; returnTo?: string }): void {
    const cx = this.cameras.main.centerX;
    const r = data.result;

    createMenuText(this, cx, 20, 'MATCH RESULT', 12);
    createMenuText(this, cx, 50, `${r.homeScore} - ${r.awayScore}`, 16);

    createMenuText(this, cx, 80, `Goals: ${r.homeGoals} - ${r.awayGoals}`, 7);
    createMenuText(this, cx, 95, `Tackles: ${r.homeTackles} - ${r.awayTackles}`, 7);
    createMenuText(this, cx, 110, `MVP: ${r.mvp}`, 7);

    if (r.creditsEarned > 0) {
      createMenuText(this, cx, 130, `Credits earned: ${r.creditsEarned}`, 8);
    }

    const cont = createMenuText(this, cx, 170, 'CONTINUE', 10).setData('label', 'CONTINUE');
    this.menuSelector = new MenuSelector(this, [cont], [
      () => this.scene.start(data.returnTo ?? 'TitleScene'),
    ]);
  }

  update(): void {
    this.menuSelector.update();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/ResultScene.ts
git commit -m "feat: implement ResultScene with score breakdown"
```

### Task 14: Friendly scene

**Files:**
- Modify: `src/scenes/FriendlyScene.ts`

- [ ] **Step 1: Implement FriendlyScene**

```ts
import Phaser from 'phaser';
import { TEAMS } from '../config/teams';
import { TeamSide } from '../utils/types';
import { createMenuText, MenuSelector } from '../ui/MenuComponents';

export class FriendlyScene extends Phaser.Scene {
  private homeIndex: number = 0;
  private awayIndex: number = 1;
  private step: 'home' | 'away' | 'mode' = 'home';
  private menuSelector!: MenuSelector;

  constructor() {
    super({ key: 'FriendlyScene' });
  }

  create(): void {
    this.step = 'home';
    this.showTeamSelect('SELECT HOME TEAM');
  }

  private showTeamSelect(title: string): void {
    this.children.removeAll();
    const cx = this.cameras.main.centerX;
    createMenuText(this, cx, 20, title, 10);

    const items: Phaser.GameObjects.Text[] = [];
    const callbacks: (() => void)[] = [];

    TEAMS.forEach((team, i) => {
      const item = createMenuText(this, cx, 50 + i * 18, team.name, 8).setData('label', team.name);
      items.push(item);
      callbacks.push(() => {
        if (this.step === 'home') {
          this.homeIndex = i;
          this.step = 'away';
          this.showTeamSelect('SELECT AWAY TEAM');
        } else {
          this.awayIndex = i;
          this.step = 'mode';
          this.showModeSelect();
        }
      });
    });

    this.menuSelector = new MenuSelector(this, items, callbacks);
  }

  private showModeSelect(): void {
    this.children.removeAll();
    const cx = this.cameras.main.centerX;
    createMenuText(this, cx, 40, 'GAME MODE', 10);

    const p1ai = createMenuText(this, cx, 80, 'P1 vs AI', 9).setData('label', 'P1 vs AI');
    const p1p2 = createMenuText(this, cx, 100, 'P1 vs P2', 9).setData('label', 'P1 vs P2');
    const demo = createMenuText(this, cx, 120, 'DEMO', 9).setData('label', 'DEMO');
    const back = createMenuText(this, cx, 150, 'BACK', 9).setData('label', 'BACK');

    this.menuSelector = new MenuSelector(this, [p1ai, p1p2, demo, back], [
      () => this.startMatch(TeamSide.HOME, null),
      () => this.startMatch(TeamSide.HOME, TeamSide.AWAY),
      () => this.startMatch(null, null),
      () => this.scene.start('TitleScene'),
    ]);
  }

  private startMatch(p1: TeamSide | null, p2: TeamSide | null): void {
    this.scene.start('MatchScene', {
      homeTeam: TEAMS[this.homeIndex],
      awayTeam: TEAMS[this.awayIndex],
      p1Controls: p1,
      p2Controls: p2,
    });
  }

  update(): void {
    this.menuSelector.update();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/FriendlyScene.ts
git commit -m "feat: implement FriendlyScene with team and mode selection"
```

### Task 15: Audio manager (placeholder)

**Files:**
- Create: `src/systems/AudioManager.ts`

- [ ] **Step 1: Create src/systems/AudioManager.ts**

```ts
import Phaser from 'phaser';

export class AudioManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  playGoal(): void {
    this.playTone(440, 0.3, 'square');
    setTimeout(() => this.playTone(660, 0.3, 'square'), 150);
    setTimeout(() => this.playTone(880, 0.5, 'square'), 300);
  }

  playTackle(): void {
    this.playTone(120, 0.1, 'sawtooth');
  }

  playBounce(): void {
    this.playTone(300, 0.05, 'sine');
  }

  playWhistle(): void {
    this.playTone(800, 0.4, 'square');
  }

  private playTone(freq: number, duration: number, type: OscillatorType): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0.1;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not available
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/AudioManager.ts
git commit -m "feat: add AudioManager with placeholder synthesized SFX"
```

---

## Chunk 8: League Mode & Team Management

### Task 16: League scene

**Files:**
- Modify: `src/scenes/LeagueScene.ts`
- Create: `src/ui/LeagueTable.ts`

- [ ] **Step 1: Create src/ui/LeagueTable.ts**

```ts
import Phaser from 'phaser';
import { LeagueStanding } from '../utils/types';

export function drawLeagueTable(
  scene: Phaser.Scene,
  x: number,
  y: number,
  standings: LeagueStanding[],
): void {
  const sorted = [...standings].sort((a, b) => b.points - a.points || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst));
  const style = { fontSize: '6px', color: '#aaaaaa', fontFamily: 'monospace' };
  const headerStyle = { fontSize: '6px', color: '#f59e0b', fontFamily: 'monospace' };

  scene.add.text(x, y, 'TEAM          P  W  D  L  PTS', headerStyle);

  sorted.forEach((s, i) => {
    const name = s.teamName.padEnd(14).slice(0, 14);
    const line = `${name}${s.played.toString().padStart(2)} ${s.won.toString().padStart(2)} ${s.drawn.toString().padStart(2)} ${s.lost.toString().padStart(2)} ${s.points.toString().padStart(4)}`;
    const color = i === 0 ? '#f59e0b' : '#aaaaaa';
    scene.add.text(x, y + 12 + i * 10, line, { ...style, color });
  });
}
```

- [ ] **Step 2: Implement LeagueScene**

```ts
import Phaser from 'phaser';
import { TEAMS } from '../config/teams';
import { LeagueStanding, TeamSide } from '../utils/types';
import { createMenuText, MenuSelector } from '../ui/MenuComponents';
import { drawLeagueTable } from '../ui/LeagueTable';

interface LeagueData {
  standings: LeagueStanding[];
  schedule: { home: number; away: number }[];
  currentMatch: number;
  credits: number;
  playerTeamIndex: number;
}

function createInitialLeagueData(): LeagueData {
  const standings: LeagueStanding[] = TEAMS.map((t) => ({
    teamName: t.shortName,
    played: 0, won: 0, drawn: 0, lost: 0, points: 0, pointsFor: 0, pointsAgainst: 0,
  }));

  // Double round-robin schedule
  const schedule: { home: number; away: number }[] = [];
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < TEAMS.length; i++) {
      for (let j = i + 1; j < TEAMS.length; j++) {
        if (round === 0) schedule.push({ home: i, away: j });
        else schedule.push({ home: j, away: i });
      }
    }
  }
  // Shuffle schedule
  for (let i = schedule.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [schedule[i], schedule[j]] = [schedule[j], schedule[i]];
  }

  return { standings, schedule, currentMatch: 0, credits: 0, playerTeamIndex: 0 };
}

export class LeagueScene extends Phaser.Scene {
  private leagueData!: LeagueData;
  private menuSelector!: MenuSelector;

  constructor() {
    super({ key: 'LeagueScene' });
  }

  init(data?: { leagueData?: LeagueData }): void {
    this.leagueData = data?.leagueData ?? createInitialLeagueData();
  }

  create(): void {
    const cx = this.cameras.main.centerX;
    const ld = this.leagueData;

    if (ld.currentMatch >= ld.schedule.length) {
      // Season over
      const winner = [...ld.standings].sort((a, b) => b.points - a.points)[0];
      const playerWon = winner.teamName === TEAMS[ld.playerTeamIndex].shortName;
      createMenuText(this, cx, 30, playerWon ? 'YOU WON THE LEAGUE!' : 'SEASON OVER', 10);
      drawLeagueTable(this, 20, 50, ld.standings);

      const retry = createMenuText(this, cx, 200, 'NEW SEASON', 9).setData('label', 'NEW SEASON');
      const quit = createMenuText(this, cx, 215, 'TITLE', 9).setData('label', 'TITLE');
      this.menuSelector = new MenuSelector(this, [retry, quit], [
        () => this.scene.start('LeagueScene'),
        () => this.scene.start('TitleScene'),
      ]);
      return;
    }

    createMenuText(this, cx, 10, 'LEAGUE', 12);
    createMenuText(this, cx, 25, `Credits: ${ld.credits}`, 7);

    drawLeagueTable(this, 20, 35, ld.standings);

    // Next match info
    const fixture = ld.schedule[ld.currentMatch];
    const matchNum = ld.currentMatch + 1;
    const total = ld.schedule.length;
    createMenuText(this, cx, 145, `Match ${matchNum}/${total}`, 7);
    createMenuText(this, cx, 158, `${TEAMS[fixture.home].name} vs ${TEAMS[fixture.away].name}`, 8);

    const isPlayerMatch = fixture.home === ld.playerTeamIndex || fixture.away === ld.playerTeamIndex;

    const items: Phaser.GameObjects.Text[] = [];
    const callbacks: (() => void)[] = [];

    if (isPlayerMatch) {
      items.push(createMenuText(this, cx, 178, 'PLAY MATCH', 9).setData('label', 'PLAY MATCH'));
      callbacks.push(() => {
        const playerSide = fixture.home === ld.playerTeamIndex ? TeamSide.HOME : TeamSide.AWAY;
        this.scene.start('MatchScene', {
          homeTeam: TEAMS[fixture.home],
          awayTeam: TEAMS[fixture.away],
          p1Controls: playerSide,
          p2Controls: null,
          leagueData: ld,
        });
      });

      items.push(createMenuText(this, cx, 193, 'TEAM', 9).setData('label', 'TEAM'));
      callbacks.push(() => this.scene.start('TeamMgmtScene', { leagueData: ld }));
    } else {
      items.push(createMenuText(this, cx, 178, 'SIMULATE', 9).setData('label', 'SIMULATE'));
      callbacks.push(() => this.simulateMatch(fixture));
    }

    items.push(createMenuText(this, cx, 208, 'QUIT', 9).setData('label', 'QUIT'));
    callbacks.push(() => this.scene.start('TitleScene'));

    this.menuSelector = new MenuSelector(this, items, callbacks);
  }

  private simulateMatch(fixture: { home: number; away: number }): void {
    // Simple simulation based on team strength
    const homeStr = this.avgTeamStat(fixture.home);
    const awayStr = this.avgTeamStat(fixture.away);
    const total = homeStr + awayStr;
    const homeScore = Math.floor(Math.random() * 5) * (homeStr / total > 0.5 ? 2 : 1) * 10;
    const awayScore = Math.floor(Math.random() * 5) * (awayStr / total > 0.5 ? 2 : 1) * 10;

    this.updateStandings(fixture.home, fixture.away, homeScore, awayScore);
    this.leagueData.currentMatch++;
    this.scene.restart({ leagueData: this.leagueData });
  }

  private avgTeamStat(teamIdx: number): number {
    const t = TEAMS[teamIdx];
    return t.players.reduce((sum, p) => sum + p.stats.speed + p.stats.strength + p.stats.defense, 0) / t.players.length;
  }

  updateStandings(homeIdx: number, awayIdx: number, homeScore: number, awayScore: number): void {
    const hs = this.leagueData.standings[homeIdx];
    const as_ = this.leagueData.standings[awayIdx];

    hs.played++;
    as_.played++;
    hs.pointsFor += homeScore;
    hs.pointsAgainst += awayScore;
    as_.pointsFor += awayScore;
    as_.pointsAgainst += homeScore;

    if (homeScore > awayScore) {
      hs.won++;
      hs.points += 3;
      as_.lost++;
    } else if (awayScore > homeScore) {
      as_.won++;
      as_.points += 3;
      hs.lost++;
    } else {
      hs.drawn++;
      as_.drawn++;
      hs.points += 1;
      as_.points += 1;
    }
  }

  update(): void {
    this.menuSelector?.update();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/scenes/LeagueScene.ts src/ui/LeagueTable.ts
git commit -m "feat: implement LeagueScene with standings, schedule, simulation"
```

### Task 17: Team management scene

**Files:**
- Modify: `src/scenes/TeamMgmtScene.ts`

- [ ] **Step 1: Implement TeamMgmtScene**

```ts
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { TEAMS } from '../config/teams';
import { createMenuText, MenuSelector } from '../ui/MenuComponents';

interface LeagueData {
  standings: any[];
  schedule: any[];
  currentMatch: number;
  credits: number;
  playerTeamIndex: number;
}

export class TeamMgmtScene extends Phaser.Scene {
  private leagueData!: LeagueData;
  private selectedPlayer: number = 0;
  private menuSelector!: MenuSelector;

  constructor() {
    super({ key: 'TeamMgmtScene' });
  }

  init(data: { leagueData: LeagueData }): void {
    this.leagueData = data.leagueData;
  }

  create(): void {
    this.showRoster();
  }

  private showRoster(): void {
    this.children.removeAll();
    const cx = this.cameras.main.centerX;
    const team = TEAMS[this.leagueData.playerTeamIndex];

    createMenuText(this, cx, 10, 'TEAM MANAGEMENT', 10);
    createMenuText(this, cx, 25, `Credits: ${this.leagueData.credits}`, 8);

    const items: Phaser.GameObjects.Text[] = [];
    const callbacks: (() => void)[] = [];

    team.players.forEach((p, i) => {
      const label = `#${p.number} ${p.name} S:${p.stats.speed} T:${p.stats.strength} D:${p.stats.defense}`;
      const item = createMenuText(this, cx, 45 + i * 14, label, 6).setData('label', label);
      items.push(item);
      callbacks.push(() => {
        this.selectedPlayer = i;
        this.showUpgradeMenu();
      });
    });

    const back = createMenuText(this, cx, 45 + team.players.length * 14 + 10, 'BACK', 8).setData('label', 'BACK');
    items.push(back);
    callbacks.push(() => this.scene.start('LeagueScene', { leagueData: this.leagueData }));

    this.menuSelector = new MenuSelector(this, items, callbacks);
  }

  private showUpgradeMenu(): void {
    this.children.removeAll();
    const cx = this.cameras.main.centerX;
    const team = TEAMS[this.leagueData.playerTeamIndex];
    const p = team.players[this.selectedPlayer];

    createMenuText(this, cx, 20, `#${p.number} ${p.name}`, 10);
    createMenuText(this, cx, 38, `SPD:${p.stats.speed} STR:${p.stats.strength} DEF:${p.stats.defense}`, 8);
    createMenuText(this, cx, 52, `Credits: ${this.leagueData.credits}`, 7);

    const cost = GAME_CONFIG.SPEED_TRAINING_COST;
    const items: Phaser.GameObjects.Text[] = [];
    const callbacks: (() => void)[] = [];

    const spd = createMenuText(this, cx, 75, `Speed +1 (${cost})`, 8).setData('label', `Speed +1 (${cost})`);
    items.push(spd);
    callbacks.push(() => this.buyUpgrade('speed'));

    const str = createMenuText(this, cx, 92, `Strength +1 (${cost})`, 8).setData('label', `Strength +1 (${cost})`);
    items.push(str);
    callbacks.push(() => this.buyUpgrade('strength'));

    const def = createMenuText(this, cx, 109, `Defense +1 (${cost})`, 8).setData('label', `Defense +1 (${cost})`);
    items.push(def);
    callbacks.push(() => this.buyUpgrade('defense'));

    const buy = createMenuText(this, cx, 135, `Buy Replacement (${GAME_CONFIG.BUY_PLAYER_COST})`, 8).setData('label', `Buy Replacement (${GAME_CONFIG.BUY_PLAYER_COST})`);
    items.push(buy);
    callbacks.push(() => this.buyPlayer());

    const back = createMenuText(this, cx, 165, 'BACK', 8).setData('label', 'BACK');
    items.push(back);
    callbacks.push(() => this.showRoster());

    this.menuSelector = new MenuSelector(this, items, callbacks);
  }

  private buyUpgrade(stat: 'speed' | 'strength' | 'defense'): void {
    const cost = GAME_CONFIG.SPEED_TRAINING_COST;
    if (this.leagueData.credits < cost) return;

    const team = TEAMS[this.leagueData.playerTeamIndex];
    const p = team.players[this.selectedPlayer];

    if (p.stats[stat] >= GAME_CONFIG.STAT_CAP) return;

    p.stats[stat]++;
    this.leagueData.credits -= cost;
    this.showUpgradeMenu(); // Refresh
  }

  private buyPlayer(): void {
    if (this.leagueData.credits < GAME_CONFIG.BUY_PLAYER_COST) return;

    const team = TEAMS[this.leagueData.playerTeamIndex];
    const old = team.players[this.selectedPlayer];

    // Generate better stats
    old.stats.speed = Math.min(GAME_CONFIG.STAT_CAP, old.stats.speed + 2 + Math.floor(Math.random() * 2));
    old.stats.strength = Math.min(GAME_CONFIG.STAT_CAP, old.stats.strength + 2 + Math.floor(Math.random() * 2));
    old.stats.defense = Math.min(GAME_CONFIG.STAT_CAP, old.stats.defense + 2 + Math.floor(Math.random() * 2));
    old.name = `Recruit ${Math.floor(Math.random() * 99)}`;

    this.leagueData.credits -= GAME_CONFIG.BUY_PLAYER_COST;
    this.showUpgradeMenu();
  }

  update(): void {
    this.menuSelector?.update();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/TeamMgmtScene.ts
git commit -m "feat: implement TeamMgmtScene with stat upgrades and player buying"
```

### Task 18: Wire league results back

**Files:**
- Modify: `src/scenes/MatchScene.ts`
- Modify: `src/scenes/ResultScene.ts`

- [ ] **Step 1: Update MatchScene to pass league data through**

In `MatchScene.init()`, also capture `leagueData` from incoming data. In the match end handler, pass it to ResultScene:

```ts
// In MatchScene interface
leagueData?: any;

// In init()
this.matchConfig.leagueData = data?.leagueData;

// In update() match end handler
this.scene.start('ResultScene', {
  result,
  matchConfig: this.matchConfig,
  leagueData: this.matchConfig.leagueData,
});
```

- [ ] **Step 2: Update ResultScene to return to league with updated data**

```ts
// In ResultScene create(), if leagueData exists:
if (data.leagueData) {
  // Update standings
  const ld = data.leagueData;
  const fixture = ld.schedule[ld.currentMatch];
  // Update standings with actual result
  // ... (import and call LeagueScene.updateStandings equivalent)
  ld.currentMatch++;
  ld.credits += r.creditsEarned;

  // Navigate back to league
  callbacks[0] = () => this.scene.start('LeagueScene', { leagueData: ld });
}
```

- [ ] **Step 3: Verify full flow in browser**

Run: `npx vite`
Expected: Title → League → Play Match → Result → League (standings updated, credits earned).

- [ ] **Step 4: Commit**

```bash
git add src/scenes/MatchScene.ts src/scenes/ResultScene.ts
git commit -m "feat: wire league match results back to league standings"
```

---

## Chunk 9: Polish & Integration

### Task 19: Visual polish

**Files:**
- Modify: `src/scenes/BootScene.ts`
- Modify: `src/scenes/MatchScene.ts`

- [ ] **Step 1: Add player direction indicator**

Update the player sprite rendering to show facing direction — add a small triangle/arrow overlay in the player's facing direction. Update Player.ts to set `flipX`/rotation based on `facingAngle`.

- [ ] **Step 2: Add controlled player highlight**

In MatchScene update, highlight the currently controlled player with a different tint or a small circle underneath:

```ts
// After processing input, highlight controlled player
this.homePlayers.forEach((p) => p.setAlpha(p === controlled ? 1 : 0.8));
```

- [ ] **Step 3: Commit**

```bash
git add src/scenes/MatchScene.ts src/entities/Player.ts
git commit -m "feat: add visual feedback for controlled player and facing direction"
```

### Task 20: Final integration test

- [ ] **Step 1: Test full flow**

1. Start dev server: `npx vite`
2. Title screen loads with menu
3. Friendly: select teams, play match, see result, return to title
4. League: see standings, play match, earn credits, upgrade team, simulate AI matches, complete season
5. Controls: P1 arrows+Z+X, P2 WASD+Q+E work in local multiplayer

- [ ] **Step 2: Add npm scripts to package.json**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: finalize Speedball 2 web version with all game modes"
```
