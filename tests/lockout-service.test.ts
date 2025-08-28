import { maybeLockAccount } from '@/lib/services/security';

jest.mock('@/lib/services/db', () => {
  const logs: any[] = [];
  let user: any = { id: 1, lockedUntil: null };
  return {
    prisma: {
      authLog: {
        count: async ({ where }: any) =>
          logs.filter(
            (l) =>
              l.email === where.email &&
              l.success === where.success &&
              l.createdAt >= where.createdAt.gte,
          ).length,
        create: async ({ data }: any) => {
          logs.push({ ...data, createdAt: new Date(), id: logs.length + 1 });
          return data;
        },
      },
      utilisateur: {
        update: async ({ where: { id }, data }: any) => {
          if (id === user.id) Object.assign(user, data);
          return user;
        },
      },
    },
  };
});

describe('maybeLockAccount', () => {
  it('locks after threshold reached', async () => {
    const { prisma } = await import('@/lib/services/db');
    // simulate 4 previous fails
    for (let i = 0; i < 4; i++)
      await prisma.authLog.create({ data: { email: 't@test.com', success: false } });
    const res = await maybeLockAccount(1, 't@test.com', {
      lockThreshold: 4,
      lockWindowMinutes: 15,
      lockDurationMinutes: 10,
    });
    expect(res.locked).toBe(true);
    expect(res.lockedUntil).toBeTruthy();
  });
});
