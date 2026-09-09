# Gameplay comparison — 2026-09-09

Scope: first audit of the playable match, concentrating on player control and
possession. This is a source comparison, not a recording-to-recording or emulator
comparison. No gameplay rules were changed during this audit.

Baseline: commit 8763790. Primary source: the locally available disassembly from
https://github.com/simon-frankau/speedball2-re-amiga. Secondary source: the user's
Speedball 2 - WIP 02 archive, extracted under .reference/wip. The secondary remake
is supporting evidence, not authority when it disagrees with the original.

## Confirmed differences

| Priority | Situation | Original branch | Current implementation | Expected practical effect |
| --- | --- | --- | --- | --- |
| 1 | An opponent carries the ball | Cached distances target the carrier's terrain position | Selection and the shared AI distance array target the offset held ball | Near a selection boundary, a different defender receives input; animation-dependent ball placement can change the choice |
| 2 | The nearest player is knocked down | Nearest-player scan does not exclude fallen players | selectPlayers skips every player with stun > 0 | Immediate handover to a teammate makes recovery and defending feel different |
| 3 | The selected player leaves the original visible play area | Human control falls back to active-player AI | Human control depends on team and selected index, without the original screen gate | Players can remain manually controlled in situations where the original takes over |

### Possession target

Amiga update_players_location_info at 0xd95e..0xd990 chooses sprite_ball, then
replaces it with player_with_ball when there is an owner. It reads the chosen
sprite's terrain coordinates before calculating every player distance.
update_active_players at 0xd9aa..0xda00 then selects from those cached distances.
The WIP Match.UpdateDistanceBallToPlayers and SetPlayersHavingInput corroborate
this choice; Entity.UpdateDistanceBallToPlayers explicitly accepts ball or owner.

Current src/game.js selectPlayers and the catchDistances construction inside step
use b.x/b.z even when owned. server/game.go repeats the same choice. This also
feeds AI decisions; its whole-match impact needs a dedicated follow-up, beyond
the reduced selection probe. The source applies the querying player's vertical
sprite origin, already accounted for by playerPointDistance.

### Fallen-player selection

Amiga select_active_player at 0xd9ea..0xda00 compares all nine cached distances,
using a later roster entry on equality. There is no fallen/busy filter in this
scan or its distance calculation. WIP GetPlayerNearestToBall does the same.
Our scan explicitly excludes stun > 0. This is a behavioral difference, not
proof that the modern behavior is undesirable; matching the original requires
making this choice deliberately.

### Off-screen control

Amiga control_player at 0xea24..0xea88 checks check_player_onscreen before handing
a selected player to user_controlled_player. Otherwise it executes the selected
player AI subject to its reaction timer. The check at 0xea92..0xeac6 uses the
original viewport with a 16-unit inset (horizontal 16..304, vertical 16..168).
Current step chooses human from humans[t] and s.controlled[t] alone.

Do not blindly apply a 320-by-184 camera rule to the wider modern rendering.
Compare both control behaviors with the existing camera before selecting the
intended modern adaptation.

## Reproduction

Run `node tools/compare-player-selection.mjs`.
The script implements only the documented selection branch alongside the actual
current selectPlayers function. It uses the existing physical-distance helper;
it is not an independent proof of that helper or a full Amiga interpreter.

Observed output (zero-based player indices):

- Carried ball: source branch selects defender 15; current code selects 16.
  The actual standing pose places the ball at x=-0.233333, z=0.505556 relative
  to the carrier. The defenders occupy carrier and held-ball coordinates.
- Fallen nearest player: source branch selects 7; current code selects 8.
  Player 7 is at the loose ball with 0.5 seconds of stun; player 8 is two world
  units away. Other players are farther away.

These deliberately small fixtures establish that the rules differ. They do not
measure how often the difference occurs in normal play.

## Core mechanics reviewed in this pass

- Human action dispatch: Amiga handle_user_input 0x10bc4..0x10cdc chooses throw
  with possession; otherwise jump near a high loose ball, slide while moving,
  and punch while stationary. Current Space behavior follows this structure.
  Shift forcing an attack and E forcing a lob are modern keyboard extensions.
- Jump range: the source compares distance to six times sustain and requires
  ball stage above 2, no owner and no multiplier traversal. canJumpAtBall matches
  these branch conditions when given the correct distance.
- Throw release: WIP sub_F078 corroborates release at opcode index 4, held fire
  choosing the high-flight animation, and perpendicular steering only when a
  velocity component is zero. Current release and steerRelease implement those
  rules. This does not prove complete throw trajectory or tick-order parity.
- Equal-distance selection: both scans favor the later roster entry; this part
  agrees. Existing JS/Go parity tests do not invalidate the differences above,
  because both implementations can share the same difference from the source.

## Next comparison work, in order

1. Carry-target selection and AI distances across both teams, both halves and
   representative poses. Decide and verify fallen-player selection in actual play.
2. Fire-button lifecycle: original cooked input consumption and actions requested
   during a busy animation versus current edge/counter handling. Reading the
   dispatch routine alone is insufficient to call this equivalent or defective.
3. Record matched low throws, held lobs, bank shots and tackle/recovery sequences
   with equal attributes and positions; compare frame-by-frame timing and outcomes.
