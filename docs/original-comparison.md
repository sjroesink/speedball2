# Original-game comparison â€” 8 September 2026

**Fall timing correction:** The full memory export reveals an internal -5 terminator after 26 ordinary fall frames. Earlier 35-frame/20-tick-tail claims are superseded by the integration entry below.

**Current status:** See [fidelity-status.md](fidelity-status.md) for current implementation and unresolved requirements. This file is a chronological research log; early implementation claims below are superseded by later entries.

**Timing correction:** the earlier audit entries that assume 50 simulation ticks/second are superseded by the final match-clock audit below. Default Amiga gameplay runs at 25 ticks/second, with each tick waiting for two PAL video frames.

Reference material inspected:
- User supplied `Speedball 2 - WIP 02.zip`: C# `Player.cs` (sub_F020 / sub_F078, action selection and tackle routines), `Match.cs` (nearest-player selection, ball speed and warp gates), `Entity.cs`, `Field.cs`, `Electrobounces.cs`.
- https://github.com/simon-frankau/speedball2-re-amiga : `throwing_action_fn` at 0x107be, low/high ball animation selection at 0x10872, direction-to-velocity tables and action symbols.
- Original Amiga visual reference: https://thekingofgrabs.com/2023/01/25/speedball-2-brutal-deluxe-amiga/speedball-2-brutal-deluxe-amiga-13/

## Findings and implementation

The throw routine waits for animation index 4 and then checks the held fire bit. Both low and high throws use velocity table 8. This remake now starts a visible wind-up on press, keeps the player planted, and launches automatically after 160 ms. Releasing during that interval produces a low throw; holding produces a lob. Both start at 24 world units/second. These world-unit values and the 160 ms duration are tuning choices, not a claim of cycle-exact emulation. A short input pulse between network ticks still produces a low throw. Eight-way human movement has equal axial and diagonal speed.

The supplied goal check accepts transverse coordinates 272â€“368 on a court bounded by 32â€“608. That is one sixth of the court width. The goal half-width is now 1.85 world units instead of 3.8; geometry and keeper positioning match it.

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

The Amiga `direction_to_velocity` tables at 0x7812â€“0x7912 use full integer velocity on both diagonal axes. The previous equal-magnitude diagonal normalization was incorrect and has been removed for players. Human and AI movement now select one of eight table directions. `preconfigure_player_move` at 0x103f4 starts at level 4, increments above speed 140 and again above 200, then adds one level when not holding the ball. Sliding starts at 5 and jumping at 4, with strict thresholds 140/170/200; the qualifying goalkeeper block uses level 8. Current timing still integrates at 60 Hz, with velocity conversion from the reference 50 Hz match clock and court width: 50 * 22.4 / 576 world units per table step per second. This preserves distance-per-second but does not yet reproduce the original frame quantization. Court length/projection reconciliation remains outstanding.

Movement now reads the actual speed attribute, without health-percentage scaling or extra percentage equipment/power factors. Thus Slow/Weaken set a fast athlete back to baseline; they do not halve the movement of an athlete who already has speed 100. Boundary tests cover every transition, carrying, sliding, jumping, goalkeeper block and power expiry. Previous tests asserting equal diagonal speed or fixed percentage slowdowns were corrected to match the disassembly.

Throw research: `set_ball_speed` at 0x108e0 sets a frame timer to floor(throw/2), and the first slowdown threshold to floor(throw/4)+floor(throw/8)+floor(throw/16). It does not multiply initial launch velocity. `step_slow_ball` at 0xd89a subsequently reduces each nonzero velocity component by one at threshold crossings and after timer expiry, with extra height/end-zone guards. These findings still need implementation; existing throw launch multipliers and continuous rolling drag remain incorrect. The reference velocity-8 launch is also slower than our existing 24-unit launch after court-scale conversion. Ball flight/slowdown must be corrected together.

## Fidelity audit: throw sustain and ball slowdown

Implemented `set_ball_speed` and the threshold schedule from `step_slow_ball` in paired ball modules. Throws now use velocity table 8 on both axes, converted using the same reference coordinate scale as players. Throw attributes set sustain timers rather than increasing launch velocity; both high and low throws launch at that same horizontal speed. Removed the previous 24-unit launch, equipment launch multiplier, health-based strength helper and exponential ground drag.

The slowdown runs on accumulated 50 Hz ticks, independently of the 60 Hz host simulation. At each threshold crossing it subtracts one reference velocity unit from each nonzero component and updates the next threshold to floor(previous/2)+floor(previous/4). At timer zero it reduces each tick. Tests trace throw=100 reductions at frames 9,21,30,36,40,43,46,48 and throw=250's first reduction at frame 19. Owner and longitudinal end-zone guards are reproduced. The last nonzero velocity step is retained in the air; the existing height field maps original ground height zero to world height 0.25.

This is not yet a complete port of ball behavior: vertical flight still uses continuous gravity, aftertouch remains approximate, ordinary wall rebounds still use a loss factor, special bumpers/warps do not yet reset speed/timers like the original, and score-multiplier travel is not yet represented as the original dedicated action. Consequently full match flight/trajectory parity is still unverified. Slowdown state is internal to authoritative/local simulations; the renderer receives resulting positions/velocities through the unchanged v4 snapshot.

Go and JavaScript regression tests cover the exact slowdown frame sequence, both velocity signs, launch/sustain separation, 50/60 Hz accumulation equivalence, airborne stop prevention and owner/end-zone guards. All 36 JavaScript tests pass; final Go/build checks follow this revision.

## Fidelity audit: wall reflection and warp relaunch

`Entity.MoveAndHandleWallsAndBounce` reverses a ball's relevant velocity component without reducing its magnitude; longitudinal rebounds also subtract floor(timer/2) from the sustain timer. Removed the invented 0.92 rebound multiplier and implemented that timer adjustment. Collision positioning still uses continuous mirrored overshoot rather than the reference frame's clamp-then-move sequence, so exact corner/contact timing remains outstanding.

The Amiga `step_warp` at 0xe072â€“0xe116 places the ball on the opposite boundary (discarding overshoot), reloads direction-to-velocity table 8, and resets sustain from the last thrower's current throw attribute. Added internal direction state so aftertouch drift is distinguishable from nominal throw direction. The Amiga-only code at 0xe0fc preserves transverse drift when nominal direction is straight up/downfield; this differs from the supplied C# port, which always reloads both components. Both simulations now implement the Amiga exception. Current warp entrance dimensions and the world-height approximation still require the wider field/vertical-animation audit.

Tests cover velocity magnitude, reflected nominal direction, odd sustain timer rounding, both warp exit walls, fresh sustain and retained transverse drift. All 38 JavaScript tests pass. These corrections do not establish full trajectory parity: vertical flight, exact collision positioning, special domes/electro-bounces, aftertouch and multiplier traversal still need work.

## Fidelity audit: release steering

Amiga `throwing_action_fn` at 0x10882â€“0x108d0 applies a one-time controller adjustment at release. If the transverse velocity is zero, left/right input sets it to -4/+4; otherwise, if longitudinal velocity is zero, up/down input sets it to -4/+4. No adjustment applies to diagonal throws. Both low and high throws use this branch. The ball's nominal direction remains unchanged, which matters for warp drift preservation.

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

`match_tick` at 0xd064â€“0xd06e waits until `frame_timer` reaches `frames_per_tick` (default 2), then resets that video-frame counter. This proves a default simulation rate of 25 ticks/second on 50 Hz PAL output. My earlier conversion treated each simulation iteration as one video frame and was wrong. Corrected movement/throw velocity scaling to 25 * 22.4 / 576, and changed flight/slowdown accumulators to 25 Hz. The frame-index sequences remain unchanged: the lob now lands at 48/25=1.92 seconds, and throw=100 first slows at 9/25=0.36 seconds. The independent C# remake's UI timer is 1000/31 ms, so it should not override the Amiga timing evidence.

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

## Fidelity audit: warp entrance bounds

Rechecked Amiga `step_warp` at 0xe072. Its inclusive latitude ranges are terrain Y=355..385 and 767..797; transverse X must be strictly below 32 or above 608. Held balls and sprite stages above two are rejected. Replaced the approximate absolute-X window with these integer-coordinate checks in both simulations, and used flight stage directly. The existing exit routine already reloads nominal eight-unit velocity and throw sustain, preserves transverse drift for axial directions and places the ball exactly at the opposite boundary. It leaves longitudinal position and flight animation unchanged.

Adjusted the four Blender portal centers to Y=370/782, or world X=+/-206*22.4/576, and rebuilt the arena. Tests cover both endpoints and center of each gate on both walls, adjacent excluded latitudes, the exact transverse boundary, carried/high balls, preservation of stage and drift, and restored speed/sustain. Go tests/vet, all 64 JavaScript tests and the production build pass. The updated arena loads into browser training without reported runtime errors. This verifies the entrance rules and existing exit contract; original global movement timing and electro-bounce behavior remain separate unfinished work.

## Fidelity audit: electro-bounce contact and relaunch

Amiga `step_zapper` (0xe4cc), `distance_check` (0x10030) and C# `Electrobounces` use a 15-unit rectangular bound, then the strict half-axis direction rule already found for bumpers. The ball is placed on transverse boundary 32/608 and relaunched at eight units per component with reset throw sustain and restarted flight animation. Reading sprite data at 0x62ca/0x62f4 gives centers (20,880) and (620,272), both with zero Y-origin offset. Corrected these positions in Blender and both simulations. Hardware checks now run before ordinary wall reflection, including the small part of each rectangle inside the court, and handled contacts bypass that reflection.

The C# throwing routine `sub_F078` initializes remaining electric hits to one plus the thrower's multiplier level. The zapper only sets the charged flag; it does not refill remaining hits. Added an internal per-throw budget, consumed on an electric hit and reused on subsequent electro contacts. Updated tests that previously assumed charge was assigned from the multiplier at wall-contact time. The existing representation still combines active charge and remaining hits for rendering, rather than preserving the original charged flag independently after exhaustion; that and original catch/fall action sequencing need further work.

Verification: Go tests/vet, all 67 JavaScript tests and the production build pass. Tests cover both rectangles, straight/diagonal relaunch, edge contacts, sustain, excluded high/carried/outside balls, budget timing and no replenishment. Existing electric-hit and shield-catch tests still pass. Rebuilt the arena with Blender and loaded the updated training build without runtime errors. Full original timing, AI, injuries, animation flags and robust audio-event delivery remain unfinished.

## Audio checkpoint: bounded event history

Replaced the single-event audio feed with a chronological tail of sixteen events. All local simulation emitters, including feature and multiplier events, now share one recorder. Go snapshots own a fixed event array, so copying a state does not share a mutable history buffer. Protocol v5 carries that tail alongside the latest event used by the existing HUD. Audio consumes unseen IDs once, recovering retained events after omitted snapshots and preserving multiple events within one simulation step. A loss spanning more than sixteen events can still exceed the history; this is bounded recovery, not guaranteed delivery.

Tests cover skipped/repeated observations, ordered recovery, bounded rollover, an impact immediately followed by an injury, match reset, snapshot copy isolation and decoding real Go-generated v5 history. The maximum encoded snapshot with sixteen events and all three string fields at their 80-byte limit is 1,183 bytes, below the 1,200-byte budget. Menu/entry/disconnect audio activation now changes immediately instead of waiting for the next render frame.

Verification: Go tests/vet, all 69 JavaScript tests and the production build pass. Restarted the backend and connected two browser tabs to one arena using v5; both displayed the same advancing live clock without reported errors, with sound enabled on the host. Listening-based mix verification and full original gameplay parity remain unproven. Original timing, AI, injury sequencing and separate electric-state flags remain substantive unfinished requirements.

## Fidelity audit: selected-player catches

Amiga `get_ball` (0xeb9c) is called from the two selected-player branches of `control_player`; C# `Player.sub_D520` confirms this. Replaced the all-player nearest-catcher search with selected-player eligibility. The original inclusive 16-unit integer vector distance replaces the 0.8-world-unit Euclidean radius. Falling/unavailable and throwing players cannot catch, and standing players still reject flight stages above two. Removed the invented global post-throw catch lock: exclusion belongs to the thrower's action, so an opponent can intercept immediately.

`step_sprites` (0xe7ce) processes team two then team one at each roster index. Catch priority now follows that interleaved order, rather than a second nearest-distance comparison. The first eligible player takes possession; an electric hit can leave the ball available to the next eligible selected player. Verified sprite-table indices from the supplied dump, including goalkeeper slot zero. Catch checks still execute after motion in the current host simulation, while the original uses distances cached before player thinking; exact global ordering and goalie deflection remain unfinished.

Go tests/vet, all 72 JavaScript tests and the production build pass. New tests cover the exact distance boundary, unselected-player exclusion, throwing-player exclusion, immediate opposing interception and contested-catch priority. Browser training loads and advances without reported runtime errors. Further source inspection also confirmed that the current starting formation differs from the original launch positions; that needs correction alongside the larger timing/AI work.


## Fidelity audit: launch formations and side exchange

