import { NextRequest } from 'next/server';
import { POST as POST_TIMESLOTS, PUT as PUT_TIMESLOTS } from '@/app/api/timeslots/route';
import { prisma } from '@/lib/services/db';

// Mock auth so user id = 1 (owner)
jest.mock('@/auth', () => ({ auth: async () => ({ user: { id: 1 } }) }));
// Mock notification service
jest.mock('@/lib/services/notification-service', () => ({
  notificationService: { createAndDispatch: jest.fn().mockResolvedValue(null) },
}));

// In-memory event + prisma mocks minimal for this flow
const events: any[] = [{ id: 10, title: 'Evt', discipline: 'chimie', ownerId: 1 }];
let timeslotSeq = 1;
const timeslots: any[] = [];

jest.mock('@/lib/services/db', () => {
  const mockPrisma = {
    evenement: {
      findUnique: async ({ where }: any) => events.find((e) => e.id === where.id) || null,
    },
    creneau: {
      create: async ({ data }: any) => {
        const rec = { id: timeslotSeq++, createdAt: new Date(), updatedAt: new Date(), ...data };
        timeslots.push(rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        if (where?.id?.in) return timeslots.filter((t) => where.id.in.includes(t.id));
        return timeslots;
      },
      update: async ({ where, data }: any) => {
        const rec = timeslots.find((t) => t.id === where.id);
        if (!rec) throw new Error('not found');
        Object.assign(rec, data, { updatedAt: new Date() });
        return rec;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        timeslots.forEach((t) => {
          if (where.id.in.includes(t.id)) {
            Object.assign(t, data, { updatedAt: new Date() });
            count++;
          }
        });
        return { count };
      },
    },
    $transaction: async (ops: any[]) => Promise.all(ops),
    $queryRawUnsafe: async (_query: string, ...params: any[]) => {
      const ids = params.map((p) => p);
      timeslots.forEach((t) => {
        if (ids.includes(t.id)) {
          if (t.proposedStartDate) t.startDate = t.proposedStartDate;
          if (t.proposedEndDate) t.endDate = t.proposedEndDate;
          if (t.proposedTimeslotDate) t.timeslotDate = t.proposedTimeslotDate;
          t.proposedStartDate = null;
          t.proposedEndDate = null;
          t.proposedTimeslotDate = null;
        }
      });
      return 1;
    },
  } as any;
  return { prisma: mockPrisma };
});

describe('Timeslots counter_proposal flow', () => {
  it('creates timeslots, counter proposes then approves promoting proposed fields', async () => {
    // Create
    const createReq = new Request('http://test.local/api/timeslots', {
      method: 'POST',
      body: JSON.stringify({
        eventId: 10,
        discipline: 'chimie',
        slots: [
          {
            startDate: '2025-08-15T10:00:00',
            endDate: '2025-08-15T12:00:00',
            timeslotDate: '2025-08-15',
          },
        ],
      }),
    });
    const createRes: any = await POST_TIMESLOTS(createReq as unknown as NextRequest);
    const created = await createRes.json();
    expect(created.timeslots?.length || created.timeslots?.length === 0).toBeTruthy();
    const arr = created.timeslots || created.timeslot || [];
    const id = arr[0].id;

    // Counter proposal
    const cpReq = new Request('http://test.local/api/timeslots', {
      method: 'PUT',
      body: JSON.stringify({
        timeslotIds: [id],
        approve: false,
        notes: 'move',
        counterProposal: {
          startDate: '2025-08-16T11:00:00',
          endDate: '2025-08-16T13:00:00',
          timeslotDate: '2025-08-16',
        },
      }),
    });
    const cpRes: any = await PUT_TIMESLOTS(cpReq as unknown as NextRequest);
    const cpJson = await cpRes.json();
    expect(cpJson.action).toBe('counter_proposed');
    const rec = timeslots.find((t) => t.id === id);
    expect(rec.proposedStartDate).toBeTruthy();
    expect(rec.state).toBe('counter_proposed');

    // Approve (owner)
    const approveReq = new Request('http://test.local/api/timeslots', {
      method: 'PUT',
      body: JSON.stringify({ timeslotIds: [id], approve: true }),
    });
    const approveRes: any = await PUT_TIMESLOTS(approveReq as unknown as NextRequest);
    const approveJson = await approveRes.json();
    expect(approveJson.action).toBe('approved');
    const rec2 = timeslots.find((t) => t.id === id);
    expect(rec2.state).toBe('approved');
    expect(rec2.proposedStartDate).toBeNull();
  });
});
