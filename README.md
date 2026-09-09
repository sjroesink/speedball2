# Speedball — Neon League

A browser sports game inspired by Speedball 2, with original Blender assets, Three.js rendering and an authoritative Go server using WebTransport / HTTP/3 / QUIC. There is no WebSocket fallback.

## Run locally

Requires Node.js 22+ and Go 1.27+. Exported GLB assets are included.

```powershell
npm install
npm run server
```

In a second terminal:

```powershell
npm run dev
```

Open http://localhost:5188 in a WebTransport-capable browser such as Chrome or Edge. Create an arena and share its six-character code with a second player. Training works without the server.

Matches fill the browser viewport and request native fullscreen. The camera follows the ball. Each team has nine players, including a goalkeeper. You control the available player nearest the ball; your teammates use AI. Teams switch ends after the first 90-second half.

## Controls and scoring

- WASD / arrows: move and aim in eight directions. W moves up the screen.
- Tap Space: low throw. Hold through the 160 ms wind-up: automatic lob. E: immediate lob.
- Without the ball, Space slides or jumps toward a nearby high ball. Shift always slides, even on a miss.
- During the throw wind-up, hold a perpendicular direction to angle a straight throw at release. The ball cannot be steered after release. Jump to catch high balls; low balls can be caught from the ground.
- Goals score 10 points. Shots above the crossbar or outside the narrow goal rebound off the end wall.
- Each wall star scores 2 points. A complete bank awards another 10 at the next bonus clock pulse, then clears for reuse. Opponents can extinguish a star before that pulse to cancel the bonus; extinguishing always deducts exactly 2 points.
- Court domes score 2 points. Throw a low ball lengthwise into a side loop to build your scoring multiplier. Opposing trips remove one level before building their own multiplier. Stars and multipliers reset at halftime.

## Match features

| Pickup | Effect |
|---|---|
| Freeze | Stops the opposing team for six seconds |
| Reverse controls | Reverses the opposing human player's movement for six seconds |
| Weaken / boost | Reduces opposing / increases friendly performance for six seconds |
| Manic | Boosts both teams for six seconds |
| Slow | Slows opponents for six seconds |
| Ball magnet | Gives the collector possession immediately |
| Ball transport | Gives possession to the leading available teammate |
| Goal lock | Blocks the collecting team's goal for six seconds |
| Shield | Protects the collecting team from tackles, zap and electroballs for six seconds |
| Full energy | Restores the collector's energy |
| Zap | Damages and knocks down available opponents |

One temporary effect is active at a time; a new temporary effect replaces the old one. Instant pickups do not clear temporary effects. Seven pickup slots rotate two power tokens, four credit pickups and one equipment token. Pickups are collected automatically and respawn. Credits are recorded for the current exhibition match; there is no transfer shop.

Eight equipment categories improve aggression (earlier AI tackles), attack (tackle reach), defence (damage resistance), speed, throw strength, power (damage), stamina (damage resistance) or intelligence (ball anticipation). Equipment is lost on a hit.

Energy loss reduces performance. At zero energy the player is injured: the opponent scores 10 points with any multiplier, the clock stops for a six-second medical evacuation, and a substitute enters. The three bench players rotate: the first enters and the outgoing player joins the back with weakened attributes rounded down to tens. Substitutions do not exhaust the bench. Damage persists after goals.

Four warp-gates at the original latitudes (approximately X = +/-8.01) on both side walls move low balls to the opposite wall while preserving direction. High balls rebound normally. Two electro-bounces opposite the star banks charge the ball for one to three hits, fixed by the multiplier at throw time. They relaunch the ball away from the emitter at full throw speed; another bounce does not replenish used hits. Charged balls with remaining hits knock opponents down instead of being caught; shields protect the catcher. The charged appearance persists after hits are exhausted. Friendly catches preserve it; opposing catches clear it when the ball is moving. A new throw clears the charge.

The HUD displays energy, equipment, reserves, credits, active effects and remaining duration, charged-ball hits and medical stoppages.

## Blender assets

