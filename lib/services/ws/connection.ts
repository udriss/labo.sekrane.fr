import { ManagedEntry } from './types';
import { debugLog, notifyStateListeners, notifyDataListeners } from './utils';

export function scheduleReconnect(entry: ManagedEntry) {
  if (entry.manual) return;
  if (entry.reconnectTimer) return;

  const delay =
    Math.min(entry.backoff, entry.opts.maxReconnectMs) +
    Math.floor(Math.random() * 0.3 * entry.backoff);

  debugLog(entry, 'reconnect in', delay);

  entry.reconnectTimer = window.setTimeout(() => {
    entry.reconnectTimer = null;
    entry.backoff = Math.min(entry.backoff * 2, entry.opts.maxReconnectMs);
    entry.attempts += 1;
    openConnection(entry);
  }, delay) as unknown as number;
}

export function openConnection(entry: ManagedEntry) {
  if (
    entry.socket &&
    (entry.socket.readyState === WebSocket.OPEN || entry.socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  entry.manual = false;

  try {
    const ws = new WebSocket(entry.url);
    entry.socket = ws;
    if (typeof window !== 'undefined') {
      (window as any).__WS_DEBUG_SOCKETS__ = (window as any).__WS_DEBUG_SOCKETS__ || {};
      (window as any).__WS_DEBUG_SOCKETS__[entry.url] = ws;
    }

    debugLog(entry, 'connecting', entry.url);

    setupEventListeners(entry, ws);
  } catch (error) {
    // Fallback: si on tente ws://localhost en contexte https d'un autre host -> reconstruire URL wss sur host courant
    try {
      const loc = typeof window !== 'undefined' ? window.location : null;
      if (loc && loc.protocol === 'https:' && /ws:\/\/localhost/i.test(entry.url)) {
        const urlObj = new URL(entry.url.replace(/^ws:\/\//i, 'http://'));
        const newUrl = `wss://${loc.host}${urlObj.pathname}${urlObj.search}`;
        if (!(window as any).__WS_FALLBACK_WARNED__) {
          (window as any).__WS_FALLBACK_WARNED__ = true;
          console.warn(
            '[ws][fallback] Insecure ws://localhost bloqué sous HTTPS -> remplacement par',
            newUrl,
          );
        }
        entry.url = newUrl;
        const ws2 = new WebSocket(newUrl);
        entry.socket = ws2;
        debugLog(entry, 'fallback-connect', newUrl);
        setupEventListeners(entry, ws2);
        return;
      }
    } catch {}
    scheduleReconnect(entry);
  }
}

function setupEventListeners(entry: ManagedEntry, ws: WebSocket) {
  ws.addEventListener('open', () => handleOpen(entry, ws));
  ws.addEventListener('message', (evt) => handleMessage(entry, evt));
  ws.addEventListener('close', () => handleClose(entry));
  ws.addEventListener('error', () => handleError(entry, ws));
}

function handleOpen(entry: ManagedEntry, ws: WebSocket) {
  entry.connected = true;
  entry.backoff = entry.opts.minReconnectMs;
  entry.attempts = 0;

  debugLog(entry, 'open', entry.url);
  notifyStateListeners(entry);

  // Clear existing heartbeat timer
  if (entry.heartbeatTimer) {
    window.clearInterval(entry.heartbeatTimer);
  }

  // Setup heartbeat
  entry.heartbeatTimer = window.setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send('ping');
      } catch (error) {
        // Silent heartbeat failure
      }
    }
  }, entry.opts.heartbeatMs) as unknown as number;
}

function handleMessage(entry: ManagedEntry, evt: MessageEvent) {
  let parsed: any = null;
  try {
    parsed = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;
  } catch {
    parsed = evt.data;
  }

  notifyDataListeners(entry, parsed);
}

function handleClose(entry: ManagedEntry) {
  entry.connected = false;
  if (typeof window !== 'undefined') {
    try {
      delete (window as any).__WS_DEBUG_SOCKETS__?.[entry.url];
    } catch {}
  }

  if (entry.heartbeatTimer) {
    window.clearInterval(entry.heartbeatTimer);
    entry.heartbeatTimer = null;
  }

  debugLog(entry, 'close', entry.url, 'manual?', entry.manual);
  notifyStateListeners(entry);

  if (!entry.manual) {
    scheduleReconnect(entry);
  }
}

function handleError(entry: ManagedEntry, ws: WebSocket) {
  try {
    if (ws.readyState < WebSocket.CLOSING) {
      ws.close();
    }
  } catch (error) {
    // Silent error handling
  }
}
