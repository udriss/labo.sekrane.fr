// DEPRECATED: This file has been refactored into modules under ./ws/
// Use: import { attachWebSocketManager } from './ws';

export {
  attachWebSocketManager,
  getWebSocketState,
  forceCloseWebSocket,
  onWebSocketState,
} from './ws';

export type { WSDataListener, WSStateListener, ManagerOptions } from './ws';
