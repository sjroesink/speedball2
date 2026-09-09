// Recover recent sounds after omitted snapshots with a bounded event tail.
export const eventHistoryLimit = 16;

export function recentEvents(s, after) {
  return (s.events?.length ? s.events : [s.event]).filter((e) => e.id > after);
}

// Audio-only events do not replace match feedback. Prefer consequential events.
export function notificationPriority(kind) {
  if ([6, 7, 14].includes(kind)) return 3;
  if ([8, 9, 10].includes(kind)) return 2;
  if ([11, 12, 13, 15].includes(kind)) return 1;
  if ([4, 5, 26, 27, 28].includes(kind)) return 0;
  return -1;
}

export function notificationEvent(s, after, minimumPriority = 0) {
  let chosen = null;
  for (const e of recentEvents(s, after)) {
    if (notificationPriority(e.kind) >= minimumPriority) {
      chosen = e;
      minimumPriority = notificationPriority(e.kind);
    }
  }
  return chosen;
}
export function emit(s, kind, actor, target, x = 0, z = 0, h = 0.5) {
  const event = { id: s.event.id + 1, kind, actor, target, x, z, h };
  s.event = event;
  s.events = [...(s.events ?? []), event].slice(-eventHistoryLimit);
  return event;
}
