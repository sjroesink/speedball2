# Original-game comparison — 8 September 2026

**Timing correction:** the earlier audit entries that assume 50 simulation ticks/second are superseded by the final match-clock audit below. Default Amiga gameplay runs at 25 ticks/second, with each tick waiting for two PAL video frames.

Reference material inspected:
- User supplied `Speedball 2 - WIP 02.zip`: C# `Player.cs` (sub_F020 / sub_F078, action selection and tackle routines), `Match.cs` (nearest-player selection, ball speed and warp gates), `Entity.cs`, `Field.cs`, `Electrobounces.cs`.
- https://github.com/simon-frankau/speedball2-re-amiga : `throwing_action_fn` at 0x107be, low/high ball animation selection at 0x10872, direction-to-velocity tables and action symbols.
- Original Amiga visual reference: https://thekingofgrabs.com/2023/01/25/speedball-2-brutal-deluxe-amiga/speedball-2-brutal-deluxe-amiga-13/

## Findings and implementation

The throw routine waits for animation index 4 and then checks the held fire bit. Both low and high throws use velocity table 8. This remake now starts a visible wind-up on press, keeps the player planted, and launches automatically after 160 ms. Releasing during that interval produces a low throw; holding produces a lob. Both start at 24 world units/second. These world-unit values and the 160 ms duration are tuning choices, not a claim of cycle-exact emulation. A short input pulse between network ticks still produces a low throw. Eight-way human movement has equal axial and diagonal speed.

The supplied goal check accepts transverse coordinates 272–368 on a court bounded by 32–608. That is one sixth of the court width. The goal half-width is now 1.85 world units instead of 3.8; geometry and keeper positioning match it.

AI outlet passing and low-shot keeper slides reduce the previous tendency to simply carry the ball toward goal and throw into pressure. Outlet selection is a new heuristic; it is not a port of the original AI.

The visual redesign uses blue/red enamel helmets, exposed faces/hands, silver shoulder and body armor, jointed limbs, and native Blender Run/Throw/Jump/Slide/Hit animation clips. The arena has larger steel plates, rivets, oxide-red 25/50 markings and dark metallic domes. All shipped meshes remain authored in Blender; neither the ZIP's disk images nor original sprites/binaries are shipped. The ZIP and extracted research files are ignored by Git.

## Remaining differences

This is still an adaptation. Ball flight uses continuous 3D gravity instead of sprite animation tables. Tackle probability and damage now use original attribute rules as detailed below; original movement/throw attribute effects, detailed AI and league management remain unfinished. The original 2D sprites show bodies from an illustrative angle independently of the court projection; the 3D camera uses a compromise angle for readable bodies and ball tracking.

## Validation

Paired Go/JavaScript tests cover the wind-up, automatic held throw, short input pulses, eight-way movement, outlet selection and existing tackle/catch/scoring rules. Blender exports contain the five named animation clips. Production frontend build and Go vet are also checked, with browser training and two-client WebTransport checks.

## Match feature completion

Inspected the supplied C# Token.cs, Player.cs injury/medic handling, Entity.cs pickup/equipment handling and Match.cs warp checks. Implemented all twelve token effects, six-second temporary effects with global replacement, eight equipment categories, four credit pickups, health damage, three reserves per team and medical clock stoppage. Continuous-world damage amounts (base 20 per tackle), six-second medical travel, spawn placement/rotation and equipment factors are gameplay tuning choices; the original has a richer attribute system and screen-relative zap targeting. Our zap still affects all available opponents. Pickup eligibility and transport targeting have since been corrected as described below.

Warp gates preserve ball direction and work only for low balls. Electro-bounce charge comes from the scoring multiplier and is consumed on enemy hits. Shields protect against contact, zap and charged balls. All state is included in binary snapshot v3 and applied by the authoritative Go simulation, with a local JavaScript counterpart. Go-produced snapshot fixtures are decoded in a JavaScript test to catch wire-format drift.

## Fidelity audit: pickup eligibility and transport

The supplied `Entity.cs` routines `sub_FC3C_Think_Coins`, `sub_FC9C_Think_Token`, and `sub_FD92_Think_Equipment` only test the selected player of each team, with team 1 taking priority. Their `CalcDistanceToEntity_Lesser16` helper rejects falling and jumping players. Both simulations now enforce selected, grounded pickup collection and team-order priority. Removed the unsupported detours that sent unselected AI players to collect floor items. The current 0.85-unit collection radius remains a tuning approximation; original coordinate distance and projection still need reconciliation.

