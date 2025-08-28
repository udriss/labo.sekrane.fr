import {
  ManagedEntry,
  ManagerOptions,
  WSDataListener,
  WSStateListener,
  DEFAULT_OPTIONS,
} from './types';
import { openConnection } from './connection';

const registry = new Map<string, ManagedEntry>();
// Expose in browser for debug (live feed / admin page). Safe no-op on server.
if (typeof window !== 'undefined') {
  (window as any).__WS_DEBUG_REGISTRY__ = registry;
}

export function attachWebSocketManager(listener: WSDataListener, options: ManagerOptions) {
  const url = options.url;
  let entry = registry.get(url);

  if (!entry) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    entry = {
      url,
      socket: null,
      listeners: new Set(),
      stateListeners: new Set(),
      connected: false,
      manual: false,
      reconnectTimer: null,
      heartbeatTimer: null,
      backoff: opts.minReconnectMs,
      attempts: 0,
      opts,
    };
    registry.set(url, entry);
    openConnection(entry);
    if (typeof window !== 'undefined') {
      (window as any).__WS_DEBUG_SOCKETS__ = (window as any).__WS_DEBUG_SOCKETS__ || {};
    }
  }

  entry.listeners.add(listener);

  return () => {
    entry!.listeners.delete(listener);
    if (entry!.listeners.size === 0) {
      // Gracefully close and remove
      entry!.manual = true;
      try {
        entry!.socket?.close();
      } catch {}

      if (entry!.heartbeatTimer) {
        window.clearInterval(entry!.heartbeatTimer);
      }
      if (entry!.reconnectTimer) {
        window.clearTimeout(entry!.reconnectTimer);
      }

      registry.delete(url);
      if (typeof window !== 'undefined') {
        try {
          delete (window as any).__WS_DEBUG_SOCKETS__?.[url];
        } catch {}
      }
    }
  };
}

export function getWebSocketState(url: string) {
  const entry = registry.get(url);
  if (!entry) {
    return { connected: false, listeners: 0 };
  }
  return {
    connected: entry.connected,
    listeners: entry.listeners.size,
  };
}

export function forceCloseWebSocket(url: string) {
  const entry = registry.get(url);
  if (!entry) return;

  entry.manual = true;
  try {
    entry.socket?.close();
  } catch {}

  if (entry.heartbeatTimer) {
    window.clearInterval(entry.heartbeatTimer);
  }
  if (entry.reconnectTimer) {
    window.clearTimeout(entry.reconnectTimer);
  }

  registry.delete(url);
  if (typeof window !== 'undefined') {
    try {
      delete (window as any).__WS_DEBUG_SOCKETS__?.[url];
    } catch {}
  }
}

export function onWebSocketState(url: string, listener: WSStateListener) {
  let entry = registry.get(url);

  if (!entry) {
    // Create a dormant entry to attach listener; actual open will occur when attachWebSocketManager called
    entry = {
      url,
      socket: null,
      listeners: new Set(),
      stateListeners: new Set([listener]),
      connected: false,
      manual: false,
      reconnectTimer: null,
      heartbeatTimer: null,
      backoff: DEFAULT_OPTIONS.minReconnectMs,
      attempts: 0,
      opts: { ...DEFAULT_OPTIONS },
    } as ManagedEntry;
    registry.set(url, entry);
  } else {
    entry.stateListeners.add(listener);
  }

  // Immediate callback with current state
  try {
    listener({ url, connected: entry.connected, attempts: entry.attempts });
  } catch {}

  return () => {
    const entry = registry.get(url);
    if (!entry) return;
    entry.stateListeners.delete(listener);
  };
}
