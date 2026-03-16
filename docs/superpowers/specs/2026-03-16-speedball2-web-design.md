# Speedball 2: Brutal Deluxe — Web Version Design Spec

## Overview

A faithful web-based recreation of the classic Amiga/Mega Drive game Speedball 2: Brutal Deluxe, built with Phaser 3 and TypeScript. Pixel-art retro style, singleplayer with AI opponents, and local 2-player multiplayer on one keyboard.

## Technology Stack

- **Engine:** Phaser 3 (latest stable)
- **Language:** TypeScript
- **Build:** Vite (fast dev server, ES module bundling)
- **Art:** Pixel-art sprites (original resolution style, ~320x224 base scaled up)
- **Audio:** Placeholder SFX via Web Audio API (Phaser built-in)

## Architecture

### Scene Flow

```
BootScene → TitleScene → LeagueScene → TeamMgmtScene → MatchScene → ResultScene
                       → FriendlyScene → MatchScene → ResultScene
```

- **BootScene** — Load all assets, show loading bar
- **TitleScene** — Main menu: League, Friendly Match, Options
- **LeagueScene** — League standings, next fixture, navigate to TeamMgmt or Match
- **TeamMgmtScene** — Upgrade player stats, buy new players with credits
- **FriendlyScene** — Pick two teams, choose P1/P2 or P1/AI
- **MatchScene** — The core game loop (the heart of the project)
- **ResultScene** — Score breakdown, MVP, credits earned

### Core Modules

- **MatchEngine** — Game rules, scoring, timer, halftime, power-ups, bounce zones, warp tunnels
- **PhysicsManager** — Ball physics, player movement, tackles, collision responses, wall bouncing (uses Phaser Arcade Physics)
- **AIController** — Team-level strategy + individual player behaviors (state machine)
- **InputManager** — Keyboard mapping for 2 players, action buttons (pass, tackle, shoot)
- **SpriteManager** — Sprite sheet loading, animations (run 8-dir, tackle, throw, injured)
- **AudioManager** — Placeholder SFX management (crowd, goal, tackle, whistle)

## Arena / Pitch

Vertical scrolling arena. Camera follows the ball. No out-of-bounds — ball and players bounce off walls.

### Arena Dimensions

- **Viewport:** 320x224 pixels (base resolution, scaled up with nearest-neighbor)
- **Arena size:** 320x480 pixels (wider than tall ratio ensures vertical scrolling)
- **Tile size:** 16x16 pixels
- **Arena grid:** 20 columns x 30 rows
- Camera scrolls vertically, clamped to arena bounds. Ball is the camera target with a small dead zone.

### Arena Layout (Y coordinates from top)

```
Y=0     ┌──────────── WALL ────────────┐
Y=16    │     ┌── GOAL (Team 2) ──┐    │
Y=32    │     └───────────────────┘    │
Y=48    │  [STAR]  [DOME]    [DOME] [STAR] │
Y=64    │  [STAR]       [x2]       [STAR] │
Y=80    │        [DOME]      [DOME]      │
Y=96    │  [STAR]                  [STAR] │
Y=112   │ [WARP-L]              [WARP-R] │
        │                                │
Y=224   │  [DOME] ── CENTER ── [DOME]    │
Y=240   │       (kickoff circle)         │
        │                                │
Y=368   │ [WARP-L]              [WARP-R] │
Y=384   │  [STAR]                  [STAR] │
Y=400   │        [DOME]      [DOME]      │
Y=416   │  [STAR]       [x2]       [STAR] │
Y=432   │  [STAR]  [DOME]    [DOME] [STAR] │
Y=448   │     ┌── GOAL (Team 1) ──┐    │
Y=464   │     └───────────────────┘    │
Y=480   └──────────── WALL ────────────┘
```

The layout is vertically symmetrical. Each team's half mirrors the other.

### Arena Elements

| Element | Count | Behavior |
|---------|-------|----------|
| **Goals** | 2 | Top (Team 2) and bottom (Team 1). Goal width = 96px (6 tiles), centered. Score = 10 points |
| **Bounce Domes** | 8 | Static bumpers (16x16). Ball reflects off at incidence angle + random offset of ±15°. Players bounce off and lose velocity |
| **Score Stars** | 5 per side (10 total) | Static collectibles (8x8). Ball touching a star activates it (lights up). All 5 on one side activated = 10 bonus points for the activating team, then reset. Stars are mirrored per half |
| **Score Multipliers** | 1 per half (2 total) | Static pad (16x16). Ball touching it activates x2 for the team that hit it. Lasts until that team scores, then deactivates. Does not stack. Respawns 10 seconds after deactivation |
| **Warp Tunnels** | 2 pairs (4 total) | Left entrance → right exit on same Y level. Ball enters one side, exits the other at same velocity. Players cannot use warps |
| **Walls** | Perimeter | Ball bounces with 0.8 restitution. Players stop at walls (no bounce) |

