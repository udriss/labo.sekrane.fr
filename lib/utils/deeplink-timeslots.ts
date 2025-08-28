export function buildTimeslotsDeepLink(eventId: number, timeslotIds: number[]): string {
  if (!eventId || !Array.isArray(timeslotIds) || timeslotIds.length === 0)
    return `/evenements/${eventId}`;
  const list = Array.from(new Set(timeslotIds.filter((n) => Number.isFinite(n))));
  if (!list.length) return `/evenements/${eventId}`;
  return `/evenements/${eventId}/timeslots?focus=${list.join(',')}`;
}

export function parseFocusIds(search: string): number[] {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const raw = params.get('focus');
  if (!raw) return [];
  return raw
    .split(/[,;]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}