`Token.Init_Transport` explicitly targets team roster index 8 and returns without transferring when that player is falling. Both simulations now target that fixed slot in either half, without choosing a different recipient when it is unavailable. They retain the existing health/stun availability checks.

Regression tests cover both teams and halves, unavailable transport targets, unselected/jumping collectors, and simultaneous collection priority for tokens, credits and equipment. Go tests and all 24 JavaScript tests pass; production build passes. This verifies these corrections, not full original-game parity.

Outstanding fidelity work still includes original attribute values and their effects, directional/probabilistic tackling, discrete ball-flight and action timing, original AI and selection rules, screen-relative zap, pickup spawn timing/placement and exact distance metrics, medical sequence timing, and a systematic audit of field scoring and reset rules. These must be checked against reference routines rather than inferred from current passing tests.

## Fidelity audit: tackle contact and possession

`Player.sub_ED92_TackleCheckHit_Helper` switches the attacker to `sub_F2E2` on the first eligible contact, even when the success roll fails. A successful attacker who is not falling takes the ball directly from the victim. Both simulations now stop further contact checks for that slide and transfer possession directly on success, preserving the knockdown. A new slide resets that internal contact state. Shielded, fallen and unavailable opponents do not consume the contact. Updated the previous loose-ball test because it asserted the behavior contradicted by the reference. Regression tests additionally keep a second opponent in contact on subsequent ticks to ensure one slide cannot knock down multiple players.

Cross-checking the Amiga disassembly uncovered an actual version difference: `get_tackle_difficulty` at 0x105ba boosts goalkeeper defense by one quarter (logical shift right by 2), whereas the supplied C# port adds one half. Use the Amiga routine as the authority for the intended Amiga gameplay. Its direction penalties at 0x024a are [32,24,16,8,0,8,16,24], sliding reduces defense by 16, and jumping reduces it by 32. These subtractions operate on bytes, so wrapping matters. The threshold is `(attack + 256 - adjustedDefense) >> 1`; the caller compares a random byte inclusively. The subsequent attribute implementation below replaces guaranteed success with this threshold and the reference random generator.

`damage_player` at 0x1061a computes `max(1, (power + 150 - stamina) >> 4)` health damage, followed by attribute deterioration and equipment removal. Fixed hit damage has now been replaced as detailed below; movement and throw strength remain approximations. These findings are recorded to avoid substituting new tuning constants for original rules.

## Fidelity audit: attributes, tackle rolls and damage

Added eight current attributes and power/armour restoration state to each simulated player. The default exhibition roster uses the eight 100 values in the Amiga initial stat blocks (0x583a onward); this is not yet a port of the original league rosters or training economy. `get_tackle_difficulty` now determines contact success in both simulations, including the Amiga goalkeeper quarter-bonus, facing penalties, sliding/jumping modifiers, byte arithmetic and inclusive comparison. Removed attack equipment's invented reach increase and the unsupported forward-only contact filter. Contact distance itself remains the existing 1.15-unit Euclidean approximation pending coordinate reconciliation.

Ported `rand` at 0x14e78 using both 32-bit seed words, word-size add-with-extend and swap semantics. Tests compare eight whole-word outputs against a separate instruction-order transcription. It currently advances for tackle rolls only; original AI, spawning and menu calls consume the same stream in the original game, so this does not reproduce an entire original match's random call sequence. Failure consumes the tackle contact and cannot retry on subsequent ticks.

Damage now uses original power/stamina integer arithmetic for tackles, zap and electro-ball hits, followed by half-damage attribute deterioration with a floor of 100 and armour restoration. The original initial full energy of 128 is represented as 100 percent in the existing HUD/state health field; each damage unit removes 100/128 percentage points. Temporary weaken/boost/manic/slow powers set their affected attributes to 100/250 and restore backups on expiry/replacement. Armour sets its attribute to 250 and preserves the power backup order. Full Energy restores the default exhibition attributes and removes equipment. Goal resets preserve attributes and their backups. Movement, throw velocity and AI still use their prior approximations and require conversion to the original tables; adding attributes alone does not complete those mechanics.

Binary snapshot version 4 now includes all eight current attributes per player. The Go-produced fixture is decoded and asserted in JavaScript, and remains below 1200 bytes. Paired tests cover successful and failed tackles, no repeat roll, facing and keeper modifiers, damage and deterioration, and power/armour restoration. Go tests/vet, all 30 JavaScript tests and production build pass. Browser play verification for this revision is still pending.

