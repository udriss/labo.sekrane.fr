'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  attachWebSocketManager,
  getWebSocketState,
  forceCloseWebSocket,
  onWebSocketState,
} from '@/lib/services/ws-client-manager';

type WSMessage = {
  type: string;
  [key: string]: any;
};

type UseWSOptions = {
  userId: string | number;
  url?: string; // optional override
  onMessage?: (msg: WSMessage) => void;
  autoConnect?: boolean;
  heartbeatMs?: number;
  reconnectMs?: number;
};

export function useWebSocketNotifications(options: UseWSOptions) {
  const {
    userId,
    onMessage,
    url,
    autoConnect = true,
    heartbeatMs = 30000,
    reconnectMs = 10000,
  } = options;
  const [connected, setConnected] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const unsubscribeRef = useRef<null | (() => void)>(null);
  const onMessageRef = useRef<typeof onMessage | undefined>(undefined);
  onMessageRef.current = onMessage;

  const wsUrl = useMemo(() => {
    // En mode développement, permettre les connexions guest pour le debug
    // Bloquer totalement les connexions 'guest'
    if (!userId || String(userId) === 'guest' || !autoConnect) return null;

    if (url) return url;
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (envUrl) {
      // Supporte valeur absolue (ws://, wss://) ou relative (/ws)
      if (/^wss?:\/\//i.test(envUrl)) {
        // Si la page est servie en HTTPS mais l'URL est en ws:// (insecure), tenter une ré-écriture de sécurité
        try {
          const loc = globalThis?.location as Location | undefined;
          if (loc && loc.protocol === 'https:' && /^ws:\/\//i.test(envUrl)) {
            const original = new URL(envUrl.replace(/^ws:\/\//i, 'http://'));
            const sameHost = original.host === loc.host;
            // Ré-écriture seulement si host différent OU host=localhost pour éviter mixed content
            if (!sameHost || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(original.host)) {
              const rewritten = `wss://${loc.host}${original.pathname}${original.search}`;
              if (!(globalThis as any).__WS_URL_REWRITE_WARNED__) {
                (globalThis as any).__WS_URL_REWRITE_WARNED__ = true;
                console.warn('[ws] Mixed-content avoidance: rewriting', envUrl, '->', rewritten);
              }
              return `${rewritten}${rewritten.includes('?') ? '&' : '?'}userId=${encodeURIComponent(
                String(userId),
              )}`;
            }
            // Même host: simplement upgrade protocole si nécessaire
            const upgraded = envUrl.replace(/^ws:\/\//i, 'wss://');
            return `${upgraded}?userId=${encodeURIComponent(String(userId))}`;
          }
        } catch {}
        return `${envUrl}?userId=${encodeURIComponent(String(userId))}`;
      }
      if (envUrl.startsWith('/')) {
        const loc = globalThis?.location;
        const proto = loc?.protocol === 'https:' ? 'wss' : 'ws';
        const host = loc?.host ?? 'localhost:8006';
        return `${proto}://${host}${envUrl}?userId=${encodeURIComponent(String(userId))}`;
      }
      // Fallback: traiter comme chemin relatif manquant le slash
      const loc = globalThis?.location;
      const proto = loc?.protocol === 'https:' ? 'wss' : 'ws';
      const host = loc?.host ?? 'localhost:8006';
      return `${proto}://${host}/${envUrl.replace(/^\/+/, '')}?userId=${encodeURIComponent(String(userId))}`;
    }
    const loc = globalThis?.location;
    const proto = loc?.protocol === 'https:' ? 'wss' : 'ws';
    const host = loc?.host ?? 'localhost:8006'; // preserves port
    return `${proto}://${host}/ws?userId=${encodeURIComponent(String(userId))}`;
  }, [url, userId, autoConnect]);

  const connect = useCallback(() => {
    if (!wsUrl) return; // wait for real user id
    if (unsubscribeRef.current) return; // already attached
    if (process.env.NODE_ENV === 'development') console.log('[WS-HOOK] connect()', wsUrl);
    unsubscribeRef.current = attachWebSocketManager(
      (data) => {
        if (data) onMessageRef.current?.(data);
      },
      {
        url: wsUrl,
        heartbeatMs,
        minReconnectMs: reconnectMs,
        maxReconnectMs: reconnectMs * 8,
        debug: process.env.NODE_ENV === 'development',
      },
    );
    const state = getWebSocketState(wsUrl);
    setConnected(state.connected);
  }, [heartbeatMs, reconnectMs, wsUrl]);

  const disconnect = useCallback(() => {
    if (process.env.NODE_ENV === 'development') console.log('[WS-HOOK] disconnect()', wsUrl);
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (wsUrl) forceCloseWebSocket(wsUrl);
    setConnected(false);
  }, [wsUrl]);

  const send = useCallback(
    (msg: WSMessage | string) => {
      // Fire-and-forget: If manager has an open socket it will deliver, else ignored.
      // We avoid creating ad-hoc sockets to keep connection model simple.
      try {
        // Access internal registry indirectly by creating a hidden listener (lightweight) – simplified by opening a temp connection is avoided.
        // For now, we no-op if not connected to keep semantics predictable.
        if (!connected) return;
        // @ts-ignore – we stored socket on window for debug optional instrumentation (set in manager if debug) (optional future enhancement)
        const socket: WebSocket | undefined = (window as any).__WS_DEBUG_SOCKETS__?.[wsUrl];
        if (socket && socket.readyState === WebSocket.OPEN) {
          const payload = typeof msg === 'string' ? msg : JSON.stringify(msg);
          socket.send(payload);
        }
      } catch {}
    },
    [connected, wsUrl],
  );

  const broadcast = useCallback((data: any) => send({ type: 'broadcast', data }), [send]);

  useEffect(() => {
    if (!autoConnect) return;
    if (!wsUrl) return; // skip until we have a concrete user id
    // En mode développement, permettre les connexions guest pour le debug
    if (String(userId) === 'guest') return; // attendre l'authentification réelle

    connect();
    return () => disconnect();
  }, [autoConnect, connect, disconnect, wsUrl, userId]);

  // Subscribe to state events instead of polling
  useEffect(() => {
    if (!wsUrl) return;
    const off = onWebSocketState(wsUrl, (s) => {
      setConnected(s.connected);
      setAttempts(s.attempts);
    });
    return () => {
      try {
        off();
      } catch {}
    };
  }, [wsUrl]);

  return {
    connected,
    attempts,
    reconnecting: !connected && attempts > 0,
    connect,
    disconnect,
    send,
    broadcast,
    url: wsUrl,
  };
}
