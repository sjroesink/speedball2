// Recover recent sounds after omitted snapshots with a bounded event tail.
export const eventHistoryLimit = 16;
export function emit(s, kind, actor, target, x = 0, z = 0, h = 0.5) {
  const event = { id: s.event.id + 1, kind, actor, target, x, z, h };
  s.event = event;
  s.events = [...(s.events ?? []), event].slice(-eventHistoryLimit);
  return event;
}