## Fidelity audit: movement tables

The Amiga `direction_to_velocity` tables at 0x7812–0x7912 use full integer velocity on both diagonal axes. The previous equal-magnitude diagonal normalization was incorrect and has been removed for players. Human and AI movement now select one of eight table directions. `preconfigure_player_move` at 0x103f4 starts at level 4, increments above speed 140 and again above 200, then adds one level when not holding the ball. Sliding starts at 5 and jumping at 4, with strict thresholds 140/170/200; the qualifying goalkeeper block uses level 8. Current timing still integrates at 60 Hz, with velocity conversion from the reference 50 Hz match clock and court width: 50 * 22.4 / 576 world units per table step per second. This preserves distance-per-second but does not yet reproduce the original frame quantization. Court length/projection reconciliation remains outstanding.

Movement now reads the actual speed attribute, without health-percentage scaling or extra percentage equipment/power factors. Thus Slow/Weaken set a fast athlete back to baseline; they do not halve the movement of an athlete who already has speed 100. Boundary tests cover every transition, carrying, sliding, jumping, goalkeeper block and power expiry. Previous tests asserting equal diagonal speed or fixed percentage slowdowns were corrected to match the disassembly.

Throw research: `set_ball_speed` at 0x108e0 sets a frame timer to floor(throw/2), and the first slowdown threshold to floor(throw/4)+floor(throw/8)+floor(throw/16). It does not multiply initial launch velocity. `step_slow_ball` at 0xd89a subsequently reduces each nonzero velocity component by one at threshold crossings and after timer expiry, with extra height/end-zone guards. These findings still need implementation; existing throw launch multipliers and continuous rolling drag remain incorrect. The reference velocity-8 launch is also slower than our existing 24-unit launch after court-scale conversion. Ball flight/slowdown must be corrected together.

## Fidelity audit: throw sustain and ball slowdown

Implemented `set_ball_speed` and the threshold schedule from `step_slow_ball` in paired ball modules. Throws now use velocity table 8 on both axes, converted using the same reference coordinate scale as players. Throw attributes set sustain timers rather than increasing launch velocity; both high and low throws launch at that same horizontal speed. Removed the previous 24-unit launch, equipment launch multiplier, health-based strength helper and exponential ground drag.

The slowdown runs on accumulated 50 Hz ticks, independently of the 60 Hz host simulation. At each threshold crossing it subtracts one reference velocity unit from each nonzero component and updates the next threshold to floor(previous/2)+floor(previous/4). At timer zero it reduces each tick. Tests trace throw=100 reductions at frames 9,21,30,36,40,43,46,48 and throw=250's first reduction at frame 19. Owner and longitudinal end-zone guards are reproduced. The last nonzero velocity step is retained in the air; the existing height field maps original ground height zero to world height 0.25.

This is not yet a complete port of ball behavior: vertical flight still uses continuous gravity, aftertouch remains approximate, ordinary wall rebounds still use a loss factor, special bumpers/warps do not yet reset speed/timers like the original, and score-multiplier travel is not yet represented as the original dedicated action. Consequently full match flight/trajectory parity is still unverified. Slowdown state is internal to authoritative/local simulations; the renderer receives resulting positions/velocities through the unchanged v4 snapshot.

Go and JavaScript regression tests cover the exact slowdown frame sequence, both velocity signs, launch/sustain separation, 50/60 Hz accumulation equivalence, airborne stop prevention and owner/end-zone guards. All 36 JavaScript tests pass; final Go/build checks follow this revision.

## Fidelity audit: wall reflection and warp relaunch

`Entity.MoveAndHandleWallsAndBounce` reverses a ball's relevant velocity component without reducing its magnitude; longitudinal rebounds also subtract floor(timer/2) from the sustain timer. Removed the invented 0.92 rebound multiplier and implemented that timer adjustment. Collision positioning still uses continuous mirrored overshoot rather than the reference frame's clamp-then-move sequence, so exact corner/contact timing remains outstanding.

The Amiga `step_warp` at 0xe072–0xe116 places the ball on the opposite boundary (discarding overshoot), reloads direction-to-velocity table 8, and resets sustain from the last thrower's current throw attribute. Added internal direction state so aftertouch drift is distinguishable from nominal throw direction. The Amiga-only code at 0xe0fc preserves transverse drift when nominal direction is straight up/downfield; this differs from the supplied C# port, which always reloads both components. Both simulations now implement the Amiga exception. Current warp entrance dimensions and the world-height approximation still require the wider field/vertical-animation audit.

