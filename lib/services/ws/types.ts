export type WSDataListener = (data: any) => void;
export type WSStateListener = (state: {
  url: string;
  connected: boolean;
  attempts: number;
}) => void;

export interface ManagerOptions {
  url: string;
  heartbeatMs?: number;
  minReconnectMs?: number;
  maxReconnectMs?: number;
  debug?: boolean;
}

export interface ManagedEntry {
  url: string;
  socket: WebSocket | null;
  listeners: Set<WSDataListener>;
  stateListeners: Set<WSStateListener>;
  connected: boolean;
  manual: boolean; // intentionally closed
  reconnectTimer: number | null;
  heartbeatTimer: number | null;
  backoff: number;
  attempts: number;
  opts: Required<
    Pick<ManagerOptions, 'heartbeatMs' | 'minReconnectMs' | 'maxReconnectMs' | 'debug'>
  >;
}

export const DEFAULT_OPTIONS = {
  heartbeatMs: 30000, // Augmenté de 20s à 30s
  minReconnectMs: 5000, // Augmenté de 2s à 5s
  maxReconnectMs: 30000, // Augmenté de 15s à 30s
  debug: false,
};