`assets/build.py` authors all arena, player, ball, pickup, gate, target, impact and medic meshes in Blender 5.2. No original game sprites or disk images are shipped. Editable sources are in `assets/*.blend`; exports are in `public/assets/*.glb`. Players include Run, Slide, Jump, Throw and Hit animation clips. `speedball.blend` contains the arena/player composition; `pickups.blend` and `medic.blend` contain the additional models.

```powershell
npm run assets
```

The launcher uses Blender 5.2's standard Windows installation path or `blender` on other systems. Set `BLENDER_PATH` to override it. Exports use temporary files and replacement retries to avoid Windows file locks during live reload. Blender Python errors fail the build. HUD elements and selection indicators are browser UI; optional sound effects use Web Audio.

## Architecture

- `server/game.go`, `server/features.go`, `server/bonuses.go`: 25 Hz authoritative simulation, matching the original PAL gameplay cadence. Snapshots are sent every simulation tick; rendering remains independent.
- `server/main.go`: rooms, sessions, origin checks and certificates.
- `server/wire.go`, `src/wire.js`: binary protocol v3. Complete snapshots including 18 players and all match features remain below 1200 bytes.
- Input and snapshots travel as WebTransport datagrams. Sequence numbers reject stale packets; action counters retain short button presses between ticks. The server accepts no client positions or scores and neutralizes movement after 300 ms without input.
- `src/game.js`, `src/features.js`: local training simulation. The renderer interpolates player positions; client prediction and lag compensation are not implemented.
- Empty lobbies expire after ten minutes; leaving closes the match for both players.
- Local development generates a 13-day ECDSA P-256 certificate. Browsers verify its SHA-256 hash from `connection.json`; TLS validation is never disabled. Restart/reload server and client together after protocol changes.

## Internet deployment

The game is tested locally and is not publicly hosted. Serve the frontend over HTTPS and expose UDP 4433 directly to the Go server. A normal HTTP reverse proxy does not automatically support WebTransport.

```powershell
npm run build
go build -o speedball-server.exe ./server
./speedball-server.exe -public-url https://arena.example.com:4433/play -origins https://play.example.com -cert /certs/fullchain.pem -key /certs/privkey.pem
```

Replace the example domains and certificate paths. Proxy the HTTP frontend on port 8088, including the dynamic `/connection.json` route. Public certificates use normal browser certificate validation. `-addr` configures the UDP listener; `-web-addr` configures HTTP. Port 5188 is for development.

The Dockerfile builds the frontend and server in multiple stages. Publish `4433/udp`, expose the HTTP frontend and mount certificates read-only. Docker deployment and public internet connectivity have not been validated.

## Validation and scope

Enable **SOUND ON** in the lobby or the full-screen toolbar. Original synthesized effects distinguish throws, catches, goalkeeper deflections, sliding, slide recovery, jumps, landings, impacts, wall rebounds, scoring, pickups, warps, electric balls, injuries and substitutions. Whistles mark kickoff, halftime and full time. Effects use stereo position across the court, bounded polyphony and a compressor. Muting, opening the menu or hiding the tab stops current sounds. Snapshots repeat the latest 16 gameplay events so short packet gaps do not drop retained sounds; repeated events play only once. Longer gaps can exceed this history. Audio starts only after pressing the sound button; no original commercial sound samples are included.

```powershell
go test ./server
go vet ./server
npm test
npm run build
```

Tests cover actions, throws, catches, collisions, scoring, power effects and expiry, injuries and substitutes, equipment, warp-gates, charged balls, goal locks, audio lifecycle and packet size. JavaScript tests decode an actual Go-generated protocol-v6 snapshot. Two local browser clients are used for WebTransport checks.

This is an exhibition-match adaptation. Career/league management, transfers, persistent injuries between matches, ranked matchmaking, accounts, reconnect and touch controls are not included. Attribute values, damage, pickup timing and AI are tuned for this remake rather than emulated cycle for cycle. See [original-game comparison](docs/original-comparison.md) for source findings and differences.

References: [webtransport-go](https://quic-go.net/docs/webtransport/), [WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport/WebTransport), [original coaching manual](https://retrogames.biz/games/c64/speedball-2/), [Amiga reverse engineering](https://github.com/simon-frankau/speedball2-re-amiga).