Tests cover velocity magnitude, reflected nominal direction, odd sustain timer rounding, both warp exit walls, fresh sustain and retained transverse drift. All 38 JavaScript tests pass. These corrections do not establish full trajectory parity: vertical flight, exact collision positioning, special domes/electro-bounces, aftertouch and multiplier traversal still need work.

## Fidelity audit: release steering

Amiga `throwing_action_fn` at 0x10882–0x108d0 applies a one-time controller adjustment at release. If the transverse velocity is zero, left/right input sets it to -4/+4; otherwise, if longitudinal velocity is zero, up/down input sets it to -4/+4. No adjustment applies to diagonal throws. Both low and high throws use this branch. The ball's nominal direction remains unchanged, which matters for warp drift preservation.

Both simulations now sample release input at the end of wind-up and apply the four-unit perpendicular component, converted with the reference velocity scale. Removed the invented 0.45-second continuous steering window. Immediate lob input uses the same adjustment. AI currently supplies no release adjustment, consistent with the current AI's lack of a original input sequence; that AI remains to be ported. README controls now describe the implemented release timing accurately.

Tests cover both axes and signs, low/high throws, diagonal exclusion, preservation of nominal direction and a full wind-up/release sequence followed by opposite input that cannot alter the airborne ball. Go tests and all 40 JavaScript tests pass. Full gameplay parity remains unproven, especially original flight animation, AI, field-object state machines, screen-relative rules and exact match tick ordering.

## Fidelity audit: low and high throw flight stages

Read the complete numerical sequences directly from the user-supplied `Amiga.dmp` at 0x6c32 (49 words including terminator) and 0x6c94 (18 words), and cross-checked the high sequence against the Atari table at 0x54c6. No original sprites or binary resources were copied into the game. The low flight holds stage 1 for 16 frames then stage 0. The high flight transitions at frames 1/3/6/10/15/21/28/34/39/43/46/48 through stages 1/2/3/4/5/6/5/4/3/2/1/0. The 0xfffe terminator holds the final stage.

Thrown balls now advance through these sequences on a 50 Hz accumulator. Removed gravity from low/high throws; unrelated loose-ball launch/drop states still use the previous gravity fallback pending their own original action sequences. Rendering maps stage n to height 0.25+0.5*n, a visual approximation rather than an original 3D height. Standing catches and goal eligibility use stages <=2 directly, and jumping permits catches at higher stages, matching `Player` catch handling and `Match.CheckGoal`. Flight mode is cleared on possession/drop; landed throws remain at ground height.

Tests cover every high-flight transition, low landing at frame 17, final-stage hold, 50/60 Hz agreement, high-stage standing/jumping catches and rejection of a stage-3 shot at goal. Timing relative to the original global match update order, launcher/catch/drop animation sequences, boundary margins and visual verification remain outstanding. This is progress toward full parity, not proof of completion.

## Fidelity audit: full star banks and extinguishing

Amiga `step_stars` at 0xe118 awards only the ordinary star points on impact and has no height rejection. `check_all_stars_lit` at 0xd682 awards the ten-point completion bonus on a later match clock pulse, clearing all five lights first. An opponent can extinguish a star before that check and prevent the completion bonus. The extinguish instructions at 0xe1b6/0xe1ea subtract exactly two, bypassing the scoring multiplier. Both simulations now implement these rules; the previous immediate completion bonus and multiplier-scaled subtraction were incorrect. Removed the shared height guard from stars while retaining the existing multiplier-ramp guard pending its separate audit.

The completion pulse uses the reference default clock: 50 PAL frames divided by `frames_per_tick=2`, confirmed by `Match._timeSpeed=2`, giving one pulse every 0.5 real seconds. It continues during medical/goal pauses as the reference full-bank check precedes the paused-clock test. The rest of the match clock and temporary-power countdown still use the prior cadence; reconciling them and exact global phase/update ordering remains outstanding. Star physical positions and contact intervals also remain the existing arena layout, not yet the original terrain cells.

Regression tests cover both halves, repeatable banks, no early/double payout, a high-ball star hit, doubled score awards, and an opponent cancelling a pending completion while deducting only two. README and in-game rules describe completion and clearing. Go tests and all 46 JavaScript tests pass. Full gameplay parity is still incomplete.

