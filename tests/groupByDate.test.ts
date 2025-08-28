import { groupByDate, TimeslotData } from '@/lib/utils/calendar-utils-timeslots';

describe('groupByDate', () => {
  it('groups by timeslotDate when present', () => {
    const slots: TimeslotData[] = [
      {
        id: 1,
        eventId: 1,
        discipline: 'chimie',
        state: 'created',
        startDate: '2025-08-08T08:00:00Z',
        endDate: '2025-08-08T09:00:00Z',
        timeslotDate: '2025-08-08',
        proposedNotes: null,
      },
      {
        id: 2,
        eventId: 1,
        discipline: 'chimie',
        state: 'created',
        startDate: '2025-08-08T10:00:00Z',
        endDate: '2025-08-08T11:00:00Z',
        timeslotDate: '2025-08-08',
        proposedNotes: null,
      },
      {
        id: 3,
        eventId: 1,
        discipline: 'chimie',
        state: 'created',
        startDate: '2025-08-09T08:00:00Z',
        endDate: '2025-08-09T09:00:00Z',
        timeslotDate: null,
        proposedNotes: null,
      },
    ];
    const map = groupByDate(slots);
    expect(map.get('2025-08-08')?.length).toBe(2);
    expect(map.get('2025-08-09')?.length).toBe(1);
  });
});
