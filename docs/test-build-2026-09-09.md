# Test checkpoint — 9 September 2026

This checkpoint is ready for local playtesting; full original-game fidelity is
still in progress. Work is paused at the user's request after pushing this build.

Open http://localhost:5188 after waking the PC and refresh the page. If the
services are no longer running, use `npm run server` and `npm run dev` in separate
terminals from the project directory.

Start with Training. Try moving and tackling, tapping Space for a low throw,
holding Space or pressing E for a lob, and bouncing the ball off the walls.
Enable sound and adjust its volume in the Escape menu. Check overhead camera
framing, player readability, foot motion and how quickly control returns after
action animations. Watch coins, equipment and power tokens on the court.

For multiplayer, create an arena in one browser session and enter its code in
another. Use two independent sessions rather than replacing an active match.
Internet hosting, reconnect and WAN latency remain unverified.

For a deterministic injury presentation check, open
http://localhost:5188/tools/medical-presentation-playtest.html and use
"Inspect fatal fall", "Inspect stretcher carry" or "Play medical sequence".
This page is a local diagnostic, not evidence of medical behavior over a network.

Recent changes include source pose/collision offsets, player processing order,
complete fall frames and medical timing, planted Blender running poses, a
separate prone Knockout animation, and adjustable sound volume.

Validation: 264 JS tests, Go tests/vet and production build pass. Long paired
simulation tests cover both halves; local WebTransport tests cover delayed and
dropped snapshots. Higher rendering FPS, subjective controls/audio balance,
complete original callback behavior and persistent career/progression remain
open. See fidelity-status.md for the scope and evidence limits.