## Fidelity audit: frame synchronization and shared match clock

`match_tick` at 0xd064–0xd06e waits until `frame_timer` reaches `frames_per_tick` (default 2), then resets that video-frame counter. This proves a default simulation rate of 25 ticks/second on 50 Hz PAL output. My earlier conversion treated each simulation iteration as one video frame and was wrong. Corrected movement/throw velocity scaling to 25 * 22.4 / 576, and changed flight/slowdown accumulators to 25 Hz. The frame-index sequences remain unchanged: the lob now lands at 48/25=1.92 seconds, and throw=100 first slows at 9/25=0.36 seconds. The independent C# remake's UI timer is 1000/31 ms, so it should not override the Amiga timing evidence.

`update_match_time` subtracts two from its 50-count clock each simulation tick. Therefore its pulse occurs once per real second, not every half second. Replaced the star-only pulse with a shared match clock: completed banks pay first, remaining match time decreases only while play is not stopped, and temporary powers decrement even during medical/goal stoppages. Attribute backups restore on the expiry pulse. Removed continuous match-time/power decrements; power lifetimes are quantized to the global second phase as in the original. A complete bank at the final second is paid before halftime clears the field. Updated tests that previously encoded the incorrect cadence.

Current verification: paired tests cover default rate conversion, 25/60 Hz animation/slowdown equivalence, delayed second pulses, power expiry during medical and goal pauses, and completed-bank payout on the halftime boundary. Go tests and all 47 JavaScript tests pass. Full global tick ordering, discrete player positions/actions, AI, variable-speed settings and rendered gameplay still require audit; a 60 Hz host with per-feature 25 Hz accumulators is not cycle-exact emulation.

## Fidelity audit: automatic player selection and demo checkpoint

Amiga `select_active_player` at 0xd9ea selects the nearest roster member and resolves equal distances in favor of the later index. Both simulations now use the integer vector-length approximation from 0xdaf6, without the previous goalkeeper/current-player distance bonuses or action lock. Ball possession retains selection priority. Regression tests cover switching during an action, removal of goalkeeper preference, equal-distance ordering and possession. The existing stunned-player exclusion and conversion from continuous world coordinates remain adaptations; original sprite-origin offsets and cached-distance update ordering still need reconciliation.

Checkpoint verification: Go tests, Go vet, all 48 JavaScript tests, production build and whitespace checks pass. Browser training renders across the viewport and advances normally without console errors. Two browser tabs successfully created/joined the same WebTransport arena with protocol v4 and displayed the same live match clock. This is a playable fidelity checkpoint, not complete original-game parity. Audio expansion is still pending.

## Audio checkpoint

Replaced the single oscillator beep with original synthesized, layered effects for all sixteen event kinds, plus kickoff and full-time whistles. Added a catch event to both simulations. Noise filtering, short amplitude envelopes, stereo positioning, a compressor and a 32-voice limit provide distinct throws/catches, impacts, wall rings, score chimes, warp sweeps and medical signals. These are new sounds, not reproductions of original audio samples. The supplied C# remake leaves sound calls as TODOs, so it provides no completed audio implementation to port.

Audio is explicitly unlocked by a user gesture. The lobby and full-screen buttons stay synchronized; Space continues controlling the game after toggling sound. Menu, hidden-tab, mute and match-reset transitions stop active voices. Snapshot IDs prevent duplicate/out-of-order event playback; local audio observes each simulation step. The existing single-event snapshot can still omit intermediate events during simultaneous actions or network loss; a bounded event history is needed to close that gap. No claim of a complete original soundscape or listening-based mix verification is made.

Verification: all 51 JavaScript tests, Go tests, Go vet and the production build pass. Tests exercise event deduplication/reset, context unlock failure, voice limits, mute/pause cleanup and catch-event emission. Browser checks cover full-screen placement, sound toggling, Space retaining enabled sound, action input and absence of runtime errors. The server was restarted with catch events enabled. Exact gameplay parity remains incomplete.

## Fidelity audit: multiplier entry and loop travel

Amiga `step_start_multiplier` (0xdd60), `change_score_multiplier` (0xdf02) and `step_run_multiplier` (0xdfe8) agree with the C# `ScoreMultipliers` implementation. The left entrance occupies terrain X 48..63, Y 576..640; the right uses X 577..592, Y 512..576. Only nominal longitudinal directions and flight stages <=2 enter. Other contacts use the reference two-velocity lookback to reflect components. A plain transverse wall hit no longer changes the multiplier.

