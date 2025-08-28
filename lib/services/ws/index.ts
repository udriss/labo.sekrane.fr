// WebSocket Manager - Refactored into modules
// Simple singleton WebSocket manager to prevent repeated rapid connect/disconnect loops in dev
// Keeps exactly one WebSocket per URL and allows multiple listeners.

export {
  attachWebSocketManager,
  getWebSocketState,
  forceCloseWebSocket,
  onWebSocketState,
} from './registry';

export type { WSDataListener, WSStateListener, ManagerOptions, ManagedEntry } from './types';
