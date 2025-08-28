import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// We'll mock prisma client methods used in notification-service
jest.mock('@/lib/services/db', () => {
  const targets: any[] = [];
  const notifications: any[] = [];
  const prefs: any[] = [
    { role: 'ADMIN', module: 'MATERIEL', actionType: 'CREATE', enabled: true },
    { role: 'ADMIN', module: 'MATERIEL', actionType: 'UPDATE', enabled: true },
    { role: 'ADMIN', module: 'MATERIEL', actionType: 'DELETE', enabled: true },
  ];
  const users: any[] = [{ id: 1, role: 'ADMIN' }];
  return {
    prisma: {
      notificationPreference: {
        findMany: async (args: any) =>
          prefs.filter(
            (p) =>
              p.module === args.where.module && p.actionType === args.where.actionType && p.enabled,
          ),
      },
      utilisateur: {
        findMany: async (args: any) => users.filter((u) => args.where.role.in.includes(u.role)),
      },
      notification: {
        create: async ({ data }: any) => {
          const id = notifications.length + 1;
          const rec = {
            id,
            ...data,
            createdAt: new Date(),
            targets: data.targets.create.map((c: any, i: number) => ({
              id: i + 1,
              notificationId: id,
              userId: c.userId,
              readAt: null,
            })),
          };
          notifications.push(rec);
          targets.push(...rec.targets);
          return rec;
        },
      },
      notificationTarget: {
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const t of targets) {
            const notifMatch = where.notificationId
              ? t.notificationId === where.notificationId
              : true;
            const userMatch = t.userId === where.userId;
            const readMatch = where.readAt === null ? t.readAt === null : true;
            if (notifMatch && userMatch && readMatch) {
              t.readAt = data.readAt;
              count++;
            }
          }
          return { count };
        },
        findMany: async ({ where }: any) =>
          targets
            .filter((t) => {
              if (t.userId !== where.userId) return false;
              if (where.readAt === null) return t.readAt === null; // unread only
              return true;
            })
            .map((t) => ({
              ...t,
              notification: notifications.find((n) => n.id === t.notificationId),
            })),
      },
      apiLog: {
        create: async ({ data }: any) => {
          // Mock implementation - just return the data
          return { id: Date.now(), ...data };
        },
      },
    },
  };
});

// Mock fetch for HTTP calls to WebSocket server
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  }),
) as jest.Mock;

import { notificationService } from '@/lib/services/notification-service';

describe('notificationService', () => {
  it('creates and dispatches a notification using role preferences', async () => {
    const created = await notificationService.createAndDispatch({
      module: 'MATERIEL',
      actionType: 'CREATE',
      message: 'Matériel créé',
      data: { materielId: 10 },
    });
    expect(created).toBeTruthy();
    expect(created?.targets.length).toBeGreaterThan(0);
  });

  it('marks a notification as read', async () => {
    const created = await notificationService.createAndDispatch({
      module: 'MATERIEL',
      actionType: 'UPDATE',
      message: 'Maj',
      data: {},
    });
    expect(created).toBeTruthy();
    await notificationService.markRead(1, created!.id);
    const list = await notificationService.listForUser(1, { unreadOnly: true });
    // The updated one should not appear in unread list
    const stillUnread = list.find((t) => t.notification.id === created!.id);
    expect(stillUnread).toBeUndefined();
  });

  it('lists notifications for user (including read)', async () => {
    const created = await notificationService.createAndDispatch({
      module: 'MATERIEL',
      actionType: 'DELETE',
      message: 'Suppression',
      data: {},
    });
    expect(created).toBeTruthy();
    const all = await notificationService.listForUser(1, {});
    expect(all.some((t) => t.notification.id === created!.id)).toBe(true);
  });

  it('markAllRead marks all unread notifications', async () => {
    await notificationService.createAndDispatch({
      module: 'MATERIEL',
      actionType: 'CREATE',
      message: 'Another',
      data: {},
    });
    const before = await notificationService.listForUser(1, { unreadOnly: true });
    expect(before.length).toBeGreaterThan(0);
    // @ts-ignore access internal for test
    await notificationService.markAllRead(1);
    const after = await notificationService.listForUser(1, { unreadOnly: true });
    expect(after.length).toBe(0);
  });

  it('returns null when no preferences enable a notification (edge case)', async () => {
    // Mock preference query to return empty
    const { prisma } = await import('@/lib/services/db');
    // @ts-ignore override
    prisma.notificationPreference.findMany = async () => [];
    const skipped = await notificationService.createAndDispatch({
      module: 'UNKNOWN',
      actionType: 'NONE',
      message: 'Should skip',
      data: {},
    });
    expect(skipped).toBeNull();
  });
});
