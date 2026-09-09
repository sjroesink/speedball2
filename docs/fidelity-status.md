# Current fidelity status

This is a current-state index, not a completion certificate. The chronological
original-comparison.md contains superseded findings; use later corrections
and the actual source when assessing a rule. The requested complete original
feel, modern graphics and audio remain an active objective.

| Requirement | Current implementation and evidence | Still open |
| --- | --- | --- |
| Original match cadence with independent rendering | JS and Go use 25 Hz; five 10,000-tick parity scenarios compare the implementations | Matching each other does not establish complete Amiga parity |
| Throws, lobs, wall rebounds and ball-follow camera | Flight tables, source release timing and height-dependent walls; browser high-throw and warp fixtures | Physical held-ball offsets remain fixed at 0.5 units along facing; original 0xd000 uses sprite-specific offsets |
| Tackles, punches, jumps and recovery | Source thresholds, damage, retained falling callbacks; delayed real WebTransport recovery probe | Complete original animation opcode/physical-pose equivalence and subjective controls review |
| Scoring hardware, power-ups, coins and equipment | Source-derived rules, seven field slots, Blender item models; replicated collection probe | Complete original-match parity across interacting hardware/effects; persistent spending/progression absent |
| Injuries and substitutions | Fatal-fall medical sequence, rotating bench, clock stoppage; tests and browser/network probes | Full original parity across every interruption and medical transition |
| AI movement, passing and goalkeeping | Dedicated source-derived modules and branch tests | Exhaustive original AI comparison across whole matches |
| Browser multiplayer using WebTransport | Go authority, binary snapshots, retained events; paired local loss/delay probes | Reconnect and WAN validation; no lag compensation or client prediction |
| Recognizable modern Blender graphics | Authored court, athletes, ball, items, medics and compact impacts; higher camera | Final artistic acceptance, further material/animation refinement |
| Audio | Synthesized action/item/match cues, source windup timing, priority/voice limits; actual match and goal/medical offline mixes | Subjective audible mix review; current evidence measures signals and routing |
| Higher FPS and resolution | Independent renderer, bounded turns, time-sampled ball trail, batched meshes | Browser workload measured around 30 FPS in prior environment; 60+ FPS target not proven |
| Complete original feature scope | Exhibition match systems are present | Career/league, transfers and persistent team progression are absent; do not silently declare full-original completion without resolving these |

## Next source-level work

Reconcile held-ball physical placement with step_match at 0xcff4-0xd03e.
It copies carrier position and velocity, then applies the signed two-byte
player_ball_offsets entry indexed by the player's displayed sprite, adjusted
by sprite origins and held-ball sprite size. Current game.js/server game.go
copy velocity correctly but use a fixed forward offset. The displayed Blender
ball follows BallGrip, so visual attachment alone does not prove physical
collision/release placement. The complete 117 signed ball offsets, 120 sprite origins and 24 standing,
running and throwing sequences are now reproducibly extracted by
`tools/extract-held-ball-reference.py` into `held-ball-reference.json`.
Simulation integration is still pending; jump/catch/keeper sequences and
coordinate anchoring must also be reconciled.

## Verification limits

A green unit suite is supporting evidence for its cases, not a percent-complete
measure. A local paired-client match does not prove WAN recovery. A screenshot
proves a rendered moment, not motion quality. Unclipped offline audio does not
prove perceptual balance. All these remaining requirements keep the overall
goal open.
