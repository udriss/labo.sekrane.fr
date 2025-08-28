import { POST as REQUEST_RESET } from '@/app/api/auth/request-password-reset/route';
import { POST as RESET_PASSWORD } from '@/app/api/auth/reset-password/route';

jest.mock('@/lib/services/db', () => {
  const tokens: any[] = [];
  let users: any[] = [{ id: 1, email: 'a@test.com', password: 'hash', lockedUntil: null }];
  const logs: any[] = [];
  return {
    prisma: {
      utilisateur: {
        findUnique: async ({ where: { email } }: any) =>
          users.find((u) => u.email === email) || null,
        update: async ({ where: { id }, data }: any) => {
          const u = users.find((x) => x.id === id);
          if (u) Object.assign(u, data);
          return u;
        },
      },
      passwordResetToken: {
        create: async ({ data }: any) => {
          const row = { id: tokens.length + 1, ...data, createdAt: new Date(), usedAt: null };
          tokens.push(row);
          return row;
        },
        findFirst: async ({ where: { email, token, expiresAt, usedAt } }: any) =>
          tokens.find(
            (t) =>
              t.email === email &&
              t.token === token &&
              t.usedAt === usedAt &&
              t.expiresAt > expiresAt.gt,
          ) || null,
        update: async ({ where: { id }, data }: any) => {
          const t = tokens.find((tt) => tt.id === id);
          if (t) Object.assign(t, data);
          return t;
        },
      },
      authLog: {
        create: async ({ data }: any) => {
          logs.push({ id: logs.length + 1, ...data, createdAt: new Date() });
          return data;
        },
        count: async ({ where }: any) =>
          logs.filter(
            (l) =>
              (where.email ? l.email === where.email : true) &&
              l.success === where.success &&
              l.createdAt >= where.createdAt.gte,
          ).length,
      },
      $transaction: async (ops: any[]) => {
        for (const op of ops) {
          await op;
        }
      },
    },
  };
});

describe('Password reset flow', () => {
  it('issues token then resets password', async () => {
    const req1: any = { json: async () => ({ email: 'a@test.com' }) };
    const res1: any = await REQUEST_RESET(req1);
    const body1 = await res1.json();
    expect(body1.ok).toBe(true);
    expect(body1.token).toBeTruthy();
    const token = body1.token;

    const req2: any = {
      json: async () => ({ email: 'a@test.com', token, newPassword: 'XyZ123!!' }),
    };
    const res2: any = await RESET_PASSWORD(req2);
    const body2 = await res2.json();
    expect(body2.ok).toBe(true);
  });
});
