import { ManagedEntry } from './types';

export function debugLog(entry: ManagedEntry | { debug?: boolean }, ...args: any[]) {
  if ('opts' in entry) {
    if (entry.opts.debug) console.log('[WS-MGR]', ...args);
  } else if (entry.debug) {
    console.log('[WS-MGR]', ...args);
  }
}

export function notifyStateListeners(entry: ManagedEntry) {
  const state = { url: entry.url, connected: entry.connected, attempts: entry.attempts };
  entry.stateListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      // Silent error handling for listeners
    }
  });
}

export function notifyDataListeners(entry: ManagedEntry, data: any) {
  entry.listeners.forEach((listener) => {
    try {
      listener(data);
    } catch (error) {
      // Silent error handling for listeners
    }
  });
}
