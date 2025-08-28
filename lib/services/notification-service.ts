// lib/services/notification-service.ts

import { prisma } from '@/lib/services/db';
import { randomUUID } from 'crypto';
import { writeApiLog } from '@/lib/services/audit-log';

export type DomainNotificationInput = {
  module: string;
  actionType: string; // CREATE / MODIFY / DELETE / READ / SYSTEM ...
  type?: string; // internal category
  severity?: string; // low|medium|high|critical
  title?: string;
  message: string;
  data?: any;
  targetUserIds?: number[]; // optional direct targeting
  // Optional exclusions when broadcasting by roles or when targetUserIds provided broadly
  // Useful to avoid duplicates (e.g., exclude event owner from GLOBAL when they get OWNER notification)
  excludeUserIds?: number[];
};

export class NotificationService {
  private async broadcastToWebSocket(notification: any, recipientIds: number[]) {
    try {
      const notificationPayload = {
        id: notification.id,
        uuid: notification.uuid,
        module: notification.module,
        actionType: notification.actionType,
        type: notification.type,
        severity: notification.severity,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt,
        read: false,
      };

      // Send to internal WebSocket server endpoint
      const wsPort = process.env.WS_PORT || process.env.PORT;
      const response = await fetch(`http://localhost:${wsPort}/internal/notify-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification: notificationPayload, recipientIds }),
      });

      if (!response.ok) {
        console.error('[notification-service] Failed to broadcast to WebSocket:', response.status);
      }
    } catch (error) {
      console.error('[notification-service] Error broadcasting to WebSocket:', error);
    }
  }

  async createAndDispatch(input: DomainNotificationInput) {
    const {
      module,
      actionType,
      message,
      data,
      severity = 'low',
      type = 'notification',
      title,
      targetUserIds,
      excludeUserIds = [],
    } = input;

    // Determine recipients:
    let recipientIds: number[] = [];
    if (targetUserIds && targetUserIds.length) {
      recipientIds = targetUserIds;
    } else {
      // Use preferences: find roles enabled for module+actionType
      const prefs = await prisma.notificationPreference.findMany({
        where: { module, actionType, enabled: true },
        select: { role: true },
      });
      if (!prefs.length) {
        // Downgrade to info to keep tests clean while retaining traceability
        console.info(
          `[notification-service] No notificationPreference found for module="${module}" actionType="${actionType}". Nothing to dispatch.`,
        );
        return null; // no one wants it
      }
      const roles = prefs.map((p: { role: any }) => p.role);
      const users = await prisma.utilisateur.findMany({
        where: { role: { in: roles } },
        select: { id: true },
      });
      recipientIds = users.map((u: { id: number }) => u.id);
      if (!recipientIds.length) {
        console.info(
          `[notification-service] Preferences exist for module="${module}" actionType="${actionType}" but no users found for roles.`,
        );
        return null;
      }
    }

    // Apply exclusions (dedupe + filter)
    const excludeSet = new Set<number>((excludeUserIds || []).filter((n) => typeof n === 'number'));
    if (excludeSet.size) {
      recipientIds = recipientIds.filter((id) => !excludeSet.has(id));
      if (!recipientIds.length) {
        console.info(
          `[notification-service] All recipients excluded for module="${module}" actionType="${actionType}". Skipping dispatch.`,
        );
        return null;
      }
    }

    try {
      console.info(
        `[notification-service] Dispatching notification module="${module}" actionType="${actionType}" severity="${severity}" to ${recipientIds.length} recipient(s).`,
      );
    } catch {}

    const notification = await prisma.notification.create({
      data: {
        uuid: randomUUID(),
        module,
        actionType,
        type,
        severity,
        title,
        message,
        data,
        targets: {
          create: recipientIds.map((userId) => ({ userId })),
        },
      },
      include: { targets: true },
    });

    // Push over WS to connected recipients
    await this.broadcastToWebSocket(notification, recipientIds);
    // Also write to ApiLog for auditing visibility
    try {
      await writeApiLog({
        method: 'SYSTEM',
        path: '/internal/notification',
        status: 200,
        module,
        action: actionType,
        message: title || message?.slice?.(0, 120) || 'notification',
        meta: { notificationId: notification.id, recipients: recipientIds.length },
      });
    } catch {}
    return notification;
  }

  async markRead(userId: number, notificationId: number) {
    await prisma.notificationTarget.updateMany({
      where: { notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: number) {
    await prisma.notificationTarget.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async listForUser(
    userId: number,
    params: { unreadOnly?: boolean; limit?: number; cursor?: number } = {},
  ) {
    const { unreadOnly, limit = 50, cursor } = params;
    // Runtime guard: help diagnose prisma client not regenerated
    // @ts-ignore
    if (!prisma.notificationTarget) {
      throw new Error(
        'Prisma client missing notificationTarget. Run: npx prisma generate (schema changed).',
      );
    }
    return prisma.notificationTarget.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'desc' },
      include: { notification: true },
    });
  }

  async listAllNotifications(params: { limit?: number; cursor?: number } = {}) {
    const { limit = 50, cursor } = params;
    return prisma.notification.findMany({
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'desc' },
      select: {
        id: true,
        module: true,
        actionType: true,
        severity: true,
        title: true,
        message: true,
        data: true,
        createdAt: true,
      },
    });
  }
}

// Convenience wrappers for common domain events
export const notifyMaterielCreated = (
  materielId: number,
  message: string,
  data?: any,
  targetUserIds?: number[],
) =>
  notificationService.createAndDispatch({
    module: 'MATERIEL',
    actionType: 'CREATE',
    message,
    data: { materielId, ...(data || {}) },
    targetUserIds,
  });
export const notifyMaterielUpdated = (
  materielId: number,
  message: string,
  data?: any,
  targetUserIds?: number[],
) =>
  notificationService.createAndDispatch({
    module: 'MATERIEL',
    actionType: 'UPDATE',
    message,
    data: { materielId, ...(data || {}) },
    targetUserIds,
  });
export const notifyMaterielDeleted = (
  materielId: number,
  message: string,
  data?: any,
  targetUserIds?: number[],
) =>
  notificationService.createAndDispatch({
    module: 'MATERIEL',
    actionType: 'DELETE',
    message,
    data: { materielId, ...(data || {}) },
    targetUserIds,
  });

export const notifyReactifCreated = (
  reactifId: number,
  message: string,
  data?: any,
  targetUserIds?: number[],
) =>
  notificationService.createAndDispatch({
    module: 'CHEMICALS',
    actionType: 'CREATE',
    message,
    data: { reactifId, ...(data || {}) },
    targetUserIds,
  });
export const notifyReactifUpdated = (
  reactifId: number,
  message: string,
  data?: any,
  targetUserIds?: number[],
) =>
  notificationService.createAndDispatch({
    module: 'CHEMICALS',
    actionType: 'UPDATE',
    message,
    data: { reactifId, ...(data || {}) },
    targetUserIds,
  });
export const notifyReactifDeleted = (
  reactifId: number,
  message: string,
  data?: any,
  targetUserIds?: number[],
) =>
  notificationService.createAndDispatch({
    module: 'CHEMICALS',
    actionType: 'DELETE',
    message,
    data: { reactifId, ...(data || {}) },
    targetUserIds,
  });

export const notifySystemAlert = (message: string, data?: any, targetUserIds?: number[]) =>
  notificationService.createAndDispatch({
    module: 'SYSTEM',
    actionType: 'ALERT',
    severity: 'high',
    message,
    data,
    targetUserIds,
  });

export const notificationService = new NotificationService();
