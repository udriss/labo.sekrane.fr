export type TimeslotState =
  | 'created'
  | 'modified'
  | 'deleted'
  | 'invalidated'
  | 'approved'
  | 'rejected'
  | 'restored';
import type { TimeslotData } from '@/lib/types/timeslots';

// Re-export TimeslotData for test files
export type { TimeslotData } from '@/lib/types/timeslots';

export function groupByDate(slots: TimeslotData[]) {
  const map = new Map<string, TimeslotData[]>();
  for (const s of slots) {
    const key = s.timeslotDate ?? s.startDate.substring(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  return map;
}