4. Expand to keeper behavior, passing decisions and interacting scoring hardware.

Graphics, networking architecture and progression systems are outside this pass.

## Resolution

The three differences above are now corrected in JS and Go. Selection and cached
AI distances use the carrier terrain position while held, then switch to the
loose ball. Fallen players remain eligible; later-slot ties are preserved.
Human control now uses the original logical viewport with its inclusive 16-unit
inset. This intentionally means AI can take over while a player is still visible
in the wider modern camera. In-progress throws still sample their release input.
The in-game instructions explain this behavior.

The reproduction script now reports matching source/current selections (15/15
and 7/7). Regression tests cover both teams, both halves, four carrier facings,
possession transitions, fallen selection, ties, the viewport boundary and
in-progress throws. Older reaction/audio fixtures now explicitly place irrelevant
players farther away instead of assuming stun excludes them from selection.

## Follow-up: held fire through busy animations

The original reads cooked fire in handle_user_input (0x10bf4), while
user_controlled_player (0xee0a..0xee1c) skips dispatch when busy without consuming
that state. Throw release consumes it at 0x1081a / the team-two equivalent;
stationary punches consume it at 0x10cb8..0x10ccc, slides at 0x10a48..0x10a5c,
and jumps on entering their landing tail at 0x109ec. Consequently a new press
held through a catch can start a throw as soon as catching finishes. The old
JS/Go edge-only handling discarded that press.

Both simulations now retain held fire until release or action consumption.
Short counter-based browser taps still work; releasing during a busy catch
cancels the pending request. Completed punches cannot repeat from a held button.
A fresh press after release works again. Jump consumption is symmetric between
teams: the disassembly notes an unreachable team-two branch that would instead
clear team one's input; this remake does not reproduce that cross-team bug.
Modern dedicated tackle/lob buttons keep their existing edge behavior.

Regression fixtures exercise both teams, count distinct retained event IDs,
and verify one throw, cancellation, no repeated punches, and re-pressing.
The cross-language match trace also compares the retained input state itself.
These tests establish the listed cases, not exhaustive controller interrupt
emulation or final perceptual equivalence.

### Release-time input ordering

Throw height now reads retained cooked fire before consuming it, matching
0x10814..0x10876. Previously it still read the physical held button, bypassing
consumption by an earlier teammate's slide completion in the same roster pass.
A regression first reproduced high flight where the source branch requires low
flight, then passed after the JS/Go correction. Both teams are covered; forced
high throws (the modern E action) remain high. All 270 JS tests, including six
10,000-tick cross-language scenarios, Go tests, vet and the production build pass.

### Tackle visibility and deferred contact

Amiga hitting_action_fn (0x10436) rejects an offscreen attacker; do_tackle
(0x10482) rejects an offscreen target before consuming the attack or rolling
success. JS/Go now capture the full logical viewport membership at the start of
the player pass and use those flags for contact. This is the full 320-by-184
window, not the 16-unit inset used to hand over human controls. The modern
rendering remains wider, so this rule concerns the original active play area.
A missed visibility gate leaves the tackle unresolved: it can hit on a later
frame if both players enter the area before the animation finishes. Regressions
cover either participant outside, no damage/no steal on that frame, and contact
after the logical camera admits both players. All 270 JS tests, six long parity
scenarios, Go tests, vet and build pass.

### Tackle possession transfer

Amiga do_tackle at 0x10566..0x10572 changes owner and held animation/cursor;
it does not reconstruct the ball, clear electric state, change the last thrower,
or immediately replace the selected player. Both implementations previously used
the power-up giveBall helper, which reset all those fields and ball coordinates.
Tackle transfer now preserves the existing ball state until normal held-ball
placement later in the step. A retained counter-tackle can therefore drop the
ball at its original position before that placement runs. Regression fixtures
cover this two-contact ordering and retention of charge, hit budget and last
thrower. All 271 JS tests, long parity scenarios, Go tests, vet and build pass.

Follow-up required: the older documented claim that throwing always clears the
charged flag is not substantiated by throwing_action_fn 0x107be..0x108de or WIP
sub_F078. Entity.UpdateBallVelocity clears it for a stationary loose ball.
Audit the complete flight/held update ordering before changing that lifecycle.

### Corrected electric-ball lifecycle

The previous 'throws reset charge' claim is superseded. Amiga throwing_action_fn
0x107be..0x108de and WIP Player.sub_F078 retain the charged flag while assigning
a fresh hit allowance from the thrower's multiplier. JS/Go now retain that flag
and activate the new allowance when charged. A regression carries a depleted
charged ball through a friendly catch, rethrow and another successful zap.
The electro-bounce test now expects the refreshed throw allowance, while repeat
wall contacts still cannot replenish it themselves.

step_slow_ball 0xd89a..0xd8c4 clears the charged flag when a loose ball is already
stationary at the start of the pass, with held-ball and multiplier-path guards.
Both simulations now apply this rule. The allowance is preserved independently
of the flag. Holding a stationary ball does not clear it. Verification: 272 JS
tests pass, including long JS/Go parity, plus Go tests, vet and production build.