## Gameplay

### Teams

- 5 outfield players + 1 goalkeeper per team
- Each player has stats: Speed (SPD), Strength (STR), Defense (DEF), range 1-15
- Players can be injured by tackles (see Tackle Mechanics below)

### Stat Effects

| Stat | Effect |
|------|--------|
| **SPD** | Max movement speed: `60 + (SPD * 8)` pixels/sec. Ranges from 68 (SPD 1) to 180 (SPD 15) |
| **STR** | Tackle power and shot speed. Tackle success = `STR / (STR + target.DEF)` probability. Shot speed: `150 + (STR * 10)` px/sec |
| **DEF** | Tackle resistance (see STR). Also reduces injury chance: injury on successful tackle = `0.3 - (DEF * 0.015)`, minimum 0.05 |

### Ball Physics

- **Pass speed:** 180 px/sec, directed at nearest teammate
- **Shot speed:** `150 + (STR * 10)` px/sec, directed toward goal (with aim variance based on distance)
- **Friction:** Ball decelerates at 30 px/sec² when loose (no one holding it)
- **Wall bounce:** Restitution 0.8 (loses 20% speed)
- **Dome bounce:** Restitution 0.9, reflection angle = incidence + random(±15°)
- **Pickup range:** Player within 12px of ball auto-picks it up (if no one owns it)

### Tackle Mechanics

