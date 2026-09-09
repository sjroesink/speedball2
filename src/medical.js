// Source medical phases in terrain coordinates, at two units per reference tick.
// Completion uses the physical sideline rather than the original screen edge.
export function createMedical(player, x, y) {
  const dir = x <= 320 ? 1 : -1;
  return {
    player,
    phase: 0,
    origin: [x, y],
    patient: [x, y],
    medics: [
      [dir === 1 ? 560 : 80, y],
      [dir === 1 ? 592 : 48, y],
    ],
    fraction: 0,
  };
}

export function advanceMedical(m, dt) {
  m.fraction += dt * 25;
  while (m.fraction >= 1 - 1e-9) {
    m.fraction = Math.max(0, m.fraction - 1);
    const dir = m.origin[0] <= 320 ? 1 : -1,
      [a, b] = m.medics;
    const targetX = m.origin[0] + (m.phase === 0 ? 32 : 28) * dir;
    if (m.phase === 0 && b[0] === targetX && b[1] === m.origin[1]) m.phase = 1;
    if (
      m.phase === 1 &&
      b[0] === m.origin[0] + 28 * dir &&
      b[1] === m.origin[1]
    )
      m.phase = 2;
    if (m.phase === 2 && a[1] === m.origin[1]) m.phase = 3;
    if (m.phase === 3 && (a[0] < -48 || a[0] > 688)) return true;
    const toward = (from, to) =>
      Math.sign(to - from) * Math.min(2, Math.abs(to - from));
    if (m.phase < 2) {
      const tx = m.origin[0] + (m.phase === 0 ? 32 : 28) * dir;
      b[0] += toward(b[0], tx);
      b[1] += toward(b[1], m.origin[1]);
      a[0] += toward(a[0], m.patient[0] - 26 * dir);
      a[1] += toward(a[1], m.origin[1] + (m.origin[1] <= 576 ? 32 : -32));
    } else {
      if (m.phase === 2) {
        a[0] += toward(a[0], m.patient[0] - 26 * dir);
        a[1] += toward(a[1], m.origin[1]);
      } else a[0] += 2 * dir;
      b[0] += 2 * dir;
      m.patient[0] += 2 * dir;
    }
  }
  return false;
}
