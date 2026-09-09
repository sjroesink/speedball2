// A repeat after focus loss must not resurrect a cleared held key.
export function acceptKeyDown(keys, code, repeat) {
  if (repeat && (code === "Escape" || !keys.has(code))) return false;
  keys.add(code);
  return true;
}

export function clearControls(keys, state, team, online, currentInput) {
  keys.clear();
  // Local training is paused before the next simulation tick can consume edges.
  if (!online && state.previous) state.previous[team] = currentInput();
}