- **Range:** Tackling player lunges 24px in facing direction
- **Hit detection:** 20px radius from lunge endpoint
- **On successful tackle:** Ball becomes loose, drops at tackled player's position. Tackled player is stunned for 0.5 sec. Tackling team gets 2 points.
- **Injury:** After a successful tackle, `0.3 - (target.DEF * 0.015)` chance (min 0.05) the tackled player is injured and removed for 10 seconds
- **On failed tackle:** Tackling player has 0.3 sec recovery (can't act)

### Goalkeeper

- Moves only horizontally along the goal line (±48px from goal center)
- Auto-positions toward the ball's X coordinate when ball is in their half
- Saves: When ball enters a 32px detection zone in front of goal, keeper attempts save. Save probability = `0.4 + (keeper.DEF * 0.03)`. On save, ball is punched upfield with random angle.
- Keeper cannot be tackled (protected zone ~24px around goal)
- Keeper cannot leave the goal area

### Player Actions

| Action | With Ball | Without Ball |
|--------|-----------|-------------|
| **Button 1** | Shoot/Throw | Tackle |
| **Button 2** | Pass to nearest teammate | Switch controlled player |
| **Movement** | 8-directional | 8-directional |

### Controls

**Player 1:** Arrow keys + Z (fire) + X (pass)
**Player 2:** WASD + Q (fire) + E (pass)

### Scoring

- Goal = 10 points (x2 if multiplier active for scoring team)
- Tackle opponent = 2 points
- Collect all 5 stars on one side = 10 bonus points
- Credits earned post-match: `(your_score * 10) + (win_bonus: 5000) + (draw_bonus: 2000)`

### Match Rules

- 2 halves of 90 seconds each (configurable in options)
- Halftime: teams swap sides, player positions mirror vertically, timer resets
- After goal: scoring team's opponent gets kickoff from center
- Kickoff: ball placed at center, one player from receiving team starts next to ball, all others in formation positions in their own half
- Injured player: removed for 10 seconds, team plays with fewer players
- Match end: team with most points wins. Equal points = draw.

### Formations

Default formation (5 outfield + 1 keeper):
- **Keeper:** On goal line, center
- **2 Defenders:** Left-center and right-center, ~25% from own goal
- **2 Midfielders:** Left and right, ~50% (center line area)
- **1 Forward:** Center, ~25% from opponent goal

At kickoff and after goals, players reset to formation positions in their own half.

## AI System

### Team AI (State Machine)

Three top-level states based on ball possession:
- **ATTACKING** — team has ball: advance, pass, shoot, collect stars opportunistically
- **DEFENDING** — opponent has ball: mark players, intercept, tackle
- **LOOSE_BALL** — ball is free: nearest player chases, others position

### Player AI Behaviors

Individual player behaviors assigned by Team AI:
- Seek Ball, Run To Position, Pass, Shoot, Tackle, Mark Opponent, Guard Goal, Collect Star

### Difficulty Levels

| Parameter | Easy | Medium | Hard |
|-----------|------|--------|------|
| Reaction time | 500ms | 250ms | 100ms |
| Pass accuracy | 60% | 80% | 95% |
| Tackle aggression | Low | Medium | High |
| Star awareness | None | Sometimes | Always |

## Team Management (Light)

Between league matches, spend credits on:

- **Speed Training** — +1 SPD for selected player (10,000 credits)
- **Strength Training** — +1 STR for selected player (10,000 credits)
- **Defense Training** — +1 DEF for selected player (10,000 credits)
- **Buy Player** — Replace a player with a randomly generated better one (25,000 credits)

Stat caps at 15 per attribute. No gym mini-games — just select and buy.

## League Mode

- Start as Brutal Deluxe (weak team)
- 8 teams in the league, double round-robin (14 matches — play each opponent twice, home and away)
- Win = 3 pts, Draw = 1 pt, Loss = 0 pts
- After each match: earn credits, optionally upgrade team
- Win the league (most points after 14 matches) = game complete, show ending screen
- If player finishes below 1st: "Season Over" screen with final standing, option to retry the league
- AI vs AI results for other fixtures are simulated (random, weighted by team strength)

### League Teams

| Team | Avg SPD | Avg STR | Avg DEF | Tier |
|------|---------|---------|---------|------|
| **Brutal Deluxe** | 4 | 4 | 4 | Weakest (player's team) |
| **Revengers** | 5 | 6 | 5 | Low |
| **Mean Machines** | 6 | 5 | 6 | Low-Mid |
| **Iron Fist** | 7 | 6 | 6 | Mid |
| **Steel Fury** | 7 | 7 | 7 | Mid-High |
| **Lethal Zone** | 8 | 7 | 8 | High |
| **Titanium Dogs** | 8 | 9 | 8 | High |
| **Super Nashwan** | 9 | 9 | 9 | Strongest |

Each team has 9 players (6 starters + 3 bench). Individual player stats vary ±2 from the team averages. Team colors are unique per team.

## Friendly Mode

- Pick any two teams from the league roster
- Choose control: P1 vs AI, P1 vs P2, AI vs AI (demo mode — runs normal match with no human input, camera follows ball as usual)
- Single match, then back to title

## Visual Style

- Base resolution: 320x224 pixels, scaled up with integer scaling (nearest-neighbor) to fill the browser window
- Pixel-art sprites: 16x16 or 24x24 player sprites with 8-directional run animation + tackle + throw + injured
- Arena tiles: metallic/industrial floor, colored goal areas, glowing elements for stars/multipliers
- HUD overlay: score, timer, team names — always visible, not scrolling
- Color palette: dark metallics (arena), bright team colors (players), neon accents (power-ups)

## Audio (Placeholder)

- Simple synthesized SFX for: goal scored, tackle hit, ball bounce, whistle (start/end/halftime), crowd ambient
- Can use Phaser's built-in sound generation or small audio files
- Background music: optional, low-priority

## Project Structure

```
speedball2/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts                 # Phaser game config, entry point
│   ├── config/
│   │   ├── gameConfig.ts       # Constants (arena size, timing, scoring)
│   │   └── teams.ts            # Team/player definitions and stats
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── TitleScene.ts
│   │   ├── LeagueScene.ts
│   │   ├── TeamMgmtScene.ts
│   │   ├── FriendlyScene.ts
│   │   ├── MatchScene.ts
│   │   └── ResultScene.ts
│   ├── entities/
│   │   ├── Player.ts           # Player sprite, stats, state
│   │   ├── Ball.ts             # Ball physics, ownership
│   │   ├── Goalkeeper.ts       # Keeper-specific behavior
│   │   └── ArenaElements.ts    # Stars, multipliers, domes, warps
│   ├── systems/
│   │   ├── MatchEngine.ts      # Rules, scoring, timer, game state
│   │   ├── PhysicsManager.ts   # Collision setup, responses
│   │   ├── AIController.ts     # Team + player AI
│   │   ├── InputManager.ts     # Keyboard bindings for P1/P2
│   │   └── AudioManager.ts     # Sound effects
│   ├── ui/
│   │   ├── HUD.ts              # In-match score/timer overlay
│   │   ├── MenuComponents.ts   # Reusable menu UI elements
│   │   └── LeagueTable.ts      # League standings display
│   └── utils/
│       ├── types.ts            # Shared enums, interfaces, type definitions
│       └── helpers.ts          # Utility functions
├── public/
│   └── assets/
│       ├── sprites/            # Player sprites, ball, arena elements
│       ├── tiles/              # Arena tilemap
│       ├── audio/              # Placeholder SFX
│       └── fonts/              # Pixel font
└── docs/
```

## Out of Scope (v1)

- Online multiplayer
- Full gym training mini-games
- Player transfers / market system
- Cup/knockout tournament mode
- Gamepad support (can be added later)
- Mobile touch controls
- Save/load game state (can use localStorage later — note: league progress is lost on page refresh in v1, this is a known limitation)
