import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock WebSocket
class MockWebSocket {
  public readyState: number = WebSocket.CONNECTING;
  public url: string;
  private listeners: { [key: string]: Function[] } = {};

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.dispatchEvent('open', {});
    }, 10);
  }

  addEventListener(event: string, listener: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
  }

  removeEventListener(event: string, listener: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
    }
  }

  send(data: any) {
    if (this.readyState !== WebSocket.OPEN) throw new Error('WebSocket not open');
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.dispatchEvent('close', {});
  }

  dispatchEvent(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((listener) => listener(data));
    }
  }

  simulateMessage(data: any) {
    this.dispatchEvent('message', { data: JSON.stringify(data) });
  }

  simulateError() {
    this.dispatchEvent('error', {});
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;
Object.assign(global.WebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

describe('WebSocket Manager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should validate basic imports', async () => {
    const { attachWebSocketManager } = await import('@/lib/services/ws');
    expect(typeof attachWebSocketManager).toBe('function');
  });
});
