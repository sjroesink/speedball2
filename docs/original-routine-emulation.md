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
