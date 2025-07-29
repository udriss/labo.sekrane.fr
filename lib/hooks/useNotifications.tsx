// /lib/hooks/useNotifications.tsx

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface NotificationMessage {
  type: 'notification' | 'connected' | 'heartbeat';
  userId?: string;
  data?: any;
  timestamp?: number;
}

interface UseNotificationsOptions {
  userId: string;
  onNotification?: (notification: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

interface UseNotificationsReturn {
  isConnected: boolean;
  notifications: any[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastHeartbeat: number | null;
  reconnect: () => void;
  disconnect: () => void;
  clearNotifications: () => void;
}

export function useNotifications({
  userId,
  onNotification,
  onConnect,
  onDisconnect,
  onError,
  autoReconnect = true,
  reconnectInterval = 5000
}: UseNotificationsOptions): UseNotificationsReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    isManualDisconnectRef.current = false;

    try {
      const eventSource = new EventSource(`/api/notifications/ws?userId=${encodeURIComponent(userId)}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setConnectionStatus('connected');
        setIsConnected(true);
        onConnect?.();
        
        // Clear any pending reconnection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const message: NotificationMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              console.log('Connected to notifications for user:', message.userId);
              break;
              
            case 'notification':
              console.log('Received notification:', message.data);
              setNotifications(prev => [message.data, ...prev]);
              onNotification?.(message.data);
              break;
              
            case 'heartbeat':
              setLastHeartbeat(message.timestamp || Date.now());
              break;
              
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setConnectionStatus('error');
        setIsConnected(false);
        onError?.(error);

        // Auto-reconnect if not manually disconnected
        if (autoReconnect && !isManualDisconnectRef.current) {
          console.log(`Attempting to reconnect in ${reconnectInterval}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

    } catch (error) {
      console.error('Error creating EventSource:', error);
      setConnectionStatus('error');
      setIsConnected(false);
    }
  }, [userId, onNotification, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    setLastHeartbeat(null);
    onDisconnect?.();
  }, [onDisconnect]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 100);
  }, [connect, disconnect]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Connect on mount and when userId changes
  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    notifications,
    connectionStatus,
    lastHeartbeat,
    reconnect,
    disconnect,
    clearNotifications
  };
}