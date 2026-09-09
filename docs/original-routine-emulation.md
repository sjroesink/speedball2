# Executing original routines

This harness runs the user-supplied Amiga reference program with Ghidra's
P-code emulator. It is a routine-level comparison, not a full Amiga emulator
or a complete match replay. No original executable bytes are shipped here.

## Verified first routine

`CompareOriginalSustain.java` loads the program, executes its division-table
initialization at 0x84ac..0x84c4, then executes get_sustain at 0xf564..0xf57e
for speeds 100..250. It stops before RTS; no caller or synthetic return is
needed. Each case uses seven original instructions. Both loops have explicit
instruction bounds. Writes remain in emulator state; the project is read-only.

The uninitialized database initially returned 8 for every speed. Those results
were rejected: startup creates div_10_table. Executing the original startup
loop fixes that precondition without substituting the remake's lookup logic.

Reference archive SHA-256:
`89A9D8CB6767EB1DF0B31C2AD837D95317577EFBAB8C79AFE6B93D80901EA258`.
Ghidra 12.1.3 reports an invalid instruction prototype at 0x15102 when opening
the supplied database. That address is outside these bounded execution ranges;
the measured routines completed. This warning must be assessed before tracing
routines that reach that region.

## Reproduction

Import the supplied `.reference/amiga/speedball2-amiga.bin.gzf` into a local
Ghidra project once. Ghidra rejects project paths containing a dot-prefixed
component, so use a separate temporary project directory. The source archive
and exported program stay local and ignored. Run analyzeHeadless with:

```text
<project-directory> RoutineComparison -process speedball2-amiga.bin -readOnly -noanalysis -scriptPath <workspace>/tools -postScript CompareOriginalSustain.java <output.csv>
```

Then compare the measured results with the current simulation:

```text
node tools/compare-original-sustain.mjs <output.csv>
```

The comparison rejects missing/out-of-order attributes and unexpected
instruction counts. `original-sustain.csv` contains the measured numeric
results only. Current result: 151 compared, zero mismatches against JS
`actionSustain`. This directly validates that helper; it does not establish
full action timing, Go execution, controls, collisions or whole-match parity.
The same emulator project can support the next bounded reference routines.

## Distance routine

`CompareOriginalDistance.java` executes vector_length at 0xdaf6 until one of
its two RTS addresses (0xdb1a/0xdb20). Input registers D0/D3 receive absolute
terrain deltas; output is D1's low word. Each case has a 32-instruction limit.
It needs no runtime lookup initialization. The same imported read-only project
and headless arguments apply, with this script name and a separate output CSV.

The input grid includes all integers 0..64 on both axes and 15 larger values
up to 1152, yielding 6,400 pairs. It covers small-range truncation and branch
boundaries, swapped axes, zero deltas and representative full-court distances.
`original-distance.csv` contains measured numbers, not executable bytes.

```text
node tools/compare-original-distance.mjs docs/original-distance.csv
```

Current result: 6,400 compared, zero mismatches against JS referenceDistance.
The comparison validates the complete expected grid and emulator step bounds.
This proves the measured integer helper cases only: sign normalization,
sprite-origin adjustments, world-coordinate rounding and caller/update order
are outside this routine and remain separate comparison targets. No production
code needed changing as a result of this measurement.

## Point distance with physical pose origin

`CompareOriginalPointDistance.java` executes distance_to_point at 0xdaca,
including its actual BSR/RTS call to vector_length, stopping before the outer
RTS at 0xdaf4. A synthetic stack is initialized through the compiler spec's
stack register. D0/D3 are explicitly initialized in full before each case.
Each run has a 64-instruction limit. The querying position is terrain (320,576).
Signed target deltas are -64/-32/-16/-1/0/1/16/32/64 on both axes.

For all 117 sprites represented by physical-pose-data.json, the Y origin is
read directly from the reference program's table at 0x40e2, independently of
the remake's exported table. It is placed at the original player offset 0x26.
The reference table has 120 entries; its three additional entries are outside
the remake's player-pose set and are not claimed as compared here.

```text
node tools/compare-original-point-distance.mjs docs/original-point-distance.csv
```

Result: 9,477 measured cases, zero differences against playerPointDistance.
The comparison also verifies every Y origin and the complete input ordering.
This extends evidence to sign handling and pose-origin application at integer
terrain coordinates. It does not cover fractional-coordinate quantization,
when physical sprites are updated, or selection/contact call ordering. The
initial stack-register naming issue and undefined upper-word warnings were
resolved before generating the retained measurements. No production change
was necessary.

## Tackle threshold

`CompareOriginalTackle.java` executes get_tackle_difficulty from 0x105ba to
its RTS at 0x10618. A4/A5 point to synthetic attacker/victim records in emulator
memory. Inputs set attack, defense, relative facing and the slide/jump/keeper
flags. The original modifier table and byte arithmetic run unchanged. The
comparison uses D4's low byte, as the tackle success decision does.

