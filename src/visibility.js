// Original logical viewport, independent of the browser's display dimensions.
// WIP Match.CenterScreenOnEntity and Entity.SetOnOffScreen.
export function scrollViewport(view, x, y, presentation = false) {
  const advance = (current, target, limit, horizontal) => {
    const speed = Math.min(16, (Math.abs(target - current) >> 3) + 1);
    if (horizontal && !presentation && speed < 2) return current;
    return Math.max(
      0,
      Math.min(
        limit,
        current +
          Math.sign(target - current) *
            Math.min(speed, Math.abs(target - current)),
      ),
    );
  };
  return [
    advance(view[0], x - 160, 320, true),
    advance(view[1], y - 92, 968, false),
  ];
}

export function inViewport(view, x, y, margin = 0) {
  return (
    x - view[0] >= margin &&
    x - view[0] <= 320 - margin &&
    y - view[1] >= margin &&
    y - view[1] <= 184 - margin
  );
}

export function worldInViewport(s, q, margin = 0) {
  return inViewport(
    s.logicalView ?? [160, 484],
    Math.round((q.z * 576) / 22.4 + 320),
    Math.round(576 - (q.x * 576) / 22.4),
    margin,
  );
}
export function advanceViewport(s) {
  const q = s.ball.owner >= 0 ? s.players[s.ball.owner] : s.ball;
  s.logicalView = scrollViewport(
    s.logicalView ?? [160, 484],
    Math.round((q.z * 576) / 22.4 + 320),
    Math.round(576 - (q.x * 576) / 22.4),
  );
}
