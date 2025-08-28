// app/notifications/page.tsx

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Box as MBox } from '@mui/material';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useWebSocketNotifications } from '@/lib/hooks/useWebSocketNotifications';
import NotificationLiveFeed from '@/components/notifications/NotificationLiveFeed';
import type { WebSocketNotification } from '@/types/notifications';

export default function NotificationsPageClient() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const userId = (session?.user as any)?.id ?? 'guest';

  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { connected, connect, disconnect } = useWebSocketNotifications({
    userId,
    onMessage: (msg) => {
      // integrate simple notification messages (same shape as server sends)
      if (!msg) return;
      if (msg.type === 'notification' && msg.notification) {
        const n = msg.notification;
        const data = n.data || {};
        const notif: WebSocketNotification = {
          id: String(n.id),
          ts: new Date(n.createdAt || Date.now()).getTime(),
          type: n.type || n.severity || 'notification',
          title: n.title || n.module + ' ' + n.actionType,
          message: n.message,
          isRead: !!n.read,
          module: n.module,
          actionType: n.actionType,
          severity: n.severity,
          data,
          triggeredBy: data.triggeredBy,
          quantityPrev: data.quantityPrev,
          quantityNew: data.quantityNew,
          stockPrev: data.stockPrev,
          stockNew: data.stockNew,
          createdAt: new Date(n.createdAt).toISOString(),
          eventId: data.eventId,
          timeslotIds: data.timeslotIds,
        };
        setNotifications((prev) => [notif, ...prev.filter((p) => p.id !== notif.id)].slice(0, 200));
      }
      if (msg.type === 'notification-read' && msg.id) {
        setNotifications((prev) =>
          prev.map((p) => (p.id === String(msg.id) ? { ...p, isRead: true } : p)),
        );
      }
      if (msg.type === 'bulk-notifications' && Array.isArray(msg.items)) {
        const mapped = msg.items.map((m: any) => ({
          id: String(m.id),
          ts: m.createdAt || Date.now(),
          type: m.type || 'info',
          title: m.title || 'Notification',
          message: m.message || '',
          isRead: !!m.read,
          module: m.module,
          actionType: m.actionType,
          severity: m.severity,
          data: m.data || {},
          triggeredBy: m.data?.triggeredBy,
          createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
        }));
        setNotifications(mapped.slice(0, 200));
      }
    },
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/notifications?limit=50');
        if (!res.ok) return;
        const json = await res.json();
        const items: WebSocketNotification[] = (json.items || []).map((it: any) => {
          const notif = it.notification;
          const data = notif.data || {};
          return {
            id: String(notif.id),
            ts: new Date(notif.createdAt).getTime(),
            type: notif.type || notif.severity || 'notification',
            title: notif.title || notif.module + ' ' + notif.actionType,
            message: notif.message,
            isRead: !!it.readAt,
            module: notif.module,
            actionType: notif.actionType,
            severity: notif.severity,
            data,
            triggeredBy: data.triggeredBy,
            quantityPrev: data.quantityPrev,
            quantityNew: data.quantityNew,
            stockPrev: data.stockPrev,
            stockNew: data.stockNew,
            createdAt: new Date(notif.createdAt).toISOString(),
            eventId: data.eventId,
            timeslotIds: data.timeslotIds,
          } as WebSocketNotification;
        });
        setNotifications(items);
        if (items.length) setCursor(Number(items[items.length - 1].id));
        setHasMore(items.length === 50);
      } catch (e) {
        console.warn('Failed to fetch notifications', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    connect();
    return () => disconnect();
  }, [isAuthenticated, connect, disconnect]);

  const markAsRead = async (id: number) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: String(id) }),
      });
    } catch {}
    setNotifications((prev) => prev.map((p) => (p.id === String(id) ? { ...p, isRead: true } : p)));
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read', { method: 'PUT' });
    } catch {}
    setNotifications((prev) => prev.map((p) => ({ ...p, isRead: true })));
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/notifications?limit=50&cursor=${cursor}`);
      if (res.ok) {
        const json = await res.json();
        const items: WebSocketNotification[] = (json.items || []).map((it: any) => {
          const notif = it.notification;
          const data = notif.data || {};
          return {
            id: String(notif.id),
            ts: new Date(notif.createdAt).getTime(),
            type: notif.type || notif.severity || 'notification',
            title: notif.title || notif.module + ' ' + notif.actionType,
            message: notif.message,
            isRead: !!it.readAt,
            module: notif.module,
            actionType: notif.actionType,
            severity: notif.severity,
            data,
            triggeredBy: data.triggeredBy,
            quantityPrev: data.quantityPrev,
            quantityNew: data.quantityNew,
            stockPrev: data.stockPrev,
            stockNew: data.stockNew,
            createdAt: new Date(notif.createdAt).toISOString(),
            eventId: data.eventId,
            timeslotIds: data.timeslotIds,
          } as WebSocketNotification;
        });
        setNotifications((prev) => [...prev, ...items]);
        if (items.length) setCursor(Number(items[items.length - 1].id));
        if (items.length < 50) setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const readIds = useMemo(
    () => new Set(notifications.filter((n) => n.isRead).map((n) => Number(n.id))),
    [notifications],
  );

  return (
    <div style={{ padding: isMobileSmall ? 12 : 24 }}>
      <MBox component={motion.div} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <NotificationLiveFeed
          notifications={notifications.map((n) => ({
            id: Number(n.id),
            module: n.module || '',
            actionType: n.actionType || '',
            severity: (n.severity as any) || 'low',
            message: n.message || '',
            title: n.title || null,
            data: n.data,
            createdAt: n.createdAt || new Date(n.ts).toISOString(),
          }))}
          loading={loading}
          wsConnected={!!connected}
          onRefresh={async () => {
            setLoading(true);
            try {
              const res = await fetch('/api/notifications?limit=50');
              if (!res.ok) return;
              const json = await res.json();
              const items: WebSocketNotification[] = (json.items || []).map((it: any) => {
                const notif = it.notification;
                const data = notif.data || {};
                return {
                  id: String(notif.id),
                  ts: new Date(notif.createdAt).getTime(),
                  type: notif.type || notif.severity || 'notification',
                  title: notif.title || notif.module + ' ' + notif.actionType,
                  message: notif.message,
                  isRead: !!it.readAt,
                  module: notif.module,
                  actionType: notif.actionType,
                  severity: notif.severity,
                  data,
                  triggeredBy: data.triggeredBy,
                  quantityPrev: data.quantityPrev,
                  quantityNew: data.quantityNew,
                  stockPrev: data.stockPrev,
                  stockNew: data.stockNew,
                  createdAt: new Date(notif.createdAt).toISOString(),
                } as WebSocketNotification;
              });
              setNotifications(items);
              if (items.length) setCursor(Number(items[items.length - 1].id));
              setHasMore(items.length === 50);
            } catch (e) {
              console.warn('Failed to fetch notifications', e);
            } finally {
              setLoading(false);
            }
          }}
          onLoadMore={hasMore ? loadMore : undefined}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          readIds={readIds}
        />
      </MBox>
    </div>
  );
}