Read the eighteen launch coordinates from player records at pointer tables 0x6bda/0x6bfe in the supplied Amiga dump, at player offset 0x2e (also identified by the C# Player constructor). Replaced the invented three-defender/two-forward formation with the original goalkeeper, two defenders, three midfielders and three forwards in both simulations. Preserve both coordinate tables: integer asymmetries mean one cannot be reconstructed by simply negating the other. Match.SwitchSide swaps corresponding launch positions; halftime now exchanges the complete tables, including transverse placement. The current AI fallback also starts from these positions, but its movement decisions remain heuristic.

Player boundary limits now correspond to terrain X 48..592 and Y 48..1104, as in Player's constraint routine. This includes the exact goalkeeper launch depth, which the previous 20.5 clamp would have moved inward. Constraint timing still differs from the original update order. Restart tests verify all eighteen coordinates, the nearest central forwards, side exchange and retention of player health/attributes. This corrects reset placement, not the original walk-back and ball-launch animation sequence.

Verification: all 73 JavaScript tests, Go tests/vet and the production build pass. The updated training match runs in the browser without reported runtime errors; the backend was restarted. Full original AI, global timing, injury sequencing and listening-based audio verification remain unfinished.


## Fidelity audit: positional support AI

Replaced the invented ball-relative formation shift for unselected outfield players with the positional branch of base_player_ai. C# Player.E218..E438 and Amiga adjust_support_target/attackers_targeting describe role-dependent support of the selected teammate: defenders substitute the keeper as their reference when a midfielder/forward is selected; midfielders use role-zone centers and boundaries; diagonal correction moves excess longitudinal distance back across the zone. Centers preserve the original even-integer rounding. Wings and center forwards use distinct 6-by-9 support lookup tables near the opposing goal, including 639/1151 coordinate reflections. Read those numerical tables at Amiga 0x4452 and 0x452a (confirmed by attackers_targeting at 0xfa5c), and zone rectangles at player offset 0x36. Role bytes at offset 0x47 establish roles 0,1,1,2,2,2,4,4,3. Zones exchange sides at halftime with the launch tables.

Both simulations now retain movement velocity for the selected teammate's one-original-tick position prediction. This remains an adaptation to the current continuous host movement; cached velocity/update ordering and the original AI decision timer are not yet reproduced. The falling-player sprite-94 exception, aggression/visible-opponent target override, special interactions, goalkeeper AI and selected-player possession decisions remain unfinished. Out-of-table predicted coordinates safely fall back to ordinary support correction; valid original near-goal coordinates use the complete numerical lookup.

All 76 JavaScript tests, Go tests/vet and the production build pass. Paired tests exercise keeper-based defender support, midfield zone correction, near-goal wing lookup and halftime reflection. Restarted the online backend and verified the training match advances without browser runtime errors. This checkpoint does not establish full AI or gameplay parity; global timing, medical sequencing and auditory mix verification remain open.


## Fidelity audit: unselected goalkeeper positioning

Ported base_goalie_set_intercept_position (Amiga 0xfb30; C# Player.E456) into both simulations for the unselected keeper. It predicts the ball or carrier's position, evaluates diagonal shot intersections, distinguishes a carrier from a released/throwing ball, and positions on the original back line within the keeper's transverse zone. The old constant depth and narrow ball-Z clamp remain only in the still-unported selected-keeper branch.

Prediction follows get_predicted_ball_position_for_goalie at 0xfed0. Dump table 0x020a contains shifts 0 for intelligence 100..149, 1 for 150..199 and 2 for 200..255. Longitudinal prediction reduces that shift when the original side-dependent zone condition fails, then applies the same horizon to transverse velocity. Velocities are adapted from current simulation units; original global update ordering remains open. The dive decision, local interaction override, selected-keeper no-ball AI and block/deflection sequence are separate unfinished branches.

All 79 JavaScript tests, Go tests/vet and the production build pass. Paired cases cover both side-shot angles, distant recentering, halftime, carrier versus released diagonal shots and intelligence thresholds. The backend was restarted for this demo. Full gameplay parity, original timing/injuries and listening-based audio verification are still unproven.


## Fidelity audit: goalkeeper deflection

Ported goalie_deflect_ball at Amiga 0xed52 and its two eight-direction tables at 0xedf4. A keeper's blocking action now preserves its identity for the action lifetime, rather than recalculating blocking movement from the changing ball state. At selected-player contact, a blocking keeper deflects an eligible low ball instead of taking possession. The lookup uses keeper facing and starting direction; the outgoing ball uses eight units per nonzero component, a high flight animation and sustain derived from ((throw >> 1) | throw) >> 1. Last throw attribution remains unchanged, as in the reference. Opposing electric hits still resolve before a deflection; the existing shield adaptation remains in that shared contact path.

Added event 17 and an original synthesized deflection cue to distinguish the rebound from a catch. Protocol layout and packet size are unchanged; current clients recognize the new event. Paired tests cover all sixteen table entries, speed timer, high-flight restart, throw attribution, ordinary keeper catches, high-ball exclusion and electric damage. Audio coverage now includes event 17.

All 81 JavaScript tests, Go tests/vet and the production build pass. The updated backend was restarted and training was opened with sound enabled. These checks do not establish the audible mix quality. Original dive animation/duration, active keeper decisions, full electric flag semantics, simulation ordering, medical sequencing and complete AI parity remain unfinished.


## Fidelity audit: charged flag and remaining electric hits

Separated the ball's charged flag from its remaining electric hit count. The original zapper sets the flag; zap_player decrements the count without clearing that flag. Player.sub_D520/get_ball returns before clearing charge for a stationary catch, and also preserves charge for a friendly catch. An opposing moving catch clears it. Deflections clear it on an opposing shot, while throws reset the flag and initialize a new budget. These rules now apply in both simulations and the renderer/HUD uses the flag independently of the remaining count. Existing shield and medical adaptations are still not exact original action sequencing.

Protocol v6 packs the flag into bit 7 of the existing electric byte, with remaining hits in the low bits. Packet length stays unchanged and old clients are rejected by the version check. The real Go snapshot decoding test verifies both fields. Paired lifecycle tests exercise hit exhaustion, friendly recovery, throw reset and moving versus stationary opposing catches; an older stationary-catch assertion was corrected to the source behavior.

All 83 JavaScript tests, Go tests/vet and the production build pass. The backend and both browser clients were restarted for the protocol change. Full original AI/timing, medical and pickup sequencing, and listening-based audio verification remain unfinished.


## Fidelity audit: AI reaction intervals

The original reset_player_timer reads reaction_time_table at 0x01fa: 16,16,15,15,14,14,13,13,12,12,11,11,10,10,9,8 ticks for successive intelligence decades 100..250. Both simulations now retain a chosen movement target between decisions and gate new AI action/throw choices on this interval. Busy actions defer a new decision. Human control sets the short one-tick handoff timer as in user_controlled_player. This replaces unconditional retargeting every host frame.

Intervals currently use elapsed seconds corresponding to 25 original ticks per second. Decisions are sampled by the existing 60 Hz host loop, so expiry can be delayed by up to one host frame; this is an explicit transitional adaptation, not exact original global tick scheduling. Original per-action timer overrides, pause ordering and opcode-based movement steering still require the full simulation timing port. Existing unported aggressive/possession AI decisions remain heuristic, now with the source reaction interval.

All 85 JavaScript tests, Go tests/vet and the production build pass. Paired tests verify every table entry, retained targets, refresh at 8/16 original ticks and busy-action deferral. The backend was restarted and the updated training match was opened for the demo. Full gameplay parity and listening-based audio verification remain unfinished.


## Fidelity audit: target direction and arrival

Replaced the AI's nearest-angle steering and 0.3-world-unit circular stopping radius with the integer direction rules in Entity.GetDirBitsToTargetBetter and Player.EB7A/EC0C. A new movement target uses strict half-axis comparisons with integer division. Continuing movement inside the inclusive 32-unit box uses the sign of each axis. Arrival snaps each axis separately only when its absolute integer distance is below four units. Busy actions retain facing instead of steering toward a changing target.

Both simulations use the same rules. This does not yet port the far-target opcode-index gate, selected-player retargeting on arrival, the original action animations or global update order. The host still integrates movement continuously and converts coordinates to original units for the direction/arrival calculation; full integer 25 Hz simulation remains outstanding.

All 88 JavaScript tests, Go tests/vet and the production build pass. Paired boundary cases cover half-axis ties, the 32-unit box, initial versus continuing direction, independent arrival, and strict four-unit exclusion. Restarted the backend and opened the updated training demo. Full AI, timing, medical sequencing and listening-based audio verification remain incomplete.


## Fidelity audit: runtime simulation cadence

Changed both actual entry points to 25 Hz: the training accumulator calls simulationStep = 1/25 and the Go hub ticks at the same rate. Online snapshots are now emitted each simulation tick (25 per second), replacing the old every-second-tick 30 Hz transmission on a 60 Hz simulation. Rendering remains on requestAnimationFrame. Existing monotonically increasing action counters retain short press/release inputs between simulation samples.

The original PAL loop waits two video frames per gameplay tick. This change aligns runtime cadence and removes 60 Hz quantization from AI reaction decisions in normal play. It does not yet reproduce the original within-tick ordering, integer position integration, animation opcode timeline or injury/pickup sequences. Legacy small-step tests still exercise the parameterized simulation at other dt values; the runtime and full-match test now use the original rate.

All 90 JavaScript tests, Go tests/vet and the production build pass. New paired tests verify 25 ticks per match second and a released fire counter producing exactly one low throw at the new cadence. The full Go AI match completes within position and wire-budget bounds at 25 Hz. Backend and both browser clients were restarted for the demo. Full gameplay and auditory parity remain unproven.


## Fidelity audit: catches within the player update

Moved catch handling out of the post-motion ball pass and into each selected player's update before its input/action/motion. Cache all player-to-ball distances before entering the player pass, then process roster indices with team two first, matching step_sprites at 0xe7ce. The same cached distance remains valid for later players even if an earlier player changes the ball state; possession, action and charge eligibility are still read when that player is processed. Direct catch helper tests retain their immediate-distance mode.

Paired integration tests now distinguish a fast ball entering range during motion (caught next tick) from one already in range and moving away (caught before motion), and verify contested team-two-first order through the complete simulation. This advances within-tick fidelity but does not finish it: hardware checks remain after ball motion, timers still decrement before player thinking, and tackle/collision resolution remains a later pass. Original animation sequencing and medical/pickup logic also remain open.

All 93 JavaScript tests, Go tests/vet and the production build pass. Restarted the backend and opened the updated training demo. Full original gameplay parity and listening-based audio verification remain incomplete.


## Fidelity audit: field contacts before player updates

Moved slowdown, multiplier traversal, warp/electro contacts, stars and bumpers before player selection and cached catch distances. Ball boundary/goal handling now precedes the final ball position and flight advance, so a boundary crossed by motion is evaluated on the next tick. Without this second change, post-motion reflection would prevent next-tick warp detection. Legacy boundary tests now advance through crossing and then contact; new paired tests explicitly assert that no warp/star event occurs prematurely.

The side-feature helper still combines warp and electro checks before stars/bumpers; their current spatial predicates are disjoint except that a warp can feed a subsequent star check, which retains the required ordering. This is not a complete original-loop port: medical/pickup and timer ordering, action opcode advancement, player motion/constraints and later tackle/collision passes still differ. Court longitudinal bounds also retain their earlier world-scale approximation.

All 94 JavaScript tests, Go tests/vet and the production build pass, including full-match completion. Restarted the backend and opened the updated training demo. Exact remaining AI/medical/action sequences and listening-based audio verification are still outstanding.


## Fidelity audit: exact goal and ball-wall bounds

Match.CheckGoal accepts transverse terrain coordinates 272..368 inclusive and requires outward velocity beyond longitudinal 32/1120. Both simulations now use the corresponding 48-unit goal half-width and 544-unit longitudinal half-length, and reject goals for stationary or inward-moving balls. Entity.MoveAndHandleWallsAndBounce / constrain_sprite clamps overshoot to the boundary before reversing velocity and applying that tick's movement; replaced the previous position-mirroring bounce on both axes. End-wall sustain reduction is retained.

Paired tests cover both goalpost endpoints and their adjacent excluded terrain units, strict crossing, velocity direction and clipping before reverse movement. The earlier high-ball boundary fixture now begins near the corrected end line. All 97 JavaScript tests, Go tests/vet and the production build pass. The backend was restarted and the updated training demo opened.

The Blender arena still contains rounded goal/end-wall geometry (for example scaled goal center 21.3 versus the exact simulation line around 21.156). This needs visual alignment; this checkpoint corrects gameplay bounds only. Original integer motion, action/medical/AI sequencing and listening-based audio verification remain incomplete.


## Visual alignment: Blender contact geometry

Aligned the authored arena with the exact simulation bounds after its legacy scale transform. Goal upright inner faces now sit at transverse +/-1.866667; end-wall inner faces and end-line centers at longitudinal +/-21.155556; side-wall inner faces at +/-11.2. Updated goal floors/crossbars, goal-shield width/position, playing surface and touchline lengths to fit. Rebuilt arena.blend and arena.glb through Blender only.

Loaded the exported GLB with Three.js and measured actual mesh world bounding boxes: post inner faces +/-1.866666661, end-wall contact faces +/-21.155555725, side-wall contact faces +/-11.200000197 (export precision). The production build succeeds and the updated browser arena renders without reported runtime errors. This verifies contact geometry, not complete visual/gameplay parity. Full original AI/action/medical sequences and listening-based audio verification remain unfinished; narrow-viewport HUD overlap is also still visible in the browser check.


## Browser follow-up: narrow HUD overlap

Separated toolbar controls, room status, scoreboard and power status below 850px. The scoreboard uses bounded grid columns and truncates team labels rather than overflowing. In the current 616px browser, measured rows are controls 14..54, room status 56..70.39, scoreboard 76..129 and power status 148..207; the previously observed overlap is gone. Inspected the running match screenshot and verified the production build. Other viewport sizes were not directly exercised in this check. Full original AI/action/medical sequencing and listening-based audio verification remain open.


## Fidelity audit: rotating substitutes and entry positions

Match.SubstitutePlayer and Person.CopySubstituteTo rotate bench slots 9,10,11 and put the outgoing player at the back. They copy the eight performance attributes, rounded down to tens for the outgoing player, while slot health/role remain initialized separately. Replaced the invented three-substitution limit with a three-entry attribute queue in each simulation. A fourth substitution can restore the first outgoing player's weakened attributes; reserves remain three. Bench arrays are owned by each state, including value-copy-safe Go snapshots. Actual named original rosters/identities remain unported.

Medical completion now enters at terrain X 48/592, Y 576 +/-32 according to starting direction, targets center (320,576) and sets the original 25-tick AI timer. Reset gear and stale action state. Replaced the keeper's unconditional positional clamp with directional zone checks from Player.FB6C, allowing an entering keeper outside the zone to travel back instead of teleporting into it. The six-second evacuation is still an adaptation: original medic travel, pickup and return animation states remain unfinished.

All 99 JavaScript tests, Go tests/vet and the production build pass. Paired tests cover four substitutions, bench order, attribute rounding, all side/half entry combinations and cleared gear backups. Restarted the backend and opened the training demo. Full original AI/action/medical sequencing and listening-based audio verification remain incomplete.


### Jump selection: speed-dependent reach

The automatic jump decision now follows `handle_user_input` at Amiga
0x10c36â€“0x10c68: the ball must be free, outside a multiplier loop, above
flight stage 2, and within six times the speed-dependent sustain value.
The 0x022a table ranges from 8 to 12, giving an inclusive reach of 48â€“72
original terrain units. Both simulations use the cached pre-movement distance.
The explicit tackle control remains an override. The launch drop still uses
its existing height fallback because it does not yet use original ball sprites.
Paired JavaScript/Go checks cover both reach boundaries, possession, multiplier
exclusion and low flight stages. Jump/slide durations and landing recovery
remain approximations: original thinking selects animation tails at indices
18/15 before the animation interpreter clears busy flags.


### Slide and jump control duration

The Amiga dump confirms 16 slide sprite entries followed by 0xfffd at
0x6e86, and 20 jump entries followed by 0xfffd at 0x7106. Thinking runs
before animation execution. `complete_action_fn` jumps to slide index 15
when the current index reaches sustain minus one. `jumping_action_fn`
jumps to index 18 at sustain plus two, leaving two landing frames.
Consequently the next input opportunity is sustain frames after starting
a slide and sustain plus four frames after starting a jump: 0.32â€“0.48 s
and 0.48â€“0.64 s at 25 Hz. Both simulations now use these durations, with
no additional 0.85-second cooldown. Tiny floating-point remainders are
cleared so an action can restart on the intended tick. Busy jumps retain
their direction. The visual height returns to ground for the final two
frames; its smooth curve remains an adaptation of the original sprites.

Paired tests exercise slide completion across all five sustain values,
jump duration at both speed extremes, landing height and attempted steering
while jumping. Remaining action differences include standing punches,
separate jumping/busy flags and their ordering around catches and tackles,
original collision response, and exact Blender clip timing. These tests
establish the timing change, not complete action-system equivalence.


### Airborne flag during jump recovery

The simulations now keep the original airborne flag separately from the busy
jump action. `jumping_action_fn` clears this flag when switching to animation
index 18, while busy persists through the two landing frames. Per-player
catching runs before that flag transition, matching `sub_D520` followed by
`Think` in the reference. A high flight-stage ball can therefore be caught on
the transition tick but not on the following landing tick. Low balls remain
catchable during recovery. The jump defense modifier also uses the flag rather
than the animation action. Paired tests cover these three catch cases and the
restored landing defense. The flag is simulation-only; the existing action and
remaining time still drive the browser's visual pose, so wire format 6 is
unchanged. Non-sprite launch-drop height handling and collision-pass ordering
remain approximations.


### Busy possession and the lob shortcut

`sub_D724` only processes new human actions while the original busy flag is
clear. The dedicated browser lob shortcut previously bypassed that restriction,
letting a player cancel a jump, slide or throw recovery immediately after
obtaining possession. Both simulations now require recovery to finish before
accepting a new lob. Already running throw windup still advances normally.
Paired integration tests cover all three busy actions, ensure blocked pulses
are not deferred, and verify that a fresh lob works after recovery. The shortcut
itself remains an additional browser control; original one-button release
handling and standing-catch animations still need further comparison.


### Throw release and recovery timeline

The original throw animation at Amiga 0x7076 has eight sprite entries followed
by 0xfffd. `sub_F078` releases at opcode index four and samples the current
button value for low/high flight, without remembering earlier releases.
The regular human throw now stays held through indices 0â€“3, releases at
index 4, and permits another action at index 8. Previously it released one
25 Hz tick early and restarted a full eight-frame recovery at release.
Release now leaves only four recovery frames. Releasing and repressing the
button during windup can produce a high throw if held at the release tick.
Legacy 60 Hz unit fixtures were updated to wait for the full windup; new
paired 25 Hz tests assert every ownership/recovery boundary and both button
transitions. Direct AI and shortcut lobs still skip the original windup and
receive the four-frame release tail; that remaining difference is not covered
by this human-throw timing correction.


### Shared preparation for every runtime throw

AI decisions and the lob shortcut now begin the same eight-frame throwing
action as the ordinary fire button, instead of immediately releasing the ball.
A per-player pending mode stores either release-time human button sampling or
the AI/shortcut's chosen flight type. Release occurs with four frames remaining,
so all runtime throws hold possession and stop movement for the same windup.
Possession loss or an interrupted action cancels the pending release. The low-level
release helper remains directly callable by physics tests; runtime decisions use
preparation. Paired tests cover AI low/high flight, shortcut preparation and
possession-loss cancellation. AI choice of target and flight type remains heuristic;
this change aligns execution timing, not the remaining tactical decisions.


### Action recovery sound events

`jumping_action_fn` calls sound 0x24 when clearing the airborne flag;
`complete_action_fn` calls sound 0x2b when selecting the slide's final frame.
Both simulations now emit distinct landing (18) and slide-recovery (19)
events at those transitions. Per-action guards prevent repeated sounds during
remaining recovery ticks. Newly synthesized thud/scrape cues provide feedback
without using commercial samples. They use the existing bounded event history,
stereo positioning, mute/pause handling and duplicate suppression. Paired
simulation tests assert the exact emission frame and single occurrence;
audio tests validate all 19 numeric cues. This verifies event scheduling and
cue parameters, not an auditory comparison with the original soundtrack.


### Opponent movement blocking

`sub_D448`/`sub_D4AC` checks the cached distance to opposing players (inclusive
30 terrain units), excludes fallen opponents, and compensates each velocity
component directed toward them before ordinary movement. Direction uses strict
integer half-axis tests. Both simulations now apply this rule and retain movement
velocity; the previous symmetric overlap-separation pass, including teammate
repulsion, is removed. Standing still or retreating no longer causes an automatic
push out of overlap. Cached pair distances are computed alongside ball distances.
Paired tests cover the reach boundary, diagonal half-axis equality, teammates,
fallen opponents, stationary overlap and retreat. Remaining differences include
the original offscreen flags, late falling-animation handling and its global
movement pass: this engine still moves each player after its thinking, so later
players can see earlier players' moved positions. Tackle damage displacement also
remains separate and approximate.


### Cached tackle reach and contact priority

`sub_ED92` tests the cached opponent distance against an inclusive 30-unit
limit, then consumes the first eligible contact in opponent roster order.
Both simulations now use that cached distance rather than a post-movement
Euclidean radius. Attacker processing follows the original interleaved roster
order, team two then team one, instead of reversing priority on alternating
ticks. Paired tests verify contact at 30 units, delayed contact after entering
range from 31 units, and identical simultaneous-tackle priority on both tick
parities. The contact pass still runs after player thinking/movement; original
per-player hit processing, offscreen guards and falling-action continuation
remain to be ported before complete collision-order equivalence can be claimed.


### Tackles within per-player thinking

Existing slide contact checks now run after that player's catch check and
before its movement/input decisions, rather than in a separate pass after
all players have acted. A newly initiated slide first checks contact on the
following thinking tick, matching installation of `sub_F33C` by the input
routine. Earlier roster attackers can now interrupt later players' scheduled
throws in the same tick. Paired tests cover that interruption and retain the
first-contact/no-reroll and direct-possession assertions after the initial
slide tick. Remaining differences include action functions retained while
falling, original fall velocity/animation, offscreen guards and the global
movement phase; this is not yet a complete original player interpreter.


### Player movement after the thinking pass

The reference calls every player's `Think` before the later calls to
`MoveAndHandleWallsAndBounce`. Both simulations now defer ordinary player
movement until all player thinking has completed. Earlier roster players no
longer expose their final moved positions to later players' collision checks.
The existing pre-movement contact compensation remains in the thinking pass,
matching the reference's direct coordinate adjustments. Paired tests cover a
sideways-moving earlier opponent that must still block a later player's approach
on that tick. Existing throw, catch, tackle and keeper tests remain passing.
The original relative ordering of goal/ball movement, player boundary clipping,
and falling-player velocity still needs comparison; stunned players currently
stop rather than following the original fall-motion sequence.


### Sliding tackle fall motion

The Amiga `anim_tackled` sequence at 0x7296 contains 26 sprite entries followed
by 0xfffb, which stops velocity and clears falling/busy flags. Nonfatal hit
recovery now uses 26/25 seconds. A sliding tackle sets the victim's facing to
the attack direction and gives four terrain velocity units per tick, replacing
the instantaneous 0.7-world-unit displacement. The global movement phase
continues that velocity while the victim is stunned, stopping on the final
fall frame before control returns. Paired tests trace the initial displacement,
25 moving frames and subsequent stop/recovery. Fatal injuries still use the
adapted medical sequence. Electric-hit direction/speed, standing punches,
late-fall collision stopping, and animation-index differences when the victim
has already had its thinking turn remain to be implemented.


### Electric-ball fall direction

`sub_D632` copies the ball's nominal direction to the victim and starts the
shared fall animation with velocity level three. Both simulations now set that
fall velocity on a charged-ball hit. It follows the nominal ball direction even
when release steering adds drift on the unused axis, and does not follow the
thrower's current facing. Paired checks cover all eight directions, axial drift,
26-frame recovery and charge consumption. The existing global fall movement
applies the velocity. Direction fallback to current ball velocity supports
states without a recorded nominal direction; normal runtime throws and wall
reflections retain the nominal direction. Late-fall collision stopping and the
adapted medical sequence remain separate outstanding differences.


### Contact while falling

Falling players now execute opponent movement blocking during their thinking
pass. Before fall index 18, approaching velocity components are compensated
as for other movement. At index 18 or later, `sub_D4AC` stops velocity and
resets the animation index to 18 on each eligible contact. The simulations
represent this as a stationary eight-frame recovery tail that restarts while
the standing opponent remains within the cached 30-unit range. Once contact
ends, the tail completes. Paired tests cover repeated late contact and recovery
after separation. The earlier free-fall trace now explicitly removes the attacker
after the first blocked movement tick. Offscreen exclusions, fatal injury staging,
and exact fall indexing for victims hit after their thinking turn remain open.


### Browser checkpoint, 2026-09-09

The local Go server was still running the 2026-09-08 build. It was restarted
from gameplay commit c331dd0 before testing. The current client loaded in
training, displayed the fullscreen arena, advanced the match clock and AI score,
and accepted sound activation without browser errors. Two refreshed browser
tabs created/joined arena 9AGQHA through WebTransport; both displayed LIVE,
WEBTRANSPORT CONNECTED and the same 01:20 match clock. Neither tab reported
browser errors during this check. This is a local connection/rendering smoke
test, not a latency/load test or proof of complete original gameplay equivalence.
Audio activation was checked, but the sound mix was not assessed by listening.


### Correction: original fall sequence versus the WIP memory image

A direct cross-check found that the WIP ZIP's Amiga.dmp contains an early
0xfffb terminator at 0x72ca (index 26), followed by remaining lying sprites
and a second terminator at 0x72dc. The supplied original Amiga disassembly
instead describes a 36-word array at 0x7296: 35 sprite entries and the final
terminator at 0x72dc. There is no early terminator in that disassembly.
The reason for the WIP image's difference has not been established; it must
not define original timing. The earlier 26-frame conclusions in this log are
therefore superseded: fall recovery now uses 35 frames (1.4 seconds), and
resetting to index 18 leaves a 17-frame tail. Shared constants drive both hit
recovery and late-contact handling. Paired fall/electroball tests now assert
these original-sequence timings and the corresponding free movement distance.
Standing-catch analysis remains pending while this source discrepancy is fixed.


### Standing catch recovery

`sub_D520` invokes `sub_F1B4` for a free, stationary player catching a moving
ball. It faces the ball using integer half-axis direction tests and selects a
three-sprite catch sequence (including keeper variants), followed by 0xfffd.
Both simulations now expose action 6 for this three-frame recovery; movement
and new throws wait until it completes. Moving catches, stationary balls and
zero direction do not add the recovery. Existing busy actions are retained.
Both team assets have a newly authored Blender Catch clip, timed to 3/25 seconds
by the renderer. Paired tests check direction, movement/throw inhibition and
exclusions. The clip is an original 3D interpretation rather than a reproduction
of the original sprites; keeper-specific visual poses remain to be differentiated.


### Standing punch

The no-ball human action now selects a standing punch when there is no movement
direction, matching `sub_F47E`; a moving action still slides, and eligible high
balls can still trigger a jump. The punch uses the four sprite frames at 0x6f96,
remains stationary, checks contact from its next thinking tick, and uses the
ordinary attack threshold without the sliding modifier. Successful punches set
fall velocity level three instead of four. Action 7 has a Blender-authored Punch
clip and event 20 has a new synthesized swish. The HUD names the punch explicitly.
Paired tests cover duration, stationary recovery, one event and delayed contact
with the correct victim velocity. Existing slide fixtures now explicitly provide
movement input. AI standing-attack decisions remain heuristic; fallen-player
retaliation and other original action-function details are still outstanding.


### Local interaction for supporting AI players

Unselected AI players now use `sub_E854`'s first eligible opposing roster entry
within cached distance 30. A keeper, an opponent carrying the ball, or aggression
strictly greater than the sampled random byte chooses a standing punch; otherwise
the player moves away using the opposite integer half-axis direction. This
interaction takes priority over positional support and uses the original random
generator on each unselected AI decision. Avoidance direction persists until the
next decision. Selected-player pursuit/action choices remain separate heuristics.
Paired tests cover strict aggression equality, inclusive distance, first-opponent
priority, keeper/carrier rules and falling exclusions. The single-contact tackle
fixture now delays its bystander's AI so a legitimate counter-punch does not
obscure its one-attacker assertion. Offscreen checks and the original avoidance
of the selected teammate remain unported.


### Selected AI ball prediction

The selected field player now uses `target_predicted_position` (Amiga 0x10aaa) when pursuing the ball. Table 0x020a specifies one tick of velocity for intelligence 100â€“149, two for 150â€“199, and four for 200â€“255. Coordinates and velocities are converted to original integer terrain units before prediction. The target reflects once at each axis boundary (terrain X 32/608 and Y 32/1120), including simultaneous corner reflections. This replaces the fixed 0.15-second lead and separate gear-21 override in both simulations. Tests cover intelligence boundaries, corner reflections and stationary wall targets; reaction fixtures now use integer terrain coordinates.

This ports the prediction used by the current ball-pursuit branch. Original selected-player target selection between opponents, items and the ball, along with slide/jump decisions and screen visibility rules, still needs porting. It does not establish full AI parity.


### Selected AI close-contact actions

`handle_local_interaction_ai` (Amiga 0xff3a region, dispatch at 0xffa2â€“0xffba; WIP `sub_E854`) distinguishes the selected player from supporting players: selected attackers call `active_player_slide_or_jump`, while supporting attackers punch. Both simulations now run this close-contact decision for selected non-carriers too. Selected attackers aim at the opponent position predicted from its velocity and the attacker intelligence, then choose slide or jump using the existing original ball-stage, possession, multiplier and speed-dependent range checks. Avoidance retains priority over the remaining generic ball-action heuristic. Supporting punches continue to aim at the current position. Coincident avoidance now uses the initial team direction, matching `sub_EB38`.

Tests exercise moving-opponent prediction, supporting punch direction, coincident avoidance and simulation-level selected slide/high-ball jump initiation. Remaining gaps include offscreen eligibility, selected teammate avoidance, exact zero-direction jump motion, and the non-contact selected-player decision tree. Existing procedural slide/jump cues are emitted for these actions; this change adds no audio assets.


### Zero-direction jumps

Amiga `slide_or_jump_at_target` at 0x100c4â€“0x1010a selects the zero-velocity table when the predicted target has no direction, retaining facing. Both simulations now preserve this distinction through an internal stationary-jump flag. A coincident slide still falls back to the team initial direction. Human jumps without directional input also retain zero velocity, as in WIP `sub_F47E`, which keeps the movement velocity when selecting the jump animation. The flag is set anew for each jump and affects only action 2, so walking resumes normally afterward. Tests verify a full stationary human jump despite midair movement input, facing preservation, movement after recovery, and coincident selected-AI target direction. Audio continues to use the existing launch and landing events.

The original human moving-jump velocity selection and the full selected-player AI decision tree still need further comparison; this change does not prove full gameplay equivalence.


### Human and AI jump launch velocities

Amiga `handle_user_input` configures standing or running velocity at 0x10bc8/0x10bea. The jump branch (0x10c6câ€“0x10c92) replaces the animation without changing the velocity-table pointer. Human moving jumps therefore launch at running levels 5/6/7, with strict speed thresholds 140 and 200. AI jumps continue using levels 4/5/6/7 with thresholds 140, 170 and 200. Both simulations now capture horizontal speed at launch rather than recalculating it from current stats and possession every airborne tick. Stationary jumps remain zero-speed.

Simulation tests cover both sides of the human speed thresholds, continued direction despite opposite input, and retained launch velocity after a stat change. Existing AI action tests and movement-table tests remain green. Exact action timing and visuals under midair stat changes still need comparison; this entry establishes launch velocity only.


### Visual feedback consumes retained events

The renderer and notification HUD previously inspected only the last event in a snapshot, while audio already consumed the retained event tail. A landing or punch sound event could therefore hide a bonus notification or impact burst produced earlier in the same update. Both visual consumers now process the retained events after their own cursor. The HUD selects the highest-priority new notification, preserves active score/injury/halftime messages against lower-priority feedback, and ignores sound-only events. The renderer emits every retained applicable burst once. Starting training or connecting to another arena resets the visual cursors. This is presentation reliability work, not a change to scoring rules.

Regression tests cover bonus-plus-landing, injury-plus-impact/punch, cursor deduplication, notification priority and match reset. All 131 JavaScript tests and the production build pass. Training was reloaded and started through the browser UI with no reported browser errors; simultaneous score/sound events were verified through deterministic tests rather than manually reproduced in that smoke check. Event recovery remains bounded to the protocol tail of 16 events.


### Carried ball follows jumping carrier

WIP `Match` lines 485â€“497 copy the carrier terrain position and velocity to the held ball, then apply offsets from the current player sprite. Both simulations now give the held ball the carrier movement velocity instead of zero, so the existing AI position prediction can account for a moving carrier. The 3D ball height follows the player jump height and returns to its normal carry height on landing. This height is an adaptation to the current Blender player and smooth jump curve; it does not claim a direct port of the original per-sprite hand-offset tables.

Simulation tests verify elevated carry height during ascent and apex, normal height on landing, preserved ownership, shared horizontal velocity and zero velocity after stopping. All 132 JavaScript tests, Go tests, Go vet and the production build pass. Original per-frame carry offsets and exact visual jump timing remain pending.


### Rules text and current multiplayer smoke check

The in-game rules and README now describe stationary punches, moving slides, the E-lob wind-up and the rotating three-player bench consistently with the simulation. README equipment descriptions distinguish tackle success from reach and defence from damage reduction, and list the Catch/Punch Blender clips.

The local Go service was restarted from gameplay commit 6a4eebd. Two browser tabs joined fresh arena P6CZFD, both reported ONLINE / LIVE and WEBTRANSPORT CONNECTED, and both displayed 01:19 at the same observation. Neither tab reported browser errors. The production build passes. This confirms basic online operation of the accumulated changes, not frame-exact original gameplay or network stress behaviour.


### Selected field-player pursuit decisions

The no-item branch of WIP `sub_D742_AII` now drives selected field-player pursuit in both simulations. The initial target is the opposing selected player. Unless that player owns the ball or the ball is in a multiplier, a fallen opponent, aggression/2 <= random, or own ball distance <= opponent ball distance switches the target to the ball. Integer half-aggression is compared strictly. The chosen entity uses original intelligence-based position prediction. Aggression/2 > random immediately starts the existing slide/jump-at-target action; otherwise the player walks toward the target. This replaces the generic short-range ball attack heuristic for selected field players; the selected goalkeeper still has separate unfinished logic.

One random byte is shared by local-contact and pursuit decisions, and selected carriers now consume the decision byte too, matching the selected AI entry routine. Tests cover aggression equality, distance equality, fallen opponents, multiplier and possession overrides; all 133 JavaScript tests, Go tests, Go vet and the build pass.

This implements the no-item visible-player branch. Pickup target selection, offscreen eligibility and selected keeper behaviour still need porting; this checkpoint is not full AI equivalence.


### Logical viewport and selected AI pickup targets

Both simulations now retain the original logical viewport, initialized at terrain (160,484). After each simulation step it follows the carrier or free ball with the WIP `CenterScreenOnEntity` integer rules: abs(delta)/8 + 1 capped at 16, horizontal movement suppressed below speed 2 during play, vertical movement allowed at speed 1, and scroll limits (320,968). Visibility uses inclusive 320 by 184 bounds; selected field-player pursuit uses the original 16-unit inset. This logical viewport controls the new AI branch and is independent of the wider 3D browser camera. Other AI/collision visibility checks have not yet been migrated. Presentation and medical camera targets still need separate porting.

Selected pursuit now checks visible, active pickups in original order: token 1, token 2, equipment, coins 1â€“4 (current slots 0,1,6,2,3,4,5). Coincident candidates are excluded because the original empty blocked-direction masks reject zero direction. The first eligible candidate is used only when its distance to the ball is no greater than the player ball distance; failure does not retry lower-priority pickups. Offscreen selected field players follow the ball without attacking or seeking pickups. Pickup placement/respawn and per-sprite origin offsets remain separate fidelity gaps.

Tests cover viewport dead zone, scroll cap, limits, inclusive visibility boundaries, pickup priority, offscreen rejection and first-candidate distance failure. All 136 JavaScript tests, Go tests, Go vet and the production build pass.


### Visibility of local AI interactions

WIP `sub_E854` exits for an offscreen actor and skips offscreen opponents before choosing attack or avoidance. Both simulations now apply those checks through the retained logical viewport. The full inclusive viewport is used, not the 16-unit inset used by selected-player pursuit. Tests place actor and opponent on either side of the boundary and then scroll the viewport to reveal them. All 137 JavaScript tests, Go tests, Go vet and the production build pass.

This ports eligibility for local AI decisions only. Hit resolution, movement collision and human-to-AI control handoff still need their own original visibility checks. The renderer continues to show a wider 3D view, so logical visibility does not equal browser clipping.


### Hit-resolution visibility

WIP `sub_ED56` rejects offscreen attackers, and `sub_ED92` skips offscreen defenders before switching attack thinking and drawing the tackle random byte. Both simulations now check the original logical viewport at those points for slide and punch contact. Skipping an invisible participant leaves the attack unresolved and does not consume randomness. Regression tests put each participant outside the viewport in turn, then let normal scrolling reveal them on the next tick and confirm the same attack can transfer possession. The existing punch-fall fixture now explicitly centers the viewport over its players.

All 138 JavaScript tests, Go tests, Go vet and the production build pass. Movement-collision visibility and control handoff still need porting. The logical original viewport remains distinct from the wider rendered camera.


### Movement collision visibility

WIP `sub_D448_PreventMoveOnPlayers` rejects an offscreen moving player and skips offscreen standing opponents. Both simulations now pass the logical viewport into movement blocking, including the fall-recovery hold branch. An offscreen opponent cannot cancel movement or reset a fallen player to the recovery tail. Tests verify the inclusive edge, offscreen actor exclusion, and recovery remaining unchanged until the opponent is visible. The global-movement-order fixture explicitly places the viewport over its players.

All 139 JavaScript tests, Go tests, Go vet and the build pass. Human control handoff outside the inset viewport remains pending. Visibility is currently evaluated from terrain coordinates at the interaction point; exact original flag-refresh ordering is still part of the overall frame-order comparison.


### Human control outside the original inset

WIP `sub_D2DE_SetInput` routes the selected player to human input only inside `IsOnscreen_Margin16`; otherwise it invokes the selected AI after the reaction timer. Both simulations now apply that condition. Pending throw release remains separate: `sub_F078` reads the team controller even if the player has moved outside the inset. Normal throws therefore still sample the release button and human-team direction input, while forced AI throw modes retain their chosen height.

Tests verify the inclusive 16-unit inset boundary and AI movement one unit outside, plus both high/low offscreen pending releases with perpendicular steering. Existing isolated human-input fixtures now center their logical viewport over the tested player. All 141 JavaScript tests, Go tests, Go vet and the build pass. The rendered 3D camera is wider than the logical viewport; aligning its presentation with this control region remains pending, as do exact original flag refresh ordering and selected goalkeeper AI.


### Authoritative camera viewport

Protocol v7 adds the two logical scroll coordinates as uint16 values. The browser decodes those values directly instead of reconstructing camera motion from received positions, so skipped datagrams do not desynchronize the displayed viewport from server-side visibility. The actual Go packet fixture uses non-default coordinates (317,963), decoded exactly by JavaScript; old v6 packets are rejected and packets remain below 1200 bytes.

The in-match orthographic camera now looks straight down, with world X pointing up-screen and world Z right-screen. Its ground footprint is the original 320 by 184 terrain units and its center comes from the logical scroll coordinates. Letterboxing preserves that footprint on different browser shapes; the preview retains its oblique arena view. First-render viewport initialization was fixed after browser testing exposed an undefined viewport.

All 141 JavaScript tests, Go tests, Go vet and the production build pass. The local Go server was restarted with v7. Two browser tabs joined UXP8LD and both showed LIVE, WebTransport connected and 01:12; the second client reported no browser errors and its screenshot showed the centered original-aspect playfield. The first tab retains the historical pre-fix console error. This verifies basic online framing, not all animation appearance or original medical/presentation camera states.


### Selected keeper immediate actions

The first branches of Amiga `active_goalie_no_ball_ai` (0xfcf4â€“0xfd60) now drive selected keeper actions in both simulations. Against a free ball or opposing carrier, a visible keeper starts slide/jump-at-target within eight sustain units (inclusive), using the keeper intelligence prediction constrained by its zone. Friendly possession bypasses this branch. Outside action reach, a stationary target with half-aggression greater than the existing decision random byte is approached within the keeper zone. The old generic fixed-distance keeper attack heuristic was removed.

Two WIP differences were resolved against the Amiga instructions: 0xfd4c compares the stored random byte rather than drawing another; 0xfd54/0xfd58 load the target entity position rather than the keeper position. Tests cover reach 64/65 and 96/97, aggression equality, teammate possession and simulation-level keeper action initiation. All 143 JavaScript tests, Go tests, Go vet and the build pass.

The remaining selected-keeper interception/positioning branches (0xfd60 onward) still fall back to the previous goal position when neither immediate branch applies. They are not yet equivalent to the original.


### Selected keeper interception positioning

The remaining Amiga `active_goalie_no_ball_ai` positioning branches (0xfd60â€“0xfece) replace the fixed selected-keeper goal position. Shared keeper prediction feeds distinct selected/unselected interception thresholds. Selected positioning uses the goal back line at terrain Y 32/1120, averages toward that line, averages lateral intercepts once for released balls and an additional time for relevant held-ball directions, then clamps to the keeper zone. The asymmetric right-side comparison at 0xfd9eâ€“0xfdb2 is retained literally rather than symmetrized.

Coordinate fixtures cover left/right approaches, the asymmetric branch, central distant and straight shots, diagonal free and held balls, zone clamping, and swapped ends. Existing unselected keeper fixtures remain unchanged and pass. All 144 JavaScript tests, Go tests, Go vet and the production build pass. The selected keeper no-ball positioning no longer uses the fixed -19.5 world-X fallback. Keeper carrier passing/throw decisions remain part of the broader unfinished AI port.


### Defensive receiver selection

Keeper and defensive-role passing now use WIP `sub_D902`, `sub_DBE8` and `sub_E05C` receiver rules: predicted directions of the selected opponent and nearest other eligible opponent exclude lanes; charged balls clear those exclusions; candidate roles are searched from the original minimum downward; range is intelligence times two; equal distances select the later roster entry. The keeper prefers roles >=2 before falling back to defenders. Keeper passes to non-defenders are high; other eligible passes are low only when throw strength times two is strictly greater than receiver distance. Aim uses the original integer half-axis direction toward the predicted receiver.

Tests cover role priority, fallback, strict throw/range boundaries, blocked directions, electroball exceptions and roster ties. All 146 JavaScript tests, Go tests, Go vet and the production build pass. This replaces receiver selection when the current carrier AI decides to pass; field-player pass triggering and no-receiver bank-shot fallback still require the original decision tree.


### Defensive high punts and release bias

Ported the normal-match Amiga `do_throw_punt_ai` (0x1069a) and
`set_goal_throw_location` (0xf580). When defensive receiver selection fails,
the keeper/defender/midfielder now winds up a high punt. The initial target
uses the original 304/336 terrain-X offsets, or random-bit-6 272/368 targets
on the center line. A blocked selected-opponent direction changes this to
a 45-degree wall target at terrain X 32/608, chosen with the same decision
random byte's bit 4. The aim mirrors with the attacking direction.

The Amiga reloads the global opponent directions for this fallback, so an
electroball still checks that direction even though its receiver search
ignores blocked lanes. This differs from interpreting the WIP's mutable
DirBits references as authoritative. The additional Amiga manager/demo-mode
proximity branch does not apply to the current normal-match mode.

AI release bias is retained through windup and supplied to the existing
unused-axis four-unit release adjustment. Integer intelligence/2 must be
strictly greater than the decision random byte to retain the lateral input.
Human-team throws continue to sample their live controller input at release.
This ports the fallback; the field-player decision to invoke defensive
passing and other carrier/hardware decisions still contain heuristics.

Validation: 148 JavaScript tests, Go tests, Go vet, production build. Mirrored
fixtures cover both wall choices, both halves, electroball behavior, center
target randomness, the strict bias threshold, and a keeper's complete
no-receiver windup/release. No browser or audio listening check in this change.


### Carrier hardware decisions

Ported Amiga `use_court_hardware_ai` (0xf3a8..0xf556), which runs before
normal carrier movement/passing for non-keepers. The AI now tries a low
multiplier throw from the original narrow transverse strips, unless its
team already has the maximum multiplier. Next it considers a high attacking
diagonal toward terrain (32,464) or (608,688). Finally an uncharged ball can
be thrown low at the left/right zapper at (20,880)/(620,272), within the
inclusive 106-unit rectangle, with integer aggression/2 strictly above the
same decision random byte. Pure longitudinal zapper throws are excluded.

The receiver search and hardware branch share predicted opponent directions.
Electroballs ignore blocked directions for multiplier and high wall throws;
keepers bypass hardware choices. Target coordinates and branch order were
checked against the Amiga assembly, including the zapper sprite records at
0x62de/0x62e0 and 0x6308/0x630a. Tests cover multiplier priority and saturation,
blocked/electric lanes, mirrored diagonal throws, zapper limits and aggression,
and a real simulation tick starting a hardware throw without the old danger
or goal-distance trigger. Existing receiver and punt tests remain applicable.

Remaining carrier gaps: collectible detours, zone-center pass decisions,
left/right route search, and the attacking-player pass/shot decision tree.
These still need replacing; this change does not claim the entire carrier AI
matches the original. No new audio or browser validation in this checkpoint.


### Carrier routes, collectibles and pass thresholds

Replaced the generic carrier destination and distance/danger trigger with the
normal carrier branch from `active_player_ai` (0xef28..0xefc2). Hardware still
has priority. A standing selected opponent within 64 cached distance units
forces the role's passing/shooting branch. Otherwise intelligence gates a
visible, unblocked collectible detour; forwards use integer intelligence/2.
The slot priority remains tokens, equipment, then coins. Next, reaching the
role's inclusive zone center triggers passing. Before that center, the AI
tries the original seven candidate targets: mostly forward, both lateral
midpoints toward the front of the zone, both toward its center, then both
toward its back. Random bit 3 sets lateral priority, without a new RNG draw.
The straight candidate uses the original 56/584 wall-lane adjustment and
zone constraints. Blocked directions are retained for carrying electroballs.

Source checks: `try_moving_mostly_forward`, `try_moving_left/right`, and
`find_route_left/right_first` at 0xf0fc..0xf2c2; WIP sub_D742 and sub_DA20..
sub_DB32. Mirrored fixtures cover zone centers, lateral priority, shallower
fallback, the 64-unit boundary, item ordering, blocked item routes and the
strict forward intelligence threshold. Simulation tests cover walking versus
passing and retain hardware priority. Old human throw fixtures now explicitly
place their camera around the player: previously they accidentally exercised
offscreen AI. Possession-loss tests now assert a lob actually began before
removing the ball. AI preparation fixtures disable item detours and use a
standing threat for the high-throw case.

Validation: 157 JavaScript tests, Go tests/vet and production build. A browser
training smoke check advanced from 01:30 to 01:12, rendered the arena and
showed the opponent multiplier at x1.5. This is a runtime check, not proof of
full original parity. The Go server was restarted with this checkpoint.
Forward pass/shot decisions still use the previous heuristic after this
branch chooses not to run; exact animation/medical/item spawning and audio
comparison also remain outstanding.


### Forward shot, reposition and receiver decisions

Ported `active_forward_player_with_ball_ai` (Amiga 0xf60a..0xf736) and
`do_goal_throw_ai` (0x1066e..0x10698). After hardware and normal carrier
routes, forwards shoot if the goal direction has a longitudinal component
and is not the selected opponent's predicted direction. Electroballs take
the goal-shot branch directly. Otherwise, when the selected opponent is
fallen or farther than 64 units, they try the original attacker positioning
table (or its positional fallback) using their own coordinates. An open,
nonzero target starts movement. If that fails they search attackers first,
then midfielders, rejecting both predicted blocked directions and players
outside twice intelligence. Equal-distance ties retain the later roster
entry. A failed search falls back to the goal shot.

Goal shots now use the original center/offset target, integer reference
distance, and inclusive twice-throw-strength low-shot threshold. Teammate
passes use the strict threshold instead. The goal target's AI release bias
is preserved when the branch elects to pass. Goal target construction is
shared with defensive punts. The generic space/distance-scored `passTarget`
implementation and its obsolete tests have been removed. Forward timing
fixtures now place the low-shot carrier inside the actual low-shot range.

Validation: 160 JavaScript tests, Go tests/vet and production build. Fixtures
cover inclusive goal range versus strict pass range, mirrored goal targets,
electroball priority, attacker/midfielder search, ties, observation cutoff,
lookup-table repositioning and an integrated sideways teammate pass. Existing
carrier/hardware/defensive-punt tests still pass. No new browser or listening
check in this change. Source-backed AI branches do not establish whole-game
parity: medical timing, pickups, animation/graphics, frame-order details and
audio comparison still need work.


### Audio camera alignment and match restarts

Corrected stereo placement for the current ball-following camera. Action
sounds now use their transverse position relative to the synchronized
320-unit viewport instead of the center of the whole pitch. Halftime, goals,
injury announcements and substitutions stay centered. The existing authored
synthesized cues remain in use; this is presentation alignment, not a claim
that the Amiga's sample/channel mixing has been reproduced.

Added an authored restart whistle on the transition out of a goal/halftime
pause. Initial play during a pause waits for that transition. Repeated
snapshots do not repeat it, match end does not produce a restart, and inactive
transitions are consumed so returning to the game does not play a late cue.

Validation: 163 JavaScript tests and production build pass. New tests cover
camera extremes, left/right/center positioning, centered announcements,
restarts, full time and inactive playback. Browser training's sound button
successfully entered SOUND ON, then was returned to muted. This verifies
activation only: the actual mix has not been listened to or compared against
the original audio. No gameplay protocol or server changes in this checkpoint.


### Fatal fall before medical care

Moved medical activation and its ten-point multiplier-adjusted award out of
`damage`. A fatal hit now keeps the normal fall action and the match continues
until that action completes. The original Entity opcode handler invokes
`start_injury` only at recovery with zero health (Amiga 0x10e16 onward; WIP
Entity.cs recovery and Player.sub_F6DC). The simulation starts one medical
case in its existing team-interleaved player processing order, so simultaneous
fatal falls are treated sequentially. Injury positions are made even and
clamped to terrain X 48..592 and Y 48..1104 before medical activation. The
fatal fall remains visible, and impact versus medical audio events occur at
their respective phases rather than together on the hit.

Validation: 165 JavaScript tests, Go tests/vet and production build pass.
Updated tests assert no immediate award, no medical activation before fall
completion, clock pause during care and repeat reserve rotation. Additional
fixtures cover coordinate alignment, multiplier scoring once, and two fatal
falls entering care in order. No new browser check in this change.

Remaining medical work: replace the six-second placeholder with the source's
approach/first-pickup/second-pickup/exit phases, position the two medics and
injured player accordingly, center the camera on the injury anchor, and resume
from the actual exit side. The full sequence is not yet ported.

### Modernization requirement (updated objective)

The original supplies gameplay rules and the timing needed for comparable
play. Its hardware constraints are not product requirements. Rendering,
resolution, aspect ratio and animation smoothness should suit modern browsers;
reference tick counts should describe real-time durations rather than cap the
render frame rate. In particular the current strict viewport letterboxing and
visibility-dependent human-control handoff need reconsidering for the updated
objective. This checkpoint changes injury semantics, not those presentation
constraints, and does not claim they are already resolved.


### Modern viewport, rendering and control

Removed the renderer's fixed 320:184 letterbox. The orthographic camera now
fills the browser's actual aspect ratio while preserving minimum useful
court coverage, and follows the displayed ball with smooth bounds at the
arena edges. Players, jumping, free-ball display and camera use exponential
real-time damping rather than frame-dependent linear gains. Carried-ball,
selection-marker and aim positions follow the displayed player. The pixel
ratio cap is now 2 for sharper rendering. These changes modernize presentation;
they do not change the reference durations in authoritative simulation.

Human input no longer hands control to the AI outside the old inset screen.
Tackle resolution and player collision compensation no longer depend on the
old viewport, so physically adjacent players interact regardless of display
coverage. Removed the obsolete viewport argument from collision processing.
The AI's existing tactical perception branches still use their logical view;
this checkpoint does not claim every AI visibility rule has been redesigned.
Audio action panning receives the displayed camera center and half-width,
keeping it aligned as the camera moves or the screen aspect changes.

Validation: 168 JavaScript tests, Go tests/vet and production build pass.
Updated regressions cover human movement and immediate contact outside the
old window. Presentation tests cover portrait through ultrawide aspect ratios,
arena bounds, camera-relative stereo and equivalent damping at 30/60/144 FPS.
These numerical checks do not measure actual GPU frame rate. Browser training
rendered successfully; its canvas bounds and drawing buffer were both exactly
3456x1408 at (0,0), matching the current viewport without letterboxing. The
server was restarted with the gameplay changes. Graphics/animation refinement,
complete medical transport and audio listening comparison remain outstanding.


## Medical transport checkpoint (2026-09-09)

Replaced the fixed six-second evacuation with separate approach, positioning,
lift and carry phases based on the supplied WIP Match.cs medical functions.
Both medics move two terrain units per 25 Hz reference tick. The replacement
enters from the actual carry-out side; the camera stays near the injury anchor.
For modern wide displays, completion uses physical sideline clearance instead
of the original small viewport edge. This deliberately changes route duration.

Protocol v8 replicates the phase, patient index, injury anchor and two medic
positions. The maximum snapshot remains 1200 bytes. Blender-authored medics
and stretcher now have separate transform roots; the asset script supports
--medic-only to rebuild them without changing the other assets.

Validation: 170 JavaScript tests, Go tests and vet, production build, and GLB
assembly checks pass. Tests cover mirrored routes, all four phases, frame-rate
independence, bench rotation, serialized injuries, snapshot ownership and actual
Go-to-JavaScript decoding of off-court medic coordinates. This checkpoint has
not received a visual playthrough of the complete medical sequence. The original
injury ball-launch/resume behavior remains a separate fidelity gap; this change
retains the existing paused ball state. Full gameplay parity is not claimed.


## Injury ball ownership audit (2026-09-09)

Amiga start_injury 0x10ea6 transfers player_with_ball to sprite_nowhere,
marks that anchor busy, and stores the aligned injury coordinates at 0x10eb4.
step_injury_3 clears the anchor's busy flag at 0x112ea. While the clock is
paused, step_prepare_ball_launch 0xd73c waits for that flag to clear, moves
the anchor to (320,576), waits for all visible players to reach their launch
positions and face their starting direction, and triggers the central launcher.
The WIP Match.HandleAnimGoalToInitLaunch follows the same structure.

Implemented the first transition in both simulations: medical care removes any
roster carrier, places the ball at the stationary injury anchor, clears release
input, flight and multiplier movement. The ball stays there while the medics
carry the player away. Regression cases cover a free ball, injured carrier and
unrelated carrier, including stale high-flight and multiplier state.

All 171 JavaScript tests, Go tests/vet and production build pass. Remaining:
return-to-formation and central launcher phases after evacuation are still
missing; current completion still releases the anchor ball in place. This is
not the original restart sequence and remains an explicit gameplay gap.


## Post-medical formation and central restart (2026-09-09)

The medical completion now enters a return-to-formation phase in both Go and
training. Players walk to their stored original launch positions and face their
starting direction, retaining health, attributes and bench rotation. Pending
fatal falls enter medical care before the restart can complete. Modern displays
do not use the original offscreen-player teleport shortcut. The clock and human
actions remain paused, and incoming buttons are consumed throughout the restart.

After formation, a 19-frame deck preparation and 21-frame ball sequence follow
the thresholds in step_ball_launch (0xd816). The vertical curve is a modern
non-interactive presentation, not a recovered original sprite-height table;
after release the existing kickoff height/physics are used. The restart phase
uses spare protocol-v8 flag bits without increasing the 1200-byte packet bound.
The HUD names both phases and the whistle sounds only when play is released.

Validation: 173 JavaScript tests, Go tests/vet and production build pass, including
formation travel, retained damage, clock/input lockout, frame thresholds, queued
injuries, phase replication and whistle deduplication. Full visual/network
playthrough and original launch-height/frame-order verification remain open.
Initial/goal/halftime restarts still use the previous reset/countdown mechanism;
unifying those with this sequence remains outstanding.


## Medical presentation browser check (2026-09-09)

An ignored local preview uses the real initial/step/startInjury functions and
ArenaRenderer, with UI buttons selecting approach, lift, carry, formation,
launcher and release states. Browser screenshots verified independent medics,
stretcher alignment, stationary injury camera and return to the central view.
All sampled medical/restart states retained clock 90 and injury score 0:10.
The preview lives under .reference and is not shipped.

Removed direct 25 Hz position assignment from the medic meshes and carried
player. They now use the existing frame-rate-independent damping; the stretcher
follows the displayed patient position and lift height. First appearance starts
at the actual medic position to avoid an unintended slide from the origin.
Screenshots verify alignment, not subjective motion quality or frame pacing.

Restarted the Go server and joined local arena QCH8SS with two browser tabs.
Both displayed ONLINE / LIVE, WEBTRANSPORT CONNECTED, opposite team selection,
clock 01:24 and score 0:0. This verifies current client/server compatibility,
not a complete online medical event. Production build passes. Remaining visual
work includes the overly rounded player shoulders and clearer human silhouettes.


## Player silhouette and Blender export correction (2026-09-09)

Compared the current renderer with the original Amiga screenshot at
https://thekingofgrabs.com/2023/01/25/speedball-2-brutal-deluxe-amiga/speedball-2-brutal-deluxe-amiga-13/
(viewed directly in the browser). The original sprites show torsos, faces and
legs above a flat court; the previous vertical camera showed mostly helmets
and round shoulder pads. The follow camera now has a modest oblique angle.
Orthographic pixel proportions are preserved and edge clamps use the enlarged
ground footprint. It still tracks the ball/medical anchor and fills the viewport.

Blender players now have smaller shaped shoulder plates, colored crown inlays,
a narrower breastplate and exposed upper arms. Found that bevel modifiers were
not included in prior GLB exports: shoulder plates had only 24 vertices. Player
exports now evaluate modifiers (126 shoulder vertices), retain all seven clips
and support --players-only without rebuilding the other assets. Rebuilt both
.blend sources and GLBs; original commercial assets are not included.

Browser screenshots checked front/back standing silhouettes and medical carry.
Centered the prone mesh on its stretcher because the standing origin is at the
feet. All 173 JavaScript tests and production build pass; GLB structure checks
confirm evaluated geometry and seven animations per team. Full motion, collision
readability and different viewport proportions still need playtesting with the
new camera; this is a visual fidelity improvement, not completed art parity.


## Rapid facing-change regression (2026-09-09)

Following the user's report of rapidly spinning players, a deterministic AI
match reproduced a heading alternating by 45 degrees on successive 25 Hz ticks
while running diagonally (player 8, ticks 133-143 in the pre-fix simulation).
The half-axis direction threshold was reevaluated every tick. WIP Player.sub_EC0C
only reevaluates distant steering at the run-animation boundary, but permits
every-tick correction within 32 terrain units of the destination.

Added retained steering between eight-tick run-cycle boundaries in Go and JS,
with immediate updates for new decisions/destinations and near-target arrival.
Formation returns use it too. Renderer heading changes now interpolate over
the shortest angular arc rather than snapping to every replicated direction.
These are presentation turns; throwing and tackling retain authoritative facing.

Regression tests reproduce the distant straight/diagonal threshold and verify
held headings, immediate destination changes, near arrival, angle-seam crossing
and frame-rate-independent convergence. All 176 JavaScript tests, Go tests/vet
and production build passed before the final formation call-site update; the
formation regression and full Go suite passed after that update. User-observed
live gameplay confirmation is still pending.

## Contact sound and voice-priority checkpoint (2026-09-09)

Steel wall contacts now use a short noise transient and inharmonic fixed
resonances; body hits retain a low thump plus a brief armor rattle. The 32-voice
limit now evicts lower-priority sounds before whistles or match announcements.
A regression floods the mixer with impacts and verifies announcements survive.

An ignored browser test page rendered every cue, kickoff, fulltime and a
collision-storm mix through the real OfflineAudioContext. All outputs were
finite, non-silent, below digital full scale and released all voices. Measured
peaks: body hit 0.0467, steel contact 0.0265, stress mix 0.2187. This is objective
signal/lifecycle validation; subjective listening and loudness balance remain
unverified. Playback controls are available in .reference/audio-preview.html.


## Unified match restarts (2026-09-09)

Connected the formation/launcher sequence to the actual training entry point,
new server rooms, goals and halftime. Goals retain player positions and damage;
after the existing celebration pause, teams walk back to their launch positions.
At halftime they walk across to the opposite formation instead of teleporting.
Medical completion enters the same restart function. Input is consumed and the
clock is held through the pause, formation and launcher. The state factory still
returns a plain ready simulation state for fixtures and lobby previews; actual
match entry points explicitly start the launcher sequence.

178 JavaScript tests, Go tests/vet and production build pass. Added actual goal
transition and kickoff lockout regressions and updated halftime tests to require
walking across the pitch before release. The browser training button displayed
BALL LAUNCH and clock 01:30. Corrected two invalid UTF-8 separator bytes in the
restart HUD. Existing celebration durations and the modern launcher height curve
remain adaptations; original goal-pose/frame-order and camera-gate timing still
need a deeper comparison. No full original-game parity is claimed.


## Power-up and coin spawning (2026-09-09)

Amiga randomise_powerup_positions (0x11612) uses 16-unit-aligned positions
starting at terrain 72, with the two slots in opposite longitudinal halves.
randomise_coin_position (0x11646) assigns the four coin slots separate quadrants.
These Amiga positions differ from the supplied WIP's Atari 32-unit grid at 80;
the new Go and JS implementation uses the Amiga layout. Initial coin timers are
shared after their independent initialization draws, matching Match setup.

Power-up kind selection now rejection-samples the upper random-word nibble
for the twelve valid effects rather than cycling kinds. Power-up waits are
128..255 reference ticks; coin waits are 32..63 ticks. Both remain visible until
collected, instead of expiring after fourteen seconds. Collection now uses the
original distance function and 16-unit limit, replacing the broad 0.85-world-unit
circle. Newly visible items can be collected on their first visible tick.

180 JavaScript tests, Go tests/vet and production build pass. Tests cover regions,
grid alignment, waiting ranges, all twelve sampled types, persistent floor items
and collection boundaries. Existing RNG arithmetic/failed-roll tests now set
their seed explicitly because match initialization correctly consumes draws.

Remaining pickup gaps: armor drop/recollection lifecycle still uses the old
respawn mechanism, match coin-income caps are not implemented, reverse-control
exclusion for original solo modes is not applied, and appearance sound events
are not yet emitted. Full spawn-order/frame-order parity remains unverified.


## Circulating equipment (2026-09-09)

Implemented Amiga randomise_armour (0x1158c), apply_armour (0x116b8)
and tackle_drop_armour (0x1170e) in both simulations. There is one circulating
floor item. Collection hides it and decrements its two-collection allowance.
Damage restores the player's backed-up attribute and drops the same item at
32-unit cell centers. After the second collection, the next damage instead
randomizes a replacement with a 0..255-tick appearance delay. Fresh placement
uses the original 16-unit grid across the full court. Equipment no longer
expires or respawns periodically while held. The source sprite-to-stat order
is translated to this game's attribute-based item identifiers.

Kind zero encodes absent floor equipment through the existing snapshot field;
no packet bytes were added. The renderer hides the previous mesh without
requesting a nonexistent asset. Tests cover two complete collections/drops,
attribute restoration, placement, persistence and decoding held equipment.
182 JavaScript tests, Go tests/vet and production build pass. Browser preview
buttons exercised both collections and hits; a screenshot confirmed the dropped
speed item appears beside the player. Full online match playtesting remains.
This supersedes the earlier equipment lifecycle gap; income limits, solo-mode
power exclusions and appearance sound events still require comparison.


## Match cash and coin appearance limits (2026-09-09)

Amiga collect_coin (0x113d4) awards coin_value, normally 100. spawn_cash
(0xe894) checks the match cash thresholds when a hidden coin's timer expires;
it does not clamp collection income or remove coins already visible. Two-player
setup (0x8be6) sets each threshold to 2000, and new coins remain possible while
either team is below its threshold. Practice setup (0x8b72) uses 10000 and only
the human player's threshold controls appearances. Implemented these rules in
JS/Go, including the hidden byte-timer's 256-tick retry interval. Training entry
now explicitly selects practice configuration. Existing packet fields suffice.

Regression tests cover asymmetric multiplayer income, both thresholds reached,
collection beyond the threshold from existing floor coins, and practice behavior
regardless of AI income. 184 JS tests, Go tests/vet and production build pass.
The English rules explain the amounts and distinction between appearance limits
and collectible floor coins. League/cup economy, starting cash, bonuses and shop
persistence are not represented by the current training/head-to-head modes.


## Amiga power-up selection and solo exclusion (2026-09-09)

Corrected randomise_powerup's index translation using powerup_fns at 0x4616:
shield, freeze, weaken, boost, manic, slow, grab, teleport, reverse, goal block,
energy, zap. Our public identifiers use a different order, so a raw random
index plus one selected the wrong effect for a given source RNG result.
Both implementations now translate the index while retaining existing asset,
HUD and protocol identifiers.

The Amiga comparison at 0x1153c excludes sprite 0x38 outside two-player mode.
Its function-table entry is FREEZE, not reverse controls. Earlier notes naming
reverse controls as the solo exclusion were incorrect. Training now rejection-
samples freeze at initialization and every subsequent spawn. Reverse remains
available. Tests use constructed RNG seeds to select every source table index,
check the exact extra draw after a rejected freeze, and sample the complete
11-effect solo pool using the normal seed. 185 JS tests and production build
pass. No full match RNG/frame-order equivalence is claimed.


## Floor-item appearance audio (2026-09-09)

Amiga spawn_cash, spawn_powerup and spawn_armour play sound 0x25 when the
appearance countdown reaches zero. Added a shared synthesized chime at that
transition in JS and Go (event 21). Hidden coins suppressed by cash limits do
not announce themselves; held equipment stays silent. Zero-timer floor items
and dropped equipment do not produce repeated appearance cues. Events use the
existing bounded snapshot history and spatial audio path without replacing HUD
match notifications or increasing packet size.

187 JS tests, Go tests/vet and production build pass. Tests cover all seven
floor slots, timer boundaries, silent suppressed items and repeated-snapshot
sound deduplication. Real browser OfflineAudioContext rendering passed all cues;
the appearance chime measured peak 0.0161, RMS 0.00088 over the three-second
render, with zero remaining voices. Subjective listening/mix balance remains
unverified; this is newly synthesized audio, not original commercial samples.


## Temporary powers at restart preparation (2026-09-09)

Amiga step_prepare_ball_launch calls clear_powerup at 0xd770 during restart
preparation. Previously temporary effects could survive formation and continue
into the next possession. Both simulations now restore temporary stat backups
and clear the active effect when formation processing begins, after the existing
celebration pause. Equipment and its stat boost, damage, and permanent attributes
remain intact. This uses the modern formation phase as the boundary; precise
original overlay/camera gating remains unverified.

188 JS tests, Go tests/vet and production build pass. Regressions cover all eight
timed effect kinds and equipment/stat/energy preservation. The JS test also
exercises the real simulation pause before formation rather than invoking only
the restart helper. English game rules describe termination on a new ball launch.


## Multiplayer checkpoint and ball rotation origin (2026-09-09)

Restarted the local Go server from current sources. Two real browser clients
joined arena RPU8TP over WebTransport, observed the central launch with a held
01:30 clock, then both showed 01:22 and the same score. The court filled the
ultrawide viewport. This is a connection/startup integration check, not a full
online injury/power-up match verification.

The screenshot exposed a separate visibility bug: the Blender ball has a
floor-based origin, and rotating its whole scene moved its center above/below
the court. Centered the imported model inside a rotation pivot and position
that pivot at the simulation's center height. Trail clones use the same pivot.
A full-rotation geometry test verifies constant center and no floor penetration;
a browser screenshot using the real GLB confirmed the grounded ball is visible.
189 JS tests and production build pass. Simulation physics are unchanged.


## Source-driven central launch flight (2026-09-09)

Read the complete anim_ball_launch sequence directly from the user-provided
ZIP's Amiga.dmp at 0x6d8a; its first ten words and final -2 terminator match
the Amiga disassembly. Implemented the 32-stage sequence in JS and Go as a
third flight kind. After the existing 19-tick deck and 21-tick launch gate,
flight continues from index 20 through eleven remaining frames to ground,
then holds there. Previously it switched to free gravity from an arbitrary
height, creating a different contest/landing window and extra bounces.

Removed the sine-shaped launch curve. Heights are still a modern 3D mapping:
source sprites 7..10 map to intermediate ascent/descent heights, while stage 6
uses the existing high-ball height. This interpretation is not a recovered
physical altitude from the original; exact sprite/projection and one-frame
ordering against the original main loop remain to verify. Renderer interpolation
continues independently of the 25 Hz reference stages.

190 JS tests, Go tests/vet and production build pass. Tests verify release index,
the exact remaining stage sequence, final ground hold and restart lockout.
No commercial graphics or memory dump was added to the repository.


## Launcher mechanism and release audio (2026-09-09)

Added synthesized mechanism and pneumatic release cues, timed to source calls
at 0xd80a (sound 0x09 when formation is ready) and 0xd88e (sound 0x28 at deck
step 19). Events 22 and 23 use existing snapshot history and spatial playback,
so both players receive the same transition cues. They do not replace HUD
notifications. These are newly designed timbres, not copies of original samples.

191 JS tests, Go tests/vet and production build pass. Boundary regressions in
both languages require exactly one mechanism event and one release event.
Actual browser OfflineAudioContext rendering passed all cues: mechanism peak
0.0553/RMS 0.00243, release peak 0.0318/RMS 0.00189, zero leaked voices.
Subjective listening and full-match loudness balance remain unverified.


## Catch-condition audit and interception feedback (2026-09-09)

Compared get_ball (0xeb9c) with both catch implementations: selected-player
collection, inclusive 16-unit distance and an active jump for ball stages above
two are already represented. The current audit did not change those rules.
The Amiga-only interception branch at 0xec88 was missing its distinct signals.
Added synthesized team-specific cues (events 24/25) for taking an opponent's
non-electrified ball, alongside the existing catch contact. Friendly passes and
charged balls skip these cues. Preserve the charge flag before ordinary catch
cleanup so an electrically marked ball cannot gain the normal interception cue.

192 JS tests, Go tests/vet and production build pass. Regressions exercise both
teams, friendly/opponent possession and charged/unmarked catches. The two new
timbres are modern interpretations of source sound 0x29/0x28; no original
samples are included. Subjective audio review remains pending.


## Formation movement during medical care (2026-09-09)

The supplied Player.cs clock-paused control branch sends available players to
_launchXY while medical transport runs. Previously the modern simulation
returned immediately from medicalStep, freezing the whole roster until the
patient left and then requiring everyone to walk back. Both simulations now
advance healthy players' formation movement during care, respecting action and
wait timers. The current patient is excluded, and other fatal falls wait for
the serialized medical service. The ball/medical camera anchor and stopped
match clock remain intact; launcher phases and their sounds cannot start early.

193 JS tests, Go tests/vet and production build pass. Integrated simulation
regressions verify healthy-player arrival, unchanged patient status and ball
anchor, a waiting second injury, and no premature clock/launcher advancement.
The original offscreen teleport shortcut remains intentionally replaced by
continuous movement in the modern renderer. This closes the earlier frozen-
teammate medical gap, not the remaining original viewport/phase timing audit.


## Substitute baselines and Full Energy (2026-09-09)

Confirmed substitute_player/round_player_stats at 0xbacc/0xbb5a copies current
attributes, rounds down to tens and rotates the three reserves as implemented.
Found Full Energy still restored a hard-coded 100 in every attribute. Source
powerup_energy calls reset_player (0x137ca), which reads the current player's
saved attribute record. Added a separate baseline per active player, initialized
with the roster and replaced when a reserve enters. Full Energy copies that
baseline rather than flattening upgraded or returning players to 100. Live
attribute mutations do not alias the saved JS baseline. No packet fields added.

Regression tests in both languages cycle through four injuries/substitutions,
including the return of the rounded outgoing player, then damage attributes
and use Full Energy to verify the correct baseline each time. Go tests/vet and
production build pass. Current exhibition rosters still start with uniform
attributes; original mode-specific roster initialization remains to compare.


## Original two-player roster initialization (2026-09-09)

Amiga game_two_player loads 170 into D1 at 0x8c16 and calls init_player_stats
for both twelve-player attribute tables. The helper at 0xa4e6 writes all eight
attributes, including reserves. Actual online room creation and the browser's
AI warm-up now use explicit match constructors with these values and the central
restart sequence. Bare initial() remains a low-attribute fixture/lobby factory.

With the existing source movement thresholds this changes running from five to
six terrain velocity units without the ball, and four to five while carrying.
Throw, combat and intelligence calculations also receive the correct starting
attributes. Full Energy and incoming reserves retain the 170 baselines.
195 JS tests, Go tests/vet and production build pass; match-constructor tests
cover all active/reserve attributes, running rates and recovery baselines.

Training remains a modern AI exhibition, deliberately using the online roster
pace. It is not a recreation of Amiga game_practice, which hides the second
team. Existing solo pickup/cash behavior remains in this warm-up. League/team
management and other original mode-specific initialization are still absent.


## Extended browser/server simulation comparison (2026-09-09)

Added a shared seeded 5000-tick AI scenario started through the real match
constructors. The JS test executes a Go trace and compares once per 25 ticks:
clock, period, scores, RNG words, ball position/height/owner/velocity and active
flight state, restart phase, and all player positions/health/actions/facing.
Unused flight indices and held-ball slowdown counters are excluded because
one implementation clears them while the other leaves inert values.

The scenario exposed divergence at tick 1305. A floating-point world-coordinate
boundary made JS skip ball slowdown where Go applied it, changing velocity and
all later ball positions. step_slow_ball compares integer terrain Y to 48..1104
in the source. Both implementations now convert to integer terrain coordinates
before testing that interval. Boundary tests cover both ends, just outside,
and tiny positive/negative floating-point noise.

197 JS tests, Go tests/vet and production build pass. The full 5000-tick seeded
scenario now matches at every sampled checkpoint. This establishes parity for
that scenario, not exhaustive JS/Go equivalence or original-game frame parity.


## Complete-match parity with player input (2026-09-09)

Expanded the cross-language trace to three 10000-tick scenarios: AI versus AI,
one scripted human versus AI, and two scripted humans. Inputs chase the ball or
advance toward goal while exercising held fire, lob and tackle controls. Samples
now include current attributes, equipment, credits and temporary effects, in
addition to positions, actions, RNG, score and flight state. Held/stationary
ball slowdown counters are excluded when inert, like inactive flight indices.

All three scenarios reach full time in the second half. Assertions require
throw/contact/goal/pickup/catch/restart events in each; the mixed-input scenario
also requires warp, injury and substitution events. Both simulations agree at
every 25-tick checkpoint throughout all three runs. This is simulation-level
integration coverage, not an actual two-client network injury playthrough, nor
proof of original Amiga frame equivalence. No production behavior changed in
this checkpoint. The extended trace and full JS/Go suites pass.


## Live two-peer WebTransport medical playthrough (2026-09-09)

Ran two actual browser WebTransport sessions against the freshly rebuilt local
Go server. The reproducible tools/network-playtest.html page sends ordinary
movement/tackle input toward the ball; it does not change server state or force
an injury. It decodes the real snapshots and renders one peer with the normal
Blender renderer while reporting both peers' received events and medical phases.

Arena SYZ9VC: both peers agreed at tick 1002 on minimum energy 50 and at tick
2186 on energy 8. By tick 2966 both had observed medical phases 0,1,2,3, exactly
one injury and one replacement, plus the same event-kind set. A screenshot
confirmed the return to the central ball after substitution. Stopped both test
sessions through the page's Stop button. The Go server remains running.

To repeat, start the development client/server, open /tools/network-playtest.html
and click Start paired clients. Stop closes both sessions. This verifies actual
medical state/event transport and decoding; deliberate packet-loss simulation,
remote-WAN behavior and subjective sound review are not covered by this run.
No gameplay code changed in this verification checkpoint.


## Burst snapshot-loss playtest (2026-09-09)

Extended tools/network-playtest.html with a visible option to discard five of
every 25 incoming snapshots on the second real WebTransport client. It compares
complete decoded states at matching ticks with a bounded 128-tick pairing map,
and checks event IDs through the latest ID received by both peers. This models
receiver-side snapshot loss, not QUIC congestion or WAN latency.

Arena 4E888T at tick 720: second client discarded 144 snapshots; 575 shared
snapshots compared with zero state mismatches and zero missing shared events.
Both peers reported identical minimum energy 71 and the same action, contact,
pickup-appearance and launcher event kinds. Stopped both sessions using the UI.
This bounded run validates recovery under these short loss bursts; extended
outages beyond the retained event tail can still lose transient sounds. The
previous live medical run did not enable loss, so no combined loss/medical
claim is made. No production simulation or network code changed.


### Keeper contact: complete call chain (2026-09-09)

Correction to commit a8ae2c4: reading only `get_ball` at 0xebd6 was insufficient.
It calls `goalie_deflect_ball`, whose first instruction at 0xed52 checks ball
stage <= 2. Higher balls pass the block unchanged. At 0xed5c..0xed80 an enemy
charged ball with remaining charge calls `zap_player` and returns without a
deflection. Only the remaining path emits the block sound and rebounds using
the original direction table. The previous broad deflection change is undone.

The full chain also reveals an actual difference: the keeper block path does
not call `test_shield_powerup`, while ordinary catching does at 0xec10.
`zap_player` calls `damage_player` directly, which has no shield check. A low
electric shot therefore damages a blocking keeper even with Shield active;
a standing shielded keeper can catch it. Browser and server now preserve this
specific exception without changing shield protection for other damage.

Tests combine low/high stages, charged/ordinary balls and shield on/off.
They check damage, charge consumption, unchanged high-ball movement and the
presence of a deflection sound only when a rebound actually happens. Existing
coverage retains both direction tables and all eight facing directions.
The four full-match parity scenarios remain, including the dedicated medical
scenario. An inferred caller ordering alone is not evidence for a callee's
behavior; both functions above support these expectations.


### Catch impact audio eligibility (2026-09-09)

`get_ball` sets possession at 0xece0, then tests both planar velocity words
at 0xece4 before playing sound 0x0e at 0xecf0. A stationary pickup or a purely
vertical launcher catch does not play that impact. Browser and server now
emit event 16 only for planar motion. Interception events 24/25 remain
independent, matching the preceding 0xec88 branch. No new audio asset or
protocol field is required.

Tests cover both movement axes, zero planar velocity with vertical movement,
friendly catches and interceptions. The tackle-only parity scenario no longer
requires impact event 16 because it never throws; the other three complete
match scenarios still require it. The peak vertical catch fixture explicitly
asserts silence rather than assuming any successful catch makes a sound.


### Preserve ball position at throw release (2026-09-09)

The complete `throwing_action_fn` at 0x107be..0x108de changes possession,
velocity, flight animation, charge budget and release steering without writing
ball coordinates. The carried coordinates are assigned in `step_match` at
0xcff4..0xd03e using the current player animation. Our release instead reset
the ball to 0.9 world units ahead of the player, whereas the carried offset
was 0.5, creating an extra forward jump. Both simulations now retain the
existing ball coordinates at release. The modern carried-ball pose still uses
a fixed offset; original per-sprite hand positioning is not yet reproduced.

All eight directions and both throw heights have regression tests for position
continuity and the release audio location. Complete-match comparison still
covers four scenarios. With corrected release positions, AI-only play covers
warps and side scores; the mixed and two-human scenarios cover goals, and the
tackle-only scenario retains injury/replacement coverage. Event requirements
follow those observed scenarios, preserving aggregate feature coverage.


### Throw clip playback timing (2026-09-09)

The renderer previously played the Blender Throw clip at its authored duration,
longer than the 8/25-second simulation action, so changing back to idle/run
cut the throw short. `playPlayerAction` now scales Throw to eight reference
ticks and starts it from the received remaining action time. Catch and Punch
retain their existing durations and also seek to the received action phase.
Run still loops and other clips retain their existing timing.

Tests load the actual cyan GLB through Three.js and check clip midpoint at
release, completion at 0.32 seconds for 30/60/144 FPS and a late snapshot
starting at recovery. `tools/animation-playtest.html` provides normal and
quarter-speed playback plus a static release inspection. Browser inspection
confirmed the model renders and playback reaches completion. This establishes
clip timing, not exact hand-to-ball alignment; the Blender throwing pose and
carried-ball attachment still need coordinated visual refinement.

Validation: 202 JavaScript tests and production build pass. No server or
protocol changes in this increment.


### Blender throw pose at release (2026-09-09)

The authored throwing arm previously swung forward early and back down by the
clip midpoint. The throw now winds back, extends forward at frame 16.5 (half
of the frame 1..32 clip) and recovers afterward. Root lean shares the same
keyframe timing. Both team `.blend` sources and GLBs were regenerated with
Blender 5.2 using `--players-only`.

The browser release-pose preview shows the hand extending at chest height.
An asset-level test checks the forward extension and height of the throwing
hand in both exported teams at the simulation's 0.16-second release. Playback
at 30/60/144 FPS and late-snapshot timing remain covered. Ball attachment is
still based on the simulation's fixed carried offset; this change refines the
pose and does not claim that the ball is now attached to the hand.


### Blender hand attachment for the displayed ball (2026-09-09)

Both player assets now export a `BallGrip` empty parented to the throwing arm.
Its position sits just beyond the fist. While possession is held, the renderer
reads its animated world position after updating the actor's transform. Older
assets without the attachment retain the existing fallback. Upon release,
the existing ball damping follows the authoritative ball position; trailing
meshes now follow the displayed ball instead of the unsmoothed simulation.

The pose preview includes the real Blender ball mesh and demonstrates the grip
at the release midpoint. Asset tests check the grip-to-hand distance and floor
clearance throughout wind-up for both teams. This is a presentation change:
collision, scoring, camera target and replicated ball coordinates retain the
simulation's carried offset. Exact original per-animation collision offsets
are still a separate fidelity requirement, and live latency testing of the
visual transition remains pending.


### Live delayed-receiver throw playthrough (2026-09-09)

`tools/network-playtest.html` now supports throw inputs, a 160 ms scheduled
receive delay on client 2 and viewing that client's renderer. The reader
continues consuming datagrams while delivery is delayed; changing timing
options is disabled after start, and Stop cancels pending deliveries. This
is local receive-delay simulation over real WebTransport, not measured WAN
latency or QUIC congestion.

In room 3S5E6P, client 1 reached tick 954 and client 2 tick 950. Both observed
11 throws, catches, interceptions and a goal. There were 949 paired snapshot
comparisons, zero state mismatches and zero missing shared events. The renderer
observed 10 held-to-loose throw transitions and measured zero held-grip error.
The largest first-frame release displacement was 0.521 world units. This is
an observation, not a smoothness acceptance threshold: frame duration and
normal ball motion also contribute. One throw did not produce a sampled
held-to-loose rendering transition. Long outages, variable delay and subjective
release smoothness still need coverage. Both sessions were stopped afterward.


### Tackle, jump and fall clip durations (2026-09-09)

Slide and Jump playback now uses `actionDuration` from the simulation's
original sustain table, with player speed read from the snapshot. Hit uses
35/25 seconds, matching the existing fall timer. Each starts at the phase
represented by remaining action time, instead of restarting an authored clip
when its first network snapshot arrives. This replaces the earlier unchanged
Blender timing for these clips; Run continues to loop.

Actual-GLB tests cover all five sustain values, completion for Slide/Jump,
and fall recovery plus late entry. The browser preview includes inspection
buttons for those poses; the tackle midpoint rendered successfully. These
checks establish playback timing and pose availability, not full equivalence
of every pose to the original sprites. Mid-action speed changes and missed
complete actions remain presentation cases to investigate.


### Browser audio lifecycle verification (2026-09-09)

`tools/audio-playtest.html` renders all 25 numbered cues plus kickoff/fulltime
through the browser's real OfflineAudioContext and offers WAV playback controls.
A dense collision mix checks the voice limit with announcements present. Three
additional cases suspend at 0.1 seconds into fulltime, invoke pause, mute or
reset, and resume rendering. Later whistle notes at 0.3 and 0.6 seconds must
be canceled. Each case requires zero remaining voices and silent output from
0.2 seconds onward, allowing the audio graph to settle after the stop.

The browser reported PASS for all 31 cases. Interception cues 24/25 peaked at
0.0305/0.0321; the stress mix peaked at 0.2073. All output was finite and below
full scale, with no remaining voices. Pause/mute/reset each had tail RMS zero.
This validates scheduled-source cancellation, not the perceptual mix or the
speaker/headphone output. The sound engine required no lifecycle code change.
The in-game rule text was also corrected to state the keeper block-dive
exception to Shield protection established in the source audit.


### High-ball wall clearance (2026-09-09)

`constrain_sprites` at 0xe5f4..0xe602 chooses a 24-terrain-unit inset for ball
stages above 2, or 32 for low stages. `constrain_sprite` uses that inset on
both court axes, clamps an out-of-bounds position, reverses velocity and then
advances it. Both simulations previously used the low-ball boundary for every
height. They now give high balls the extra eight units of clearance on all
four walls; existing high-ball rebound fixtures start near the corresponding
higher boundary. Goals still require low flight.

New tests exercise both heights, both signs, both axes and positions between
and beyond the respective walls. The four complete parity scenarios exposed
a separate stale-state bug at tick 4376: a knocked-loose browser ball retained
the previous throw's slowdown timer, unlike the server's fresh Ball value.
That timer, slowdown accumulator, nominal direction and electric budget now
reset on the browser damage path, with a focused regression test.

After correction, all four scenarios again align. Goal coverage remains in
the mixed-human scenario; the changed two-human trajectory has no goal in this
seed. Warp and medical coverage remain required elsewhere in the same test.
The original animation-before-constraint ordering still requires a separate
boundary-frame audit; this change establishes the height-specific geometry.


### Flight-stage ordering at wall and goal contact (2026-09-09)

`step_match` calls `step_sprites` (0xcf5c), `handle_score_goal` (0xcf60), then
`constrain_sprites` (0xcf64). Inside `step_sprites`, the ball animation advances
at 0xe852..0xe856; `step_sprite_animations` writes the current sprite index at
0x10d1a. Goal eligibility (0xdb38) and wall inset selection (0xe5f6) therefore
use that newly advanced flight stage. Our simulations previously advanced the
flight table only after those checks and ball movement.

Both now advance table-driven flight immediately before goal/wall handling.
A ball crossing from stage 2 to 3 uses the high boundary immediately; a ball
crossing from 3 to 2 can score or hit the low side boundary on the same tick.
Regression tests cover both transitions at all four walls, including both goal
directions. The full four-match browser/server comparison still passes without
changing its event requirements. The modern non-table gravity fallback remains
separate; this verifies the original flight-table path.

Validation: 209 JavaScript tests, Go tests, Go vet and production build pass.


### Four wall-contact sound categories (2026-09-09)

`constrain_sprite` selects low/high side-wall sounds 0x04/0x32 at
0xe664..0xe680 and low/high end-wall sounds 0x33/0x34 at 0xe6d2..0xe6ee.
The simulation now distinguishes these contacts as events 5, 26, 27 and 28.
New WebAudio synth cues provide higher ringing side contact, a lower end-wall
impact and a brighter high end-wall impact; no commercial samples are used.
The existing event byte carries these IDs without a snapshot layout change.
All four preserve wall particles and the existing WALL REBOUND feedback.

All-wall boundary tests assert the appropriate cue for both heights and axes
in browser and server. The browser audio playtest passed all 34 cases; new
cues 26/27/28 peaked at 0.0292/0.0318/0.0303 and released every voice. This proves
finite non-silent output and cleanup, not subjective resemblance or final mix.
209 JavaScript tests, Go tests, Go vet and production build pass.


### Own-goal feedback (2026-09-09)

The original goal handler selects `str_overlay_own_goal` at 0xdbb4 when the
last ball holder belongs to the team conceding. Goal event 7 now retains the
last-touch player in its existing target field; its actor remains the team
receiving the points. The HUD distinguishes OWN GOAL! from GOAL! using those
event fields, so a delayed notification does not depend on current ball
ownership. Unknown last touch remains an ordinary goal announcement.

Browser/server tests cover both ends in both halves, both teams' last touches,
unknown attribution and a scoring multiplier. Points still go to the team
attacking that goal, including for own goals. No wire layout or audio changes
are required. Original goal-scorer statistics and end-of-match player ratings
are separate features, not implemented by this notification change.


### Repeated actions across omitted idle snapshots (2026-09-09)

The renderer previously restarted a clip only when the action kind changed.
If an idle snapshot between two tackles was omitted, the second tackle could
retain a finished first clip. A newly increased remaining action time now
restarts Slide, Jump, Throw, Catch or Punch even if the kind is unchanged.
A 15 ms margin ignores tiny rounding differences; the wire timer itself has
1 ms precision. Repeated/decreasing timers, looping Run and medical Hit holds
do not trigger this path. Player speed attributes were confirmed present in
the decoded snapshot, so sustain timing does not need a protocol change.

An actual-GLB test finishes a tackle, skips its idle state and introduces a
second tackle snapshot; playback resumes near the start of the new clip.
Other tests cover unchanged snapshots, rounding and medical holds. This
handles an observed timer increase, not arbitrary complete actions lost during
long outages or cases where a new action arrives with a lower timer.
Validation: 212 JavaScript tests and production build pass.


### Keyboard lifecycle for browser play (2026-09-09)

Repeated Escape keydown events no longer toggle the menu repeatedly. A repeated
movement/action keydown is accepted only if that key is already held, preventing
OS key repeat from restoring controls cleared on pause or focus loss. Local
training also consumes queued input-edge counters when controls are cleared,
so a Space press immediately followed by pause cannot start a new throw after
resume. Online input history is not modified; actions already accepted by the
server remain authoritative. The last network snapshot after disconnection
need not contain local input history and is handled safely.

Tests simulate held/repeated/fresh key transitions and use the actual training
simulation to verify canceled queued fire followed by a working fresh press.
This is browser lifecycle behavior, not a change to the original match rules.
Validation: 216 JavaScript tests and production build pass.


### Zap victim movement and ball release (2026-09-09)

`powerup_zap` chooses velocity table 4 for a moving victim or table 3 for a
stationary one at 0x11a5e..0x11a6e, retaining the victim's facing. At 0x11a72..
0x11a7a it releases possession without changing the ball's coordinates or
velocity. Our generic damage path instead gave no fall drift and launched a
new ball from the victim with a fixed attacker-facing impulse.

Zap now sets the victim's fall drift from their facing and previous movement,
and restores the carried ball data with ownership released. Other damage
paths retain their existing behavior. Tests cover moving/stationary victims
and preserved ball position, velocity, height, attribution and slowdown data.
All four long browser/server match scenarios remain aligned. The changed
Zap movement removes injury from the tackle-only seed; medical and goal
coverage is now explicitly required from the mixed-player scenario, which
still contains both injury and substitution events.

The source offscreen-victim exclusion and dedicated Zap sound remain separate
fidelity items; this increment addresses movement and release only.


### Dedicated Zap activation audio (2026-09-09)

`powerup_zap` ends with sound 0x12 at 0x11a8a..0x11a8e. The existing pickup
event carries token kind 12, so the audio observer now selects a dedicated
synthesized discharge for that event instead of the generic pickup chime.
No additional event or wire bytes are needed. Its stereo position remains
at the pickup and its priority matches other power-ups, below match whistles.

Tests cover one discharge per pickup despite repeated snapshots, ordinary
pickup sound preservation and voice-priority behavior under collision load.
The real browser audio playtest passed all 35 cases; Zap output peaked at
0.0337 with RMS 0.00141 and zero remaining voices. These are technical audio
checks; the final perceptual mix still needs listening review.
Validation: 219 JavaScript tests and production build pass.

### Bounded presentation turn speed

Abrupt heading changes could produce visual angular speeds above 2,500 degrees
per second despite shortest-arc interpolation. Player presentation now caps turns
at 720 degrees per second, then decelerates toward the authoritative heading.
The capped exponential is integrated analytically, preserving identical timing
at 30, 60 and 144 FPS. This changes presentation only; authoritative facing,
throw direction and AI decisions retain their existing simulation behavior.
Regression tests cover sudden reversals, the angle seam, angular speed limits,
frame-rate independence and zero/negative elapsed time. JavaScript tests and the
production build pass. This is not yet a confirmation that every reported
spinning case has been reproduced or resolved in a live match.


### Zap activation range

`powerup_zap` checks the opponent offscreen flag before applying damage
(0x11a20â€“0x11a26); the WIP `Token.Init_ZapTeam` has the same exclusion.
`update_offscreen_bit` (0xda5eâ€“0xda98) uses inclusive player-center bounds
of 0â€“320 horizontally and 0â€“184 vertically relative to the logical view.
Both simulations now apply that boundary before Zap damage or ball release.

The shared ball-following logical view determines gameplay range; modern browser
resolution and camera aspect ratio do not give a player extra Zap reach. This is
an explicit adaptation of the original screen-based rule: opponents visible in
the additional area of a wide display can be outside the activation area.
The in-game rules describe the limited reach.

Boundary tests cover both inclusive corners and one unit outside each edge at
three scroll positions, including both ends of the court. Excluded carriers keep
their ball. Existing tests retain shield, damage and release-motion coverage.
All 221 JavaScript tests, Go tests, Go vet and the production build pass.

### Tackle contact and possession audio

The full Amiga `do_tackle` routine plays sound 0x06 at 0x10494 before
rolling success at 0x104aa. A failed contact therefore still has audible feedback.
After a successful possession transfer, 0x10576â€“0x105ae plays the same
team-dependent 0x28/0x29 signal used for interceptions.

Both simulations now emit contact event 29 before the roll, then the existing
body-hit event on success and team possession event 24/25 only when the victim
was carrying. A short synthesized armor contact distinguishes a resisted tackle
from the heavier successful hit. Event IDs suppress repeated playback across
snapshots and the resolved contact cannot replay on subsequent action ticks.

Regression cases cover both teams, both success outcomes and carrying/noncarrying
victims. All 222 JavaScript tests, Go tests, Go vet and the production build pass.
The browser OfflineAudioContext check passed all 36 cases, including the new
contact cue (peak 0.0166, RMS 0.00035), stress and sound cancellation. This checks
rendered signal integrity, not subjective balance in a full live match.

The ball-drop audit also identified an outstanding case: the original preserves
an already attacking victim's action callback when knocked down, allowing a
falling counter-contact to release possession without taking it. Our generic
stunned state currently skips that callback. Ordinary successful tackles already
transfer the ball directly; the generic damage helper's temporary impulse is
superseded in that path. Falling counter-contact and its release still need
implementation and source-based tests.

### Falling counter-contact

Amiga `do_tackle` (0x104eaâ€“0x1050e) retains an unresolved slide, keeper slide
or punch callback on a victim instead of always installing `noop`. A falling
attacker reverses the impact direction (0x1051aâ€“0x1052a). When the next victim
has the ball, 0x10554â€“0x10562 clears possession without taking ownership or
applying a new throw impulse.

The browser and Go simulations now retain that pending contact separately from
the visible Hit action. Resolved attacks, completed slides and non-attacking
victims do not receive a counter. A counter uses the original attack kind for
tackle probability and fall speed, releases an existing carried ball without a
new impulse, and emits no possession-acquisition sound for the falling player.
Zap and electroball falls do not preserve the attack callback.

Tests cover simultaneous attacks in roster order, slide/punch counters, reversed
fall velocity, released-ball motion, single contact, and exclusion of ordinary
falls or already resolved attacks. Long parity matches exposed a zero nominal
ball-direction mismatch at warp entry after a dropped ball; JavaScript now uses
the same velocity fallback as Go. Possession transfer also clears stale flight
metadata in both implementations. The tackle-only parity scenario now supplies
warp coverage; goal, injury and replacement coverage remains in scenario one.
All 225 JavaScript tests, Go tests, Go vet and the production build pass.

Remaining timing detail: the original retained completion callback can jump the
fall animation to word 15, shortening its recovery tail. This change restores
counter-contact and possession behavior but still uses the existing 35-frame
fall recovery. Exact callback-to-animation-tail timing remains to be implemented
and verified; this does not establish full original tackle fidelity.

### Athlete art direction: compact helmets and forged armor

Compared the models against the original Amiga match screenshot at
https://thekingofgrabs.com/2023/01/25/speedball-2-brutal-deluxe-amiga/speedball-2-brutal-deluxe-amiga-13/ .
The reference informed silver equipment, colored helmets and broad shoulders;
no reference pixels or commercial meshes are included in the assets.

Both Blender athletes now have a tapered chest and waist, smaller helmet,
separate face features, flatter forearm/knee protection, and narrower boots.
Dedicated satin plate and skin materials reduce the uniform glossy finish.
Upper back and lumbar plates keep silver armor visible from both directions,
with team markings on the chest, back, helmet and shoulders. The mesh shells
are authored in `assets/build.py`; both native Blend files and GLB exports are
included. Each GLB is approximately 308 KB (previously 221 KB).

The existing animation pivots and BallGrip attachment are retained. All eight
asset animation tests pass, including both teams' throwing hand positions and
30/60/144 FPS timing; production build passes. Inspected the release pose and
both teams in a full-screen training match at 3456x1408. This is an initial
silhouette/material refinement; the models remain stylized and the broader
arena, motion polish and final visual acceptance remain outstanding.

### Court readability and shadow cleanup

The diagonal pattern covering the floor in earlier playtest screenshots was
shadow acne, not an authored metal texture. A small directional-light normal
bias and depth bias remove the self-shadow striping. Checked the shadow change
with the old court first, then inspected the revised arena in fullscreen.
Player contact shadows remain visible in the checked view.

The Blender court now uses rougher, slightly darker blue-gray steel, thinner
panel seams and flat octagonal steel fasteners in place of glossy spherical
rivets. The ball and raised score domes retain their brighter rounded forms.
The native arena and GLB were rebuilt; exported contact alignment remains
end=21.155556, goal half-width=1.866667 and side=11.2 world units.
The arena GLB decreased from 2,334,856 to 1,479,208 bytes, primarily by replacing
170 high-subdivision decorative spheres with simple flat fasteners.

Production build and diff checks pass. Visually inspected the final scene in a
3456x1408 training match, including the airborne ball/shadow, players, floor
fasteners and a score dome. Surface wear, stadium dressing and wider lighting
coverage still need further art work; this is not final visual acceptance.

### Graphics-first direction and higher match overview

The user asked to prioritize graphic direction and supplied a screenshot with a
more distant, higher camera. Match coverage now has a minimum half-height of
7.5 and half-width of 13.5 world units. The follow camera looks down from a
32-unit rise with a 12-unit setback (previously 18), while retaining ball tracking
and edge clamping. Portrait views center when the whole court fits; widescreen
views show additional surrounding space. Camera tests cover the new minimum
coverage across portrait, landscape and ultrawide aspect ratios.

The current art study uses neutral warm stadium light, subdued green-gray steel,
ivory markings and satin metal goal frames. Blue/red light is confined near the
goals, with reduced intensity/range. Shared `src/lighting.js` keeps the game and
`tools/art-direction.html` study consistent. The local study provides orbitable
player and court views, palette notes and an explicit work-in-progress label.
It is a Vite development page, not a separately published production route.

Inspected the zoomed-out game at 3456x1408 and the interactive art study in the
browser. All five camera/presentation tests and production build pass. The final
arena export includes thin goal-apron stripes that are excluded from the goal
floor alignment rule so they do not expand into a full colored floor panel.

Gameplay recovery work is deferred in Git stash
`WIP fall recovery timing - deferred for graphics direction` at the user's
request. Do not resume it ahead of the visual direction work. The art remains a
prototype: character anatomy, material wear, stadium dressing and user visual
acceptance are still outstanding.


### Industrial court dressing

The Blender arena now has a hollow plum midfield star stencil, wall service
panels with recessed vents and fasteners, and continuous terrace risers with
seat pads and backs. The stencil is decorative; the ten score stars, two score
domes and four warp rings retain their separate exported names and behavior.
Static dressing is joined into five mesh groups before export. The GLB is now
3,867,264 bytes; this adds download size and is not an FPS improvement claim.

Inspected the exported court in the orbitable art study and fullscreen training
at 3456x1408 using the higher ball-follow camera. The study has a wider court
framing and separate fog range so the entire arena can be reviewed. Production
build passes. Character anatomy and surface wear remain unfinished.


### Contoured athlete equipment

Blender-authored elliptical cross-sections replace slab-shaped shoulders,
forearms, thighs and shins. The shells widen over muscle groups and narrow at
wrists and ankles; the thigh shell leaves more separation at the knee guard.
Both team models retain the existing animation hierarchy and hand grip.
Inspected both exported athletes in the browser art study. All eight exported
player animation tests and the production build pass. These changes refine
armor silhouette; articulated elbows/knees and less rigid poses remain work
for a later character animation pass.

### Articulated running knees

Each Blender athlete now has a knee pivot beneath each hip, carrying the knee
guard, shin and boot. The Run clip alternates flexion during swing and near
extension during stance. Other clips explicitly reset the knee pose. The art
study includes a Run animation toggle for inspecting the current exports.

Inspected successive running poses in the browser. Nine exported-model tests
pass, including opposite knee phases, loop continuity and the prior throwing
hand/action timing checks; production build passes. This does not yet provide
foot planting, articulated elbows or a complete animation polish pass.

### Articulated elbows and throwing grip

Both Blender athletes now have elbow pivots carrying forearm armor, hands and
(on the throwing arm) BallGrip. Running uses bent arms; catching and punching
flex/extend the forearms. Throw wind-up bends the elbow and the release key
extends it, preserving the previously checked forward hand position.

All nine exported-model animation tests pass after updating hand lookup for
the nested hierarchy. Grip distance and floor clearance remain checked through
wind-up/release for both teams. Inspected running and the release pose in the
browser; production build passes. Full-body weight transfer and foot planting
still require animation work.

### Running ankle articulation

Blender ankle pivots now carry each boot and toe plate. Run keys counter the
hip, knee and torso pitch to keep soles near horizontal. Other clips explicitly
reset ankle rotation. This changes orientation only: world-space foot planting
and ground-contact timing remain incomplete.

Inspected running in the browser. Ten exported-model tests pass, including
49 samples per team checking sole tilt stays below 12 degrees throughout the
cycle, plus prior knee phase, grip and action timing tests. Production build
passes.

### Baked running ground clearance

The Blender builder evaluates the Run clip in isolation and samples the actual
boot geometry with modifiers applied. It bakes body height at every frame to
bring the lowest sole to 0.01 units above the model origin. A subtle torso lean
variation is exported with the gait; the earlier constant lean was omitted from
the GLB animation and caused a mismatch between Blender floor measurements and
browser playback.

Eleven exported-model tests pass. The new check samples both teams at 97 times
and requires the lowest sole to remain between -0.005 and 0.04 units, including
interpolated frames. Browser running preview and production build pass. This
reduces vertical floating; horizontal foot sliding, cadence versus travel speed
and full weight transfer still need work.

### Distance-driven running cadence

The renderer now advances Run from displayed horizontal travel instead of a
fixed wall-clock rate, using an initial calibration of 1.2 court units per
two-step cycle. This follows the interpolated player position used on screen.
Large position snaps do not advance the gait. Timed tackle, throw, catch, jump
and fall clips continue to use elapsed time and their simulation timing.

Twelve animation tests pass, including identical stride progression for equal
travel at 30, 60 and 144 FPS, zero travel and relocation. Fullscreen training
renders the updated gait; build and diff checks pass. This synchronizes overall
cadence but does not lock a planted foot to a world-space contact point. The
stride calibration and turn transitions still need visual refinement.

### Running start and stop blending

Run enters with a 120 ms blend. Stopping holds its current phase and fades the
pose back to rest over 120 ms. The renderer now keeps mixer time in seconds and
sets only the Run action's rate from travel, so a stopped player can finish
blending even with zero displacement. Timed action playback remains in seconds.

Thirteen animation tests pass. The new exported-model test checks a raised
knee settles toward rest while the stride phase remains fixed, then reaches
rest after the fade. Build passes and fullscreen training starts with the
updated renderer. This is pose blending, not world-space foot locking.

### Steel floor plate finishes

The Blender arena now has 36 thin replacement plates aligned within the
existing panel seams. Five subdued green-gray material variants change base
color and roughness slightly across the court, breaking up the uniform steel
surface. Plates are joined into one mesh with five material slots. Markings,
fasteners and collision-aligned walls retain their height and placement.

Inspected the full court in the browser art study; production build and diff
checks pass. Exported contact geometry remains end=21.155556, goal
half-width=1.866667 and side=11.2. Detailed wear and scratches remain absent.

### Blender-authored brushed roughness texture

Court plates now share a packed 256x256 linear roughness/metalness image created
and packed by Blender. Seeded fine brush lines and short smoother scuff strokes
vary the reflected finish while base color stays subdued. All five plate
materials reference the embedded PNG through their metallic-roughness textures.
The native arena includes the packed image; no external texture download is
needed. Arena GLB size is 3,960,812 bytes.

Confirmed the GLB contains the image and all five material references. Inspected
the floor at the player-study camera angle in the browser; production build and
diff checks pass. This is subtle surface finish variation, not a complete wear
pass with dents, chipped paint or localized contact damage.

### Taller athletic proportions

Pending visual preference feedback, the next character pass provisionally favors
more human proportions. The Blender builder lengthens the region between the
boot tops and hips by 30 percent (0.165 total model units), translating the upper
body without widening it. Mesh vertices and joint origins are remapped together.
Arm descendants, including BallGrip, translate as one assembly to preserve the
hand-to-ball offset. Ground clearance is baked again for the changed legs.

Inspected standing and running poses for both teams in the browser. All thirteen
animation tests and the production build pass. This remains a stylized character
study; it is not user acceptance of the final proportions or art direction.

### Fitted breastplates and closed fists

Blender breastplates now use a curved shell with a narrower waist and shaped
chest. Team breast markings follow the front curvature. Rounded closed-fist
meshes, thumb forms and small finger creases replace spherical hands. The hand
origin and grip offset are preserved for throwing and carrying.

Inspected the exported models in the browser and corrected a team stripe that
initially intersected the new chest contour. Thirteen animation tests pass with
the final exports; production build passed for the code in this pass. This is
an incremental anatomical refinement, not final character art acceptance.

### Rigid player surface batching

The Blender builder joins meshes sharing both a material and an immediate
parent before animation export. Hand and boot meshes stay separate for grip
and ground-clearance checks. Joint transforms and clips remain separate.

Each team GLB now has 28 primitives instead of 59, with exactly 8,032 triangles
before and after. Cyan is 353,220 bytes; red is 353,256 bytes. This reduces
potential draw submissions without simplifying geometry; no FPS improvement
has been measured. Inspected standing/running in the browser. Thirteen
animation tests, production build and diff checks pass.

### Full renderer performance sample

`tools/render-playtest.html` runs the production ArenaRenderer with an 18-player
AI match, 60 warm-up frames and 300 measured frames. It reports actual canvas
resolution, frame intervals, CPU draw time and renderer counters, and aborts
when the tab becomes hidden. CPU time excludes GPU completion; browser frame
intervals include display scheduling. This development page is not a production
route.

Local sample at 1280x504 physical pixels, DPR 1: median frame interval 32.7 ms,
p95 33.2 ms; median CPU draw time 4.0 ms, p95 5.3 ms. Draw calls median 412/max
520; triangles median 140,502/max 162,826. This does not prove a GPU bottleneck
or 60 FPS support. It also is not a before/after benchmark of player batching.

Arena inspection found 170 individually exported floor fasteners and 10 seams,
with 323 total primitives. Static floor batching is the next concrete rendering
optimization to investigate, preserving score-target nodes and geometry.

### Distinct field item silhouettes

Coins are now round gold Blender meshes marked 100, powers use blue rounded
capsules, and attribute upgrades use orange hexagonal badges. All 21 item
identifiers retain their gameplay mapping. Pickup labels rotate to face the
match camera. The builder supports --pickups-only for isolated asset iteration.

The development pickup fixture displays native two-power/four-coin/one-upgrade
slots with the production renderer. Verified readable labels in the browser
and a real featureStep collection: 100 credits awarded, coin respawn wait 1.56
seconds. Three pickup spawn tests, build and diff checks pass. Fixture item
positions are deliberately arranged for inspection; live spawn rules are
unchanged. Rewards/shop progression remains incomplete.

User requested fewer pushes, roughly hourly. These changes are being bundled
locally for the next push rather than published immediately.

### Pickup reward feedback

Pickup notifications now identify the collecting team and explicitly show
+100 CREDITS for coins or the named attribute upgrade. Pickup toasts remain
visible for 1.4 seconds. The selected player's equipment line shows the current
attribute value and its loss on a hit; without equipment it explains the three
item color categories.

Six feedback/event tests and build pass. Browser fixture collection through
featureStep produced YOUR TEAM / SPEED UPGRADE and EQUIPMENT: SPEED 250 /
LOST WHEN HIT. This verifies field equipment feedback; it does not implement
a post-match shop or persistent rewards economy. Changes remain local for the
user-requested roughly hourly push cadence.

### Coin and equipment collection sounds

Source collect_coin calls sound 0x15 at 0x1140c; collect_armour calls 0x21 at
0x11580. The browser now distinguishes these event-11 targets as named coin
and equipment cues, using newly synthesized tones. They retain court panning,
event deduplication and pickup-level voice priority; match whistles keep higher
priority. Other powerups retain their existing cue, including the separate Zap.

Eleven audio tests and build pass. The browser OfflineAudioContext check passes
all 38 cases, including the two new cues and cancellation checks. Coin peak
0.0330/RMS 0.00174; equipment peak 0.0791/RMS 0.00435; both release all voices.
This validates rendered signals and dispatch, not subjective full-match mixing.
Changes remain local for the next bundled push.

### Static floor batching and follow-up measurement

Blender now joins 170 floor fasteners into one mesh and ten floor seams into
one mesh. Arena primitives fall from 323 to 145 while triangles remain 70,812;
GLB size falls from 3,960,812 to 3,845,360 bytes. Contact alignment is unchanged.

A new visible 300-frame sample at the same 1280x504/DPR 1 reports median CPU
draw 3.3 ms and p95 4.6 ms (previous sample 4.0/5.3), median draw calls 362/max
445 (previous 412/520). Median frame interval remains 32.7 ms, p95 33.2 ms.
Triangle submissions increased slightly (median 145,038/max 168,514), consistent
with coarser culling of merged geometry. The AI matches are live samples rather
than identical frame traces, so these are observations, not an isolated FPS
gain claim. All 233 JavaScript tests and production build pass. Changes remain
local with the field-item bundle.

### Live WebTransport field-item probe

The paired-client development runner now has a Collect field items mode and
reports pickup kinds, team credits and equipped attributes. Directly chasing
remote items caused automatic player selection to change the controlled player;
the runner now acquires the ball before following its item route.

Room 9BJ48A observed power kinds 4 and 5 on both clients. In the subsequent
ball-first room UXXW6F, both clients reported credits [0,200] and coin events.
At tick 1662, 1661 paired snapshots matched exactly, with no missing shared
events. Both sessions were stopped. No equipment collection occurred in this
probe, so live equipment pickup remains unverified despite the separate local
fixture and wire-decoding tests. Wire/feedback tests and diff checks pass.
Changes remain local for the next hourly bundle.

### Online equipment confirmed, including delayed/dropped snapshots

Route diagnostics showed the prior test opponent physically obstructing the
carrier. In Collect field items mode, the non-carrier team now retreats from
an opposing carrier instead of pursuing it. This is test-runner behavior only.

Room 6BA76G reached tick 497 with item kinds 13,21,4,5 observed by both clients,
equipment 21 active and credits [0,600]. At that observation, 496 paired
snapshots matched and no shared events were missing. The session was stopped.

A second room JAZUV3 dropped five of every 25 client-2 snapshots and delayed
its remaining snapshots by 160 ms. At ticks 462/458, both clients showed credits
[400,100], equipment 21 and collected kinds 13,21,5,4. There were 363 identical
paired snapshots, zero mismatches, zero missing shared events and 94 dropped
client-2 snapshots. This session was also stopped. This confirms live field
item replication in these local probes, not WAN/reconnection reliability.

### Retained fall recovery timing integrated

The previously deferred fall-recovery work is integrated with the current
renderer. Source complete_action_fn (0x10a28) compares sustain-1 and seeks word
15; sliding_action_fn (0x10a82) still invokes contact after that completion call.
Retained slides and completed falling contacts now enter the twenty-tick tail,
rather than always running the entire thirty-five-tick fall. Ordinary unresolved
punch falls retain their full animation. A late completed contact can extend
the remaining recovery, matching the seek-back behavior.

JS and Go tests cover retained slide/punch completion. Additional JS checks cover
ordinary punch falls and late recovery extension; an exported Blender clip test
checks forward/backward seeks and resuming a previously clamped fall pose.
All 236 JS tests pass, including five 10,000-tick JS/Go parity scenarios, plus Go
tests, vet and build. The dedicated fifth scenario preserves explicit warp
coverage after the changed tackle timing alters earlier scripted match paths.
The local Go server was restarted with the changes at 12:15. These timings still
need live visual review under delayed snapshots. The original stash remains as
a backup and must not be blindly reapplied. Changes are not pushed yet.


### Live delayed fall recovery probe

Room WZ3CA8 ran two real WebTransport clients while rendering client 2. That
client received snapshots with 160 ms delay and dropped five of every 25.
At stop, client ticks were 805/800, with 640 identical paired snapshots,
zero state mismatches, zero missing shared events and 164 dropped snapshots.
The renderer recorded 26 recovery phase seeks, including one extension of
remaining recovery time. Maximum normalized clip phase error at those seeks
was 0.000000 at the displayed six-decimal precision. The diagnostic compares
the actual Blender Hit action time after mixer advancement against the expected
fall phase, rather than only checking decoded action timers.

This closes the pending local delayed-snapshot recovery timing check above.
The final screenshot confirms the court rendered, but a still image alone does
not establish animation quality. This short local probe does not establish WAN,
reconnection, injury substitution or full-match coverage. Both clients were
stopped. The test instrumentation is retained in tools/network-playtest.html;
these changes remain local under the hourly push preference.


### Damage no longer invents a loose-ball impulse

The original damage_player (0x1061a-0x1066c) updates energy, attributes and
armour, without changing ball possession or motion. Its attack callers decide
possession: powerup_zap (0x11a72-0x11a7a) clears the carrier pointer, while
standing tackles transfer possession and retained falling attacks only release.
The modern damage helper previously invented a throw impulse, then its tackle
and power-up callers restored a saved copy or replaced it through giveBall.
That intermediate mutation and those compensating copies are now removed in
both JS and Go. Each attack directly applies its possession rule; electrical
ball hits continue to preserve the flying ball and consume their hit budget.

This is a source-aligned simplification of the existing attack outcomes, not a
claim of a newly visible gameplay change. The former generic loose-ball reset
test encoded the discarded invented impulse; it is replaced with a complete
ball-state preservation check, with a matching Go test. Existing tests retain
coverage of Zap release, falling tackles and normal possession transfer.
All 236 JS tests, including five 10,000-tick JS/Go parity scenarios, pass; Go
tests, vet and the production build also pass. The local server was restarted
with this implementation. Changes remain local for the hourly push batch.


### Throw sound begins with the action

The reviewed AI high/low choices match the source branches: goal throws are low
at equality with twice THROW (0x10686-0x10694), while teammate passes are high
at equality (0xf71a-0xf72a). This is a bounded branch audit, not full AI proof.

That review exposed an audio timing difference. do_throw_common_ai plays sound
0x03 at 0x107b2-0x107b6, and handle_user_input does the same at 0x10c28-0x10c2c.
throwing_action_fn releases at animation word four without another sound call.
Previously our throw cue played only at physical release, four ticks late.
Both JS and Go now emit audio-only event 30 at beginThrow. ArenaAudio maps it to
the existing synthesized throw cue and consumes physical release event 3
silently. Event 3 remains available for release visuals and diagnostics.

A simulation test covers human and AI windup with possession still held, followed
by one release four ticks later. An audio observer test checks one onset sound
and no duplicate on release/repeated snapshots. The retained-event audio test
now uses windup event 30. The 238 JS tests passed across the full run and the
corrected retained-event test rerun; five long JS/Go parity scenarios passed.
Go tests, vet and build passed. Timbre is unchanged from the previously rendered
audio probe; subjective whole-match mix review remains pending. Local server
restarted; commit remains local for the hourly push batch.


### Throw onset replication under delayed snapshots

Room N495YU exercised two real WebTransport clients, rendering client 2 with
160 ms added snapshot delay and five of each 25 snapshots omitted. At stop,
ticks were 1163/1159 with 924 identical paired snapshots, zero state mismatches,
zero missing shared events and 234 deliberately dropped client-2 snapshots.
Both clients recorded 30 windup events, 30 physical releases and exactly 30
throw cue dispatches. Each received state was passed twice to the production
ArenaAudio observer to check deduplication; its play method was instrumented
to count dispatches rather than producing audible sound. This verifies event
routing, not audible mixing or speaker output.

The rendered delayed client recorded 17 visible release transitions, with a
maximum release-frame step of 0.607 world units and zero held-ball grip error.
Not every release must appear as a distinct rendered transition when snapshots
are omitted. This short probe does not establish WAN or reconnection behavior.
Both clients were stopped. Instrumentation remains in network-playtest.html.


### Compact Blender impact feedback

Replaced the twelve box-shaped impact rays with eight tapered planar sparks,
authored in build_impact and saved in impact.blend/impact.glb. The asset exports
as one mesh primitive. A dedicated --impact-only flag avoids rebuilding the
court and athletes. The effect keeps its center open and uses transparent,
double-sided material without depth writes.

The renderer now fades over 220 ms with squared opacity and grows from scale
0.7 to 1.35, replacing the 400 ms growth from 1 to 3. Successful tackle impacts
appear above the armor at height 1.8; other event effects retain their event
height. The first compact version was occluded by armor in browser inspection,
so the radius and contact height were adjusted. The final production-renderer
fixture at tools/impact-playtest.html shows the effect at 55 ms alongside the
athlete, selection ring and ball. It also provides a Play impact button.
The browser screenshot confirms spatial readability at that phase; it does not
establish final artistic acceptance or overall animation quality. Production
build passes. Blender source and exported asset are committed together locally.


### Time-based ball trail

The modern trail previously stored ten rendered frames, making its duration
about 333 ms at 30 FPS but only 69 ms at 144 FPS. BallTrail now samples displayed
ball travel at 60 Hz, interpolating between rendered positions. Ten points span
150 ms between newest and oldest samples at every render rate. This affects
presentation only; authoritative ball motion and original flight stages remain
unchanged. The geometry remains the existing Blender-derived trail mesh.

Tests trace the same linear movement at 30, 60 and 144 FPS and verify identical
sample positions. Additional checks cover clearing on possession, a position
jump above five world units, a frame gap above 250 ms, and zero elapsed time.
Both targeted tests and production build pass. These checks establish sampling
behavior, not a claim of constant measured browser FPS or final visual approval.


### Rendered warp and trail transition

Added tools/ball-presentation-playtest.html as a reproducible browser fixture.
It builds a trail approaching the real low-ball warp boundary, invokes the
production sideFeature handler and draws the result with ArenaRenderer. The
browser check reports Warp PASS, rendered position error 0.000000 and exactly
one fresh trail point. Thus the existing large-distance snap and the new trail
reset cooperate without interpolating a visible trail across the court.
The fixture freezes on the exit transition itself, where wall geometry can
occlude the ball; this is position/trail verification, not a complete moving
warp visibility review. High-throw presentation still needs separate review.


### Moving high throw and warp exit review

Extended the ball presentation fixture with production simulation stepping,
a full high throw, a frozen high-stage inspection and 200 ms of play after
warp exit. Players are held out of interception in this fixture to isolate
ball presentation. Projection checks count ball centers outside the camera
viewport; they do not detect occlusion by geometry.

The browser high-throw run lasted 2.52 s, reached height 3.25 and recorded zero
offscreen frames. An inspected frame at 800 ms showed a distinct elevated ball
and ground shadow. The inspection button was subsequently moved to 960 ms to
sample the actual stage-six plateau rather than the earlier rising stage.
The warp exit review at 200 ms placed the ball at (8.01,-9.64), with ten trail
points and zero offscreen frames; the screenshot showed the ball visibly back
inside the court by the left gate. This resolves the earlier exit-only fixture's
occlusion ambiguity for that sampled time, not every possible warp/camera state.


### Actual AI match audio render

Added tools/audio-match-playtest.html. It runs thirty seconds of createMatch /
step with both teams controlled by AI and feeds events to production ArenaAudio.
OfflineAudioContext suspension advances the actual audio clock between simulation
ticks, retaining the real voice lifecycle, stereo graph and compressor. Two
seconds of tail are rendered after simulation ends. A WAV player allows review.

Browser output: PASS, peak 0.3235, RMS 0.01292, maximum 16 active voices and zero
remaining voices. Observed events included 33 slides, 28 tackle contacts, 13
hits, 19 throw onsets, 16 releases, 16 catches, two bonus scores, two multiplier
changes, two pickups and one electrical event. The different onset/release
counts are possible when throws are interrupted or remain pending at the end.
This trace contained no goals, injuries or substitutions, so it does not prove
balance during those sequences. Offline rendering establishes finite unclipped
output and voice cleanup; subjective listening/mix approval remains pending.


### Goal and medical audio mix coverage

The optional goal/injury fixture in audio-match-playtest seeds a low ball beyond
the goal line at two seconds and a fatal impact at eight seconds. All subsequent
goal awards, fall completion, evacuation, replacement and restart behavior runs
through the normal simulation. The result now additionally requires event kinds
7, 14 and 15 to occur; missing coverage cannot produce PASS in this mode.

Browser result: PASS, peak 0.6528, RMS 0.01113, maximum 32 active voices, zero
remaining voices. Counts included one goal, one injury, one replacement and
three launcher/release sequences. This extends the earlier ordinary AI trace
with actual goal and medical event sequencing and unclipped rendered output at
the voice limit. It still does not prove subjective prominence or pleasantness
of the mix; the generated WAV is available in the page's audio player.


### Held-ball reference tables extracted

Added extract-held-ball-reference.py and the numeric held-ball-reference.json.
The extractor verifies all 117 signed byte pairs at 0x3ff8, all 120 signed word
origin pairs at 0x40e2, and all 24 complete standing/move/throw sequences. It
rejects missing or truncated rows instead of assuming omitted animation data.
No images or executable bytes are included in this data artifact.

step_player calls the action handler before advancing the sprite and updating
its origin (0xe87c-0xe88a). step_match then updates the carried ball position
(0xcff4-0xd03e). Thus the throwing callback releases from the preceding carried
pose before frame-four visual advancement. North-facing throw frames are
48,48,49,49,50,50,49,49; their combined offset/origin minus eight yields
(17,-10), (4,-14), (5,-13) for the three distinct sprites. These are original
coordinate displacements, not yet world-center offsets. Ball sprite zero has
an additional minus-four correction on both axes.

The extraction is groundwork for physical integration, not a completed fix.
Remaining work includes reconciling coordinate anchors, held-ball sprite state,
running phase, and complete jump/catch/keeper animation selection. Existing
Blender hand attachment and fixed physical placement are unchanged in this
commit. The extractor completed successfully with the asserted counts.


### Held-ball coordinate conversion

The supplied Entity.Draw centers the image on terrainXY plus originXY; it does
not treat terrainXY as a raw image top-left. The Amiga distance_to_point at
0xdaca-0xdad2 uses terrain X and terrain Y plus vertical origin, independently
of bitmap width. Do not introduce an additional generic half-player-width
correction into the held-ball offset formula.

Added heldBallOffset as a tested conversion primitive using the extracted
numeric tables. It requires explicit sprite indices and converts source X to
world Z and source Y to negative world X. Sprite zero receives the documented
extra four-unit subtraction. For player sprite 0 / held-ball sprite 0 the
terrain displacement is (13,6); for north throw sprite 49 it is (0,-18).
The targeted conversion test passes, including signed values and invalid index
rejection. This helper is not yet wired into either simulation; animation-index
selection and full held-ball/catch state remain required before integration.

Inspection of the local Ghidra packed database did not recover complete raw
animation arrays through simple ZIP expansion. The expanded database remains
ignored research material. No missing array tails were guessed from truncated
assembly rows, and no original executable data is shipped.


### Complete animation data recovered from Ghidra

A portable Ghidra 12.1.3 runtime with a private JDK 21 successfully imported the
provided GZF database without reanalysis. JDK 25 failed in the script framework;
JDK 21 worked after placing the temporary project outside a dot-prefixed path.
The original system Java installation was not changed. Tools and raw research
exports remain outside version control.

ExportBallTables.java reads the exact memory region 0x3ff8-0x791f. The Python
extractor now checks every previously extracted offset/origin and all 24 basic
sequences against that memory before recovering 97 complete animation table
blocks. It requires the memory export on regeneration, so missing raw data
cannot silently replace the complete artifact with truncated text data.

The held-ball table has 26 zero frames followed by -2. The north jump contains
72,72, eighteen-stage sequence ending in 48,48 and then -3 (the artifact holds
the exact twenty frames). North standing catch is 48,48,48 then -3. The
ball-being-caught block contains an internal -2 before another sub-sequence:
negative words must be interpreted as animation control, not sprite indices.
This is why integration requires the opcode/phase semantics as well as data.
The existing offset conversion test still passes with the memory-verified data.
Simulation placement remains unchanged until that integration is completed.


### Reference animation stepping and held-catch synchronization

Added stepReferenceAnimation to represent the exact current-word/next-word
ordering in step_sprite_animations. It returns a sprite and the next cursor or
control transition for all five negative opcodes. It rejects cursors pointing
at opcodes, including the internal -2 in the caught-ball table, instead of
clamping through them as if they were sprite frames.

Tests cover the eight-word running loop, standing loop, throw release before
frame-four advancement, action completion, caught-ball phase inheritance and
landing seek, hold, hide and fall completion. get_ball at 0xecda copies the
player animation cursor to the ball. jumping_action_fn at 0x109e6 and 0x10a08
seeks the player and held ball to index 18 on landing. A mid-jump catch therefore
does not restart its ball animation from zero. The four stepping tests plus the
existing offset test pass. These primitives remain separate from production
simulation until the player cursor/callback lifecycle is integrated in JS/Go.


### Physical pose integration and first fall terminator correction

Both simulations now use generated original direction groups and combined
sprite offsets for held-ball X/Z instead of a fixed 0.5-unit facing offset.
Running retains an eight-word phase across direction changes; action poses use
their action timer and source tail seeks. Initial duration is retained if speed
changes mid-action. Keeper groups come from the original pointer tables.
Airborne catches use the held-ball sprite size for their jump phase and return
to sprite zero on landing. Blender BallGrip remains the visual attachment;
release preserves the preceding physical position before flight advances.

The full anim_tackled block has an internal -5 at word 26 followed by another
sequence. Ordinary falls now last 26/25 seconds, completed attack tails use
(26-15)/25, and collision-held recovery uses (26-18)/25. This supersedes earlier
35-frame assertions and delayed-recovery metrics using them. Blender playback
uses the corrected duration; the network diagnostic imports that duration.

Tests check standing offsets, pre-release position, jump landing, mid-action
speed changes, identical JS/Go data and reaching the first terminator after
26 frames. Existing collision/medical/animation expectations were corrected.
Six 10,000-tick JS/Go scenarios pass; the sixth explicitly seeds a fatal fall
because changed trajectories removed natural medical coverage from an older
scenario. Goal and warp coverage remain required. Full JS run plus corrected
targeted reruns, Go tests, vet and build pass. This integrates physical placement,
not complete original interpreter parity: origin-aware distance calculations
and exceptional callback ordering remain open. build-physical-pose-data.py
regenerates both data files and excludes control words from sprite sequences.

Final integration verification: all 249 JavaScript tests, Go tests, Go vet and
production build pass. A fresh paired WebTransport run (room ZTVVP6) stopped
at ticks 559/550 with client 2 delayed by 160 ms and 114 dropped snapshots.
All 440 shared snapshots matched, with no missing shared events. Four throws
were rendered, maximum release-frame displacement was 0.673 world units,
and held-grip and recovery-phase errors were zero across six recovery seeks.
Client 1 had five windups/cue dispatches, client 2 four at its older stop tick;
this final unequal tick is not a same-tick event mismatch. Coin 13 collection
and 100 credits replicated. This short run did not exercise medical phases.

### Pose-aware ball and opponent distances — 9 September

The source distance_to_point at 0xdaca-0xdad2 adds only the querying player's
vertical sprite origin. calculate_player_distances at 0xda20-0xda4c adds both
origins of team one's target before querying team two and stores that single
result for both players. The horizontal asymmetry is preserved, rather than
replaced with two fully centered points. Sprite origins are assigned by
set_player_sprite_offset at 0x10dfe from the displayed physical sprite.

Generated runtime data now includes the 117 relevant origins. JS and Go use
them for controlled-player selection, cached ball distances, direct catches
and opposing-player contact distances. These caches use the preceding pose,
before the next thinking/animation pass. Standing sprites keep zero origins;
airborne sprite 73 contributes -12 source Y pixels and fallen sprite 94 +4.

Tests establish the 28/29-pixel ground-position boundary for a jumping catch
(the adjusted distances are 16/17), fallen and horizontal-only origins, and
the team-one target convention in both query directions. The existing 249 JS
tests including six 10,000-tick parity scenarios passed after integration;
three additional JS tests and matching Go cases passed, as did Go vet and
production build. This does not yet port every distance_to_point call site:
collectibles, bumpers and some direct AI point calculations still require
individual audits. Full original animation cursor/callback parity and source
fixed-point coordinate quantization also remain unproven.

### Remaining point-distance call sites and selected-teammate avoidance

Audit of distance_to_point callers: distance_to_collectable (0x115c2) keeps
the item in A5 and the selected player in A3. step_bumper (0xe3d8) keeps the
bumper in A5 and the ball in A6. Applying player pose origins in these callers
would be incorrect. They use object ground positions. The active-player item
comparison at 0xee98 swaps the ball into A5, not the pursuing player.

The local-interaction tail at 0xffd4-0x1001e was missing. After exhausting
opponents, supporting players now avoid their own selected teammate if that
teammate is not fallen, both adjusted axes are within 30 pixels and the
approximate distance is at most 32. The target includes both sprite origins;
the querying player includes only its vertical origin. Avoidance direction
still uses raw terrain positions, as avoid_enemy_player at 0x1020e does.
Coincident players retain the team's forward direction. Opponents retain
priority over this teammate fallback.

Goal throws at 0x1067a now use pose-aware distance for the high/low decision;
equality with twice the throw attribute stays low. Tests cover the 200-pixel
threshold crossed by a one-pixel vertical origin, teammate axis/radial bounds,
target horizontal origin, and exclusion of fallen teammates. The 252 existing
JS tests including six long parity traces passed after the behavior changes;
two additional JS tests and corresponding Go cases passed, along with Go vet
and build. Source fixed-point rounding, full callback ordering and whole-match
AI equivalence remain open. This audit does not establish complete fidelity.

### Integrated runtime check after pose distances and teammate avoidance

The local Go server was restarted from 5da4dd0. Room 7TB7P4 used paired native
WebTransport clients with 160 ms added client-two delay and five dropped
snapshots in each 25. It stopped at ticks 798/794: 634 shared snapshots matched,
zero shared events were missing and 159 snapshots were dropped. Both clients
observed 12 releases, 12 windups and 12 throw cue dispatches. The rendered
client measured nine releases with maximum frame displacement 0.820 world
units, zero held-grip error and zero recovery phase error across seven seeks.
Coin 13 and 100 credits replicated. This run did not exercise medical phases.

The full-match render tool measured 300 frames after warmup at 1280x504/DPR1:
frame interval median 32.7 ms, p95 33.2; CPU draw median 2.7 ms, p95 4.1;
draw calls median 353, maximum 423; triangles median 144898, maximum 164598.
These timings exclude GPU completion and do not establish a 60 FPS capability.
The tool now includes an idle requestAnimationFrame measurement that does no
simulation or drawing, to separate scheduling evidence from game work.
Idle scheduling measured 120 callbacks: median 31.2 ms, p95 31.6 ms with no
simulation/draw work in the test callback. The similar idle and full-match
intervals suggest scheduling contributes substantially in this environment;
this is an inference, not proof of a browser cap or a GPU performance claim.
A high-refresh external runtime remains necessary to verify the 60+ FPS goal.

### Physical poses during formation restarts

The physical pose integration originally ran only in live simulateStep. The
restart path returns before that pass, leaving a pre-goal or pre-medical
sprite origin in place throughout formation. This could affect the first
resumed ball-distance cache even after the player had visibly stood up.

JS/Go restartStep now advances poses for healthy formation players, including
remaining action/reaction waits and movement to the launch position. Once a
player reaches formation, its actual standing direction/group replaces the
previous pose. The medical patient remains handled by the medical sequence.
This follows the original separation of formation control and sprite stepping;
it does not establish equivalence of every restart callback or action timer.

Regression tests seed an airborne physical sprite, verify a running sprite on
the way back and zero stale vertical origin once the launcher starts. Restart
tests, six 10,000-tick JS/Go parity scenarios, the Go suite, Go vet and the
production build pass. Live server must be restarted to serve this latest
change; the preceding network check covered 5da4dd0, not this revision.

### Steering uses the physical run phase

player_moving_action_fn at 0x102fe tests the original sprite cursor for zero
before recalculating a distant direction. advanceSteering previously counted
its own calls independently of action animations. Runtime JS/Go players now
use the retained physical pose cursor once a physical pose has been advanced;
the standalone helper retains a fallback counter before pose initialization.
Near-target corrections and explicitly changed targets keep their existing
behavior. This is not a claim that every branch of original steering is ported.

A regression deliberately disagrees the old counter with the physical cursor:
it verifies retaining direction at physical phase three and correcting at
phase zero. All 256 JS tests, including six 10,000-tick parity scenarios,
Go tests, vet and production build pass. This also covers the prior formation
pose update in the complete JS suite. No additional push was made this cycle.

### Near-target steering uses the query origin

player_moving_action_fn 0x102ea-0x102f2 calls distance_check with a 32-pixel
axis limit. distance_check at 0x10044-0x1004a subtracts both terrain Y and
vertical sprite origin. The previous steering implementation applied this
near-target box only to ground coordinates. JS/Go now include the vertical
origin for that decision and for deciding whether the distant phase gate can
be bypassed. Direction selection and the below-four-pixel arrival snap retain
raw terrain coordinates, as the separate direction routines do.

The boundary regression uses sprite 73's -12 vertical origin: a target at
44/20 terrain pixels is in the corrected box, while 45/20 is outside. Standing
at the same ground position remains outside. Steering tests, six 10,000-tick
parity scenarios, Go tests/vet and production build pass. No claim of complete
AI or visual movement equivalence follows from these focused cases.

### Physical cursor completion controls

The runtime pose generator now retains the first negative control word for
each direction sequence, including internal terminators. Physical pose
advancement applies the original cursor result at the last sprite: -1/-4
reset to zero, -2/-5 hold the last index, and -3 retains the incremented index.
Previously falling sprite 25 left cursor 26, contrary to the decrement at
0x10d50. This mattered after steering began consuming the physical cursor.

The regression verifies the fall ending at cursor 25 and subsequent running
selecting phase one through the original modulo-eight phase retention. All
258 JS tests, six long parity scenarios, Go tests/vet and build pass. Action
completion side effects still use the existing simulation callbacks; this
change implements cursor controls, not an entire original opcode interpreter.

### Blender gait: reduce horizontal stance slip

The previous floor test checked sole height, not horizontal foot stability.
A new geometry-based tool, tools/analyze-gait.mjs, samples both exported boots
240 times per run cycle, adds the renderer's 1.2-unit root stride and measures
horizontal boot-origin speed while consecutive sole heights are <=0.04.
Before this change, median slip was 4.664, p95 10.716, maximum 13.082 world
units/second; root speed was 2.88. Both team assets gave the same result.

The Blender authoring script now solves hip/knee angles from a stance/swing
foot path using the actual 0.481/0.334 leg segments. Stance travels backward
linearly; swing returns forward with lift. Ankles counter the combined leg
and body pitch. A small body-height/pitch variation preserves the stance
transform in glTF export; constant-only root tracks had been omitted. The
native blend files and both exported GLBs were regenerated in Blender 5.2.

Afterward, median slip is 0.121, p95 3.275, maximum 3.498 across 268 grounded
intervals; lowest sole 0.00881. Lift/touchdown transitions still contribute
slip, and this is a straight-cycle measurement without live turning/blending.
All 258 tests and the build pass, including both-team loop closure, floor
clearance, ankle leveling and all unchanged action/ball-grip checks. An active
browser full-match screenshot shows the exported run poses on the court.
A 300-frame sample remained 32.6 ms median interval; no FPS gain is claimed.

### Blender gait touchdown and cycle timing refinement

The swing path now uses a Hermite return whose horizontal velocity matches
the planted path at either boundary. Each Run NLA strip explicitly spans
frames 0..24, removing the extra exported frame: GLB duration is now 0.4 s,
matching the 1.2-unit cycle at 3 world units/second. Both native blend files
and GLBs were rebuilt. Gameplay simulation and physical sprite timing are
independent of this visual cycle and remain unchanged.

The same geometry sampler reports 258 grounded intervals per team: median
slip 0.00405, p95 1.22016, maximum 1.39163 world units/second. Minimum sole
height is 0.00880; maximum swing sole height is 0.23000. Compared with the
preceding version, median and transition slip both decrease. The <=0.04 sole
criterion includes low swing portions; these measurements are not a guarantee
of planted feet during turns, collisions or visual blending. All 14 exported
animation tests and production build pass. The active browser renderer was
inspected with the rebuilt assets. Full gameplay equivalence remains open.

### Modern match volume control

The pause menu now includes a keyboard-accessible 0–100% sound-volume slider.
Default level remains the previous master gain of 65%. The chosen level is
retained through pause, mute/unmute and local match resets in the current
page. Moving the slider does not enable sound or unlock autoplay; the existing
sound button remains the user gesture for that. Gain changes use a 15 ms
AudioParam target transition. Zero stops current voices and prevents silent
new sources from being scheduled while events continue to be consumed.

The audio suite (13 tests) verifies level selection before context creation,
zero-volume voice cleanup, muted-level retention and value bounds. The
production build passes. Browser checks used Home/ArrowRight to reach 1%,
End to reach 100%, and reopening the pause menu after Resume retained 100%.
The fullscreen menu and slider were visually inspected. This verifies controls
and routing; subjective sound balance remains an open requirement.

### Offline volume lifecycle verification

The real-browser OfflineAudioContext tool now includes volume-zero and
volume-resume cases alongside every cue and the stress/pause/mute/reset
cases. It starts a fulltime cue, sets volume zero at 0.1 s and attempts another
cue while silent. The resume case restores level at 0.4 s without emitting a
cue, then emits a coin at 0.7 s. It requires exact measured silence from
0.2 through 0.68 s and nonzero energy after the new cue.

All 40 cases passed in the browser. Volume-zero measured tail RMS zero and
zero remaining voices. Volume-resume measured silent-window RMS zero, zero
remaining voices, and a nonzero new-cue segment (overall peak 0.1188). Stress
peak was 0.2274; all samples were finite and below clipping. The diagnostic
renders playable WAVs for perceptual review; signal tests do not replace that
review or prove a final sound mix suitable for every output device.

### Match-menu keyboard focus

Escape is now handled before the editable-control guard while in a match.
The new volume range input had otherwise swallowed the menu shortcut. Opening
the menu focuses Resume; closing it blurs the menu control so hidden input
focus cannot block subsequent movement keys. Existing held-input clearing
continues to run on both transitions.

Browser verification focused the volume slider, changed it with Home and
pressed Escape: the menu closed. Reopening showed Resume focused and the
selected zero volume retained. All four existing keyboard/input-reset tests
and the production build pass. This change affects menu controls only.

### Integrated physical-phase and rebuilt-gait verification

The Go server was restarted from current gameplay code at 13:37. Room 9DPKZC
ran with 160 ms delay and five dropped snapshots per 25 on client two. At stop,
ticks were 1537/1533: 1223 shared snapshots matched, no shared events were
missing, and 309 snapshots were dropped. Both clients saw 18 releases and
19 windups/cue dispatches; the final windup had not yet released. Power-ups
4/5 replicated. Minimum player energy reached 72; medical phases were absent.
The displayed client measured 15 releases, maximum frame step 1.083 world
units, zero grip error and zero recovery phase error over 14 seeks. Rebuilt
Blender running/falling/carrying poses were inspected in the active renderer.

The six-scenario simulation trace now also compares physical pose validity,
displayed sprite, frame index, retained cursor, pose kind, previous remaining
time, captured duration and current action time for every player. All six
10,000-tick scenarios pass this expanded comparison. Previously they compared
resulting physical positions/statistics but not those internal pose fields.
This strengthens JS/Go parity evidence, not proof of full Amiga parity.


## Interception identity across halves (2026-09-09)

Audited `get_ball` 0xeca2–0xecd4 together with halftime at 0xd5e6
and `change_ends` 0x13860–0x138b4. The interception branch reads
`initial_playing_direction` and the stable team flag at sprite offset 0x22,
bit 3. Halftime swaps playing-direction fields at 0x46 and the formation
constraints; it does not swap that team flag or initial direction. Therefore
the interception cue must remain associated with the same team in both halves.
The branch comments about playing up/down alone are insufficient grounds for
changing the cue to follow the current attacking direction. No runtime behavior
change was needed.

Extended JS and Go catch regressions to both halves, teams, friendly/opponent
last possession, and charged/unmarked balls. The JS integration now passes
actual catch events into ArenaAudio and repeats the snapshot: the normal
interception signal and planar catch contact each dispatch once, while friendly
and charged catches omit the interception signal. All 18 targeted JS catch/audio
tests and the targeted Go catch tests pass. This verifies event dispatch, not
subjective sound quality or full original-game equivalence.


## Per-player physical pose ordering (2026-09-09)

`step_sprites` at 0xe7d8 processes the second team then the first for each
roster entry. Within `step_player`, control and the action callback precede
collision handling (0xe882), sprite animation (0xe886) and origin update
(0xe88a). The remake previously advanced every physical pose together after
all player actions. A later player's counter-tackle could therefore replace
the earlier player's already-processed pose within the same tick.

JS and Go now advance poses at the end of each player's action/collision
processing, including stunned and frozen paths. Global movement still follows
all player thinking, and cached contact distances remain from the start of
the pass. Counter-tackle regressions verify that earlier damage reaches the
later victim's pose immediately, while later damage reaches the earlier
victim's pose on the following tick. This is a source-order correction, not
a complete animation interpreter: timer-driven action completion and the
initial cursor of a fall inflicted after its victim's turn still need a
complete callback/terminator reconciliation.

All 259 JS tests pass, including six 10,000-tick JS/Go comparisons with internal
physical pose fields. Go tests/vet and the production build pass. No claim of
complete original-game equivalence follows from client/server agreement.


## Fall cursor zero and -5 completion (2026-09-09)

Follow-up to per-player pose ordering: newly inflicted falls now keep a pending
first-pose marker. Their stun/action clock cannot consume frame zero before
the victim's animation pass. This covers damage after the victim has already
been processed, as well as damage applied between simulation ticks. The marker
is included in the long JS/Go parity trace.

The first -5 terminator of anim_tackled is processed in the pose pass. It stops
movement and clears retained attack state; a healthy player leaves the fall
action and resets the lying-down cursor at 0x10d84. Fatal completion calls
start_injury from that same pass, rather than waiting for a later global timer.
Formation processing now also advances the physical poses of fatal falls.
The raw pose helper still reports the terminator cursor; the player-level
wrapper performs the source's gameplay transitions.

New JS and Go fixtures check every frame 0–25 for healthy/fatal falls during
active play and restart formation. Counter-tackle tests require a later-hit
victim to start at zero on its next turn. The old healthy final-frame assertion
was corrected: -5 clears the fall action while the last sprite is displayed.
All 263 JS tests passed; after adding the healthy cursor reset, targeted fall
and six 10,000-tick parity scenarios passed again, as did all Go tests. Build
and vet passed before that final cursor-only correction. This supersedes the
previous entry's open fall-first-frame issue. Throw/jump/catch opcode completion
and the full original callback interpreter remain separate unresolved work.


## Blender knockout and stretcher transition (2026-09-09)

Browser review exposed a presentation mismatch: fatal players ran the ordinary
Hit clip, which gets back up, while the renderer also rotated the whole model
by 90 degrees. Added a native Blender Knockout clip to both athletes. It falls
once, remains prone and centers the body for carrying. The renderer selects
that clip for zero-energy players, removes the extra rotation/offset, and holds
the final pose once the medical sequence begins. A medical timer no longer
seeks backward within the fall. Mesh topology is unchanged.

The new `tools/medical-presentation-playtest.html` runs the production simulation
and renderer with visible fatal-fall, stretcher and continuous-sequence controls.
Browser screenshots reviewed the prone player at tick 14 and stretcher carry
at tick 149 (phase 2); both showed zero extra body rotation. The exported-asset
regression verifies that both teams stay prone and keep their center through
clip completion. All 15 player-animation tests and the production build pass.

A separate real WebTransport run, room MFGB27, used 160 ms client-two delay
and dropped five of each 25 received snapshots. At ticks 423/419 it had 334
paired snapshots, no state mismatches, no missing shared events and 84 dropped
snapshots. Three releases/windups/cue dispatches matched. Four recovery seeks
had zero normalized phase error; held-grip error was zero. Minimum energy was
93, so this network sample did not exercise fatal injury or medical transport.
The medical presentation evidence above is local simulation, not network proof.
