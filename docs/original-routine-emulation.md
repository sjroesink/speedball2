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