```text
node tools/compare-original-tackle.mjs docs/original-tackle.csv
```

The 4,096-case grid uses attributes 100/140/170/200/204/205/249/250, all eight
relative directions and all combinations of the three flags. Defense 204/205
covers the keeper-bonus saturation boundary. Each run is bounded to 64 original
instructions; the comparator verifies the full input ordering. Result: zero
mismatches against JS tackleThreshold. Original numeric measurements are in
original-tackle.csv. No production change was needed. This does not cover RNG
sequence, victim eligibility/order, collision distances or the damage routine.

## Both hosts use the measured corpus in normal tests

`src/original-reference.test.js` runs the four strict CSV comparators as part
of npm test. `server/original_reference_test.go` independently reads the same
measured data and checks the Go helpers, including pose origins. Thus 20,124
original measured cases are checked per host without Ghidra in routine CI.
The Go reader rejects malformed counts/headers, duplicate inputs and noninteger
cells. Regeneration still requires the local original reference and emulator;
these tests do not themselves rerun the Amiga code. All four Go comparisons
pass. No server/client production logic changed in this integration.

## Damage and attribute deterioration

`CompareOriginalDamage.java` executes 0x1061a..0x10668, stopping before the
separate equipment-drop callback. It reads the victim's energy and all eight
attributes from emulated memory after execution. A 128-instruction bound
applies to every case. The 1,536 cases combine eight power and stamina values,
six starting energies (1/8/16/64/127/128), and four underlying attribute values
(100/101/173/250), covering minimum loss, depletion and attribute-floor clamps.

```text
node tools/compare-original-damage.mjs docs/original-damage.csv
```

The comparator invokes the production JS damage handler on an unequipped
victim and converts original energy units to the remake's percentage display.
Result: zero differences. Go checks the same corpus through its damage handler.
Both are included in normal tests, increasing reference cases per host to
21,660. Equipment dropping, shields, fall animation and injury/substitution
scheduling are outside the executed original range and remain separate checks.
No production change was necessary for these measured cases.

## Random generator and emulator ADDX correction

`CompareOriginalRandom.java` executes 0x14e78..0x14eac for 256 consecutive calls
per seed, across six seeds including the original startup pair, zero and carry
edge cases. It measures both the returned low byte and the two complete 32-bit
seed words. There is a 32-instruction bound per call. The normal host tests now
include these 1,536 measurements (23,196 total reference cases per host).

The raw Ghidra 12.1.3 execution disagreed in upper seed words immediately:
original startup seed gave 2224638431 versus the remake's 2224703967 for the
first new seed. Inspection of 68000.sinc showed addxflags updates CF/VF but
neither the ADDX instruction nor extendedResultFlags updates XF. The
[Motorola programmer reference, ADDX section 4-13](https://www.nxp.com/docs/en/reference-manual/M68000PRM.pdf)
specifies that X is set to C. Consequently the harness synchronizes XF from CF
immediately after original ADDX instructions at 0x14e88 and 0x14e92. This is an
explicit emulator correction, not an edit to original game code or a replacement
of its arithmetic with the remake's formula. Pass a second script argument
`raw` to reproduce uncorrected emulator behavior. Future routines using ADDX
must account for this issue; earlier measured routines do not execute ADDX.

```text
node tools/compare-original-random.mjs docs/original-random.csv
```

Corrected-emulator result: 1,536 steps, no differences in output or full state.
Only corrected numeric measurements are retained. The comparator caps displayed
mismatches to eight while reporting the total and exiting unsuccessfully if
any differ. Both JS and Go checks pass. This proves the generator for these
sequences, not the number/order of random calls during a complete match.

## Predicted target position

`CompareOriginalPrediction.java` executes target_predicted_position at
0x10aaa through 0x10ae6, including the original reflect_x/reflect_y calls.
It initializes div_10_table by executing 0x84ac..0x84c4, supplies the target's
terrain position and signed per-tick velocity in memory, and reads the final
D1/D2 words. Intelligence is supplied through the querying player's record.
Each prediction has an 80-instruction bound. No ADDX correction is needed.

The 8,575 cases combine seven intelligence values around lookahead transitions,
seven positions on each axis (walls, nearby interior positions and center),
and five velocities per axis (-8, -1, 0, 1, 8). Both JS and Go match every
result. The retained CSV contains numeric inputs and outputs only; the source
archive and runtime remain ignored. The normal test suites now check 31,771
original measurements per host across seven routines.

```text
node tools/compare-original-prediction.mjs docs/original-prediction.csv
```

This verifies the prediction used by aggression, pursuit and other AI callers
for the sampled states. It does not verify candidate selection, the caller's
timing or an entire match. The newly restored aggression branch still needs
its own original-execution comparison.
