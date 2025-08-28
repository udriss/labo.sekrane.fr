import { GET as GET_SECURITY } from '@/app/api/admin/security/route';

jest.mock('@/auth', () => ({ auth: async () => ({ user: { id: 1, role: 'ADMIN' } }) }));

// Mock prisma counts
jest.mock('@/lib/services/db', () => ({
  prisma: {
    authLog: {
      count: async (args: any) => (args.where.success ? 7 : 2),
      findFirst: async () => null,
    },
    utilisateur: { count: async (args: any) => (args?.where?.lockedUntil ? 1 : 10) },
    appSetting: { findMany: async () => [] },
  },
}));

describe('Security endpoint', () => {
  it('returns security stats', async () => {
    const res: any = await GET_SECURITY();
    const json = await res.json();
    expect(json.failedLogins24h).toBeGreaterThanOrEqual(0);
    expect(json.successfulLogins24h).toBeGreaterThanOrEqual(0);
    expect(json.totalUsers).toBe(10);
    expect(json.lockedUsers).toBe(1);
  });
});