Read four 49-position signed-byte paths from the supplied Amiga dump at 0x42c2, 0x4326, 0x438a and 0x43ee. Both simulations follow these at 25 Hz, applying the multiplier change on position 22 and restoring eight-unit longitudinal speed and throw-based sustain at the terminator. An opposing trip removes one level first; levels remain capped at two. Ordinary movement, wall collision and catching do not run while the loop owns the ball position. Entry uses the existing continuous-coordinate host simulation, so exact global tick phase and original sprite animation are still adaptations.

Rebuilt the arena in Blender with grooves derived from the same numerical paths, correctly offset to either side of midfield. Openings in the outer barrier keep the loop visible. Editable `.blend`, exported `.glb`, source and numerical data are included. `npm run assets -- --arena-only` rebuilds just the court. Browser screenshots verified the two loop positions, visible entrances and successful asset loading without console errors; a manually played loop traversal has not yet been observed in the browser.

Verification: Go tests and vet pass, all 58 JavaScript tests pass, and the production build succeeds. Coverage includes all four routes, step-22 coordinates/award timing, exit speed, invalid/high/carried/diagonal entry, opposing-level removal, side reflection, 25/60 Hz host agreement, no immediate recapture at exit, and equality of Blender/simulation path data. The Go server was restarted. Remaining fidelity work includes other arena-object geometry/state machines, exact global simulation ordering, AI, injuries/substitutions and reliable event delivery for audio; this checkpoint does not complete the objective.

## Fidelity audit: court bumpers

Amiga `step_bumpers`/`step_bumper` (0xe3c6/0xe3ea) and C# `BounceDomes` reject held balls and flight stages above two, use a 16-unit axis bound and the integer vector-length radius, then launch away from the bumper using `get_object_to_point_direction` (0x10b2c). Its strict half-axis thresholds differ from angle rounding. There is no incoming-velocity dot-product requirement or push-out. Each component is reloaded from the eight-unit velocity table, throw sustain is reset, the existing ball animation restarts and the last thrower's team receives two multiplied points. The exact center has no direction and earns no points.

Read the two sprite centers from the supplied Amiga dump at 0x6276 and 0x62a0: terrain (320,320) and (320,832), both with zero Y-origin adjustment. Moved the Blender bumpers from the incorrect side-by-side midfield positions to the longitudinal center line at world X +/-256*22.4/576, Z=0, and reduced their radius to 16*22.4/576. Both simulations implement the reference radius, direction thresholds, fixed launch speed, sustain and flight restart. Collision checks use a 25 Hz accumulator; ordering relative to motion and the global original tick remains to be reconciled.

Go tests/vet, all 60 JavaScript tests and the production build pass. Regression cases cover eight directions, exact half-axis boundaries, both centers, held/high-ball exclusion, radius bounds, center exclusion, sustain and multiplied scoring. Rebuilt the arena through Blender and checked its loaded overview in the browser. The complete original update order, other hardware positions, AI and injury sequence are still unfinished.

## Fidelity audit: star-bank terrain cells

Amiga `step_stars` (0xe118) tests the left boundary at terrain X<=32 and Y in [384,544), and the right at X>=608 and Y in [608,768). It selects the star by shifting the bank-relative Y coordinate right five bits. Replaced the invented spaced centers and narrow hit windows with these complete, contiguous 32-unit cells. The function excludes ordinary held balls but permits the throwing action, and has no height restriction. Contact now uses the wall coordinate before reflection; a free ball exactly on the boundary is checked too. Global ordering and the separate held-ball throw sequence still need the broader original simulation audit.

Moved all ten Blender targets and housings to their cell centers: left Y=400+32*i, right Y=624+32*i, converted to the existing world scale. Rebuilt the editable arena and glTF. A full-screen browser screenshot confirms both five-star banks are visible beside midfield with the new spacing, and no runtime errors were reported. Scoring ownership, delayed bank payout and extinguishing rules remain covered by existing tests.

Verification: Go tests/vet, all 62 JavaScript tests and the production build pass. New tests cover each of the ten cells at start, center and last integer coordinate, both bank endpoints, interior exclusion, high balls and throwing-carrier eligibility. Full original gameplay parity remains unfinished; next hardware audits include warp/electro contact rules and their exact geometry, followed by global timing, AI and medical sequences.
