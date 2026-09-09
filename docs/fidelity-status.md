# Current fidelity status

This is a current-state index, not a completion certificate. The chronological
original-comparison.md contains superseded findings; use later corrections
and the actual source when assessing a rule. The requested complete original
feel, modern graphics and audio remain an active objective.

| Requirement | Current implementation and evidence | Still open |
| --- | --- | --- |
| Original match cadence with independent rendering | JS and Go use 25 Hz; six 10,000-tick parity scenarios compare the implementations | Matching each other does not establish complete Amiga parity |
| Throws, lobs, wall rebounds and ball-follow camera | Flight tables, source release timing and height-dependent walls; browser high-throw and warp fixtures | Source pose offsets are integrated; full original per-tick animation/coordinate parity remains unproven |
| Tackles, punches, jumps and recovery | Source thresholds, damage, retained falling callbacks; delayed real WebTransport recovery probe | Complete original animation opcode/physical-pose equivalence and subjective controls review |
| Scoring hardware, power-ups, coins and equipment | Source-derived rules, seven field slots, Blender item models; replicated collection probe | Complete original-match parity across interacting hardware/effects; persistent spending/progression absent |
| Injuries and substitutions | Fatal-fall medical sequence, rotating bench, clock stoppage; tests and browser/network probes | Full original parity across every interruption and medical transition |
| AI movement, passing and goalkeeping | Dedicated source-derived modules and branch tests | Exhaustive original AI comparison across whole matches |
| Browser multiplayer using WebTransport | Go authority, binary snapshots, retained events; paired local loss/delay probes | Reconnect and WAN validation; no lag compensation or client prediction |
| Recognizable modern Blender graphics | Authored court, athletes, ball, items, medics and compact impacts; higher camera | Final artistic acceptance, further material/animation refinement |
| Audio | Synthesized action/item/match cues, source windup timing, priority/voice limits; actual match and goal/medical offline mixes | Subjective audible mix review; current evidence measures signals and routing |
| Higher FPS and resolution | Independent renderer, bounded turns, time-sampled ball trail, batched meshes | Current full-match interval 32.7 ms median; idle scheduling 31.2 ms. Test environment scheduling contributes; 60+ FPS target not proven |
| Complete original feature scope | Exhibition match systems are present | Career/league, transfers and persistent team progression are absent; do not silently declare full-original completion without resolving these |

## Next source-level work

Reconcile held-ball physical placement with step_match at 0xcff4-0xd03e.
It copies carrier position and velocity, then applies the signed two-byte
player_ball_offsets entry indexed by the player's displayed sprite, adjusted
by sprite origins and held-ball sprite size. Current game.js/server game.go
now copy velocity and apply source-derived pose offsets. The displayed Blender
ball follows BallGrip, so visual attachment alone does not prove physical
collision/release placement. The complete 117 signed ball offsets, 120 sprite origins and 97 complete animation table blocks are now reproducibly extracted by
`tools/extract-held-ball-reference.py` into `held-ball-reference.json`.
The complete memory-backed extraction uses `tools/ExportBallTables.java`.
Physical placement is integrated in JS/Go using generated direction groups,
a retained run cursor, action timers and jump/catch state. A complete source
interpreter remains open. Per-player pose ordering and the fall -5 gameplay
terminator are now integrated; fresh falls preserve frame zero even when
damage arrives after the victim has been processed. Pose-aware ball and opposing-player distances are integrated; collectible and bumper callers were audited as object-based. Goal-throw distance and selected-teammate avoidance are now integrated. Full source fixed-point coordinate behavior remains open.

## Verification limits

A green unit suite is supporting evidence for its cases, not a percent-complete
measure. A local paired-client match does not prove WAN recovery. A screenshot
proves a rendered moment, not motion quality. Unclipped offline audio does not
prove perceptual balance. All these remaining requirements keep the overall
goal open.
