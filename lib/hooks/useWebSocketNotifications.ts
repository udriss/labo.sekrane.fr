// lib/hooks/useWebSocketNotifications.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';

interface WebSocketMessage {
  id: string;
  type: 'notification' | 'heartbeat' | 'connection' | 'error';
  userId?: string;
  userRole?: string;
  module: string;
  actionType: string;
  message: string | object;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entityType?: string;
  entityId?: string;
  triggeredBy?: string;
  timestamp: string;
  data?: any;
}

interface WebSocketNotification {
  id: string;
  message: string | object;
  severity: 'low' | 'medium' | 'high' | 'critical';
  module: string;
  actionType: string;
  timestamp: string;
  createdAt?: string; // Ajouter pour compatibilité avec ExtendedNotification
  entityType?: string;
  entityId?: string;
  triggeredBy?: string;
  isRead: boolean;
}

interface UseWebSocketNotificationsOptions {
  onNotification?: (notification: WebSocketNotification) => void;
  onConnected?: () => void;
  onError?: (error: string) => void;
  onReconnect?: () => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocketNotifications(options: UseWebSocketNotificationsOptions = {}) {
  const {
    onNotification,
    onConnected,
    onError,
    onReconnect,
    autoReconnect = true,
    reconnectDelay = 5000,
    maxReconnectAttempts = 5
  } = options;

  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const callbackRefs = useRef({ onNotification, onConnected, onError, onReconnect });
  useEffect(() => {
    callbackRefs.current = { onNotification, onConnected, onError, onReconnect };
  }, [onNotification, onConnected, onError, onReconnect]);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  
  // Charger les notifications depuis la base de données
  const loadDatabaseNotifications = useCallback(async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      console.log('🔄 [WebSocket] Loading database notifications for user:', userId);
      
      const response = await fetch(`/api/notifications?userId=${userId}`);
      console.log('📡 [WebSocket] API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 [WebSocket] Loaded notifications:', data);
        
        if (data.success && Array.isArray(data.notifications)) {
          // Convertir les notifications de la base de données au format WebSocketNotification
          const dbNotifications: WebSocketNotification[] = data.notifications.map((dbNotif: any) => ({
            id: dbNotif.id,
            message: dbNotif.message,
            severity: dbNotif.severity,
            module: dbNotif.module,
            actionType: dbNotif.actionType || dbNotif.action_type,
            timestamp: dbNotif.createdAt || dbNotif.created_at,
            createdAt: dbNotif.createdAt || dbNotif.created_at,
            entityType: dbNotif.entityType || dbNotif.entity_type,
            entityId: dbNotif.entityId || dbNotif.entity_id,
            triggeredBy: dbNotif.triggeredBy || dbNotif.triggered_by,
            isRead: !!dbNotif.isRead
          }));
          
          console.log('📋 [WebSocket] Converted notifications:', dbNotifications);
          
          // Fusionner avec les notifications WebSocket existantes
          setNotifications(prev => {
            // Créer un Map pour éviter les doublons (par ID)
            const notifMap = new Map(prev.map(n => [n.id, n]));
            dbNotifications.forEach(n => {
              if (!notifMap.has(n.id)) {
                notifMap.set(n.id, n);
              }
            });
            // Convertir le Map en tableau et trier par date (plus récent d'abord)
            return Array.from(notifMap.values())
              .sort((a, b) => new Date(b.timestamp || b.createdAt || '').getTime() - new Date(a.timestamp || a.createdAt || '').getTime());
          });
        } else {
          console.warn('⚠️ [WebSocket] API returned success=false or no notifications array');
        }
      } else {
        console.error('❌ [WebSocket] Failed to fetch notifications:', await response.text());
      }
    } catch (err) {
      console.error('❌ [WebSocket] Error loading database notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent onclose from firing on manual disconnect
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(async () => {
    if (!userId) {
        setIsLoading(false);
        return;
    }

    if (wsRef.current && wsRef.current.readyState < 2) { // 0=CONNECTING, 1=OPEN
        return;
    }

    // Disconnect any existing connection before creating a new one
    disconnect();

    // Charger les notifications de la base de données d'abord
    await loadDatabaseNotifications();

    try {
      console.log(`🔄 [WebSocket] Attempting to connect for user ${userId}...`);
      setIsLoading(true);
      setError(null);
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = process.env.NODE_ENV === 'production' 
        ? (window.location.port || (protocol === 'wss:' ? '443' : '80'))
        : '3000';
      const wsUrl = `${protocol}//${host}:${port}/api/notifications/ws?userId=${userId}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ [WebSocket] Connection established');
        setIsConnected(true);
        setIsLoading(false);
        reconnectAttemptsRef.current = 0;
        callbackRefs.current.onConnected?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: any = JSON.parse(event.data);
          
          if (message.type === 'heartbeat') {
            setLastHeartbeat(new Date());
            return; // Process silently
          }

          console.log('📨 [WebSocket] Message received:', message);

          switch (message.type) {
            case 'notification':
              const newNotification: WebSocketNotification = { ...message.data, isRead: false, createdAt: message.timestamp };
              setNotifications(prev => [newNotification, ...prev]);
              callbackRefs.current.onNotification?.(newNotification);
              break;
            case 'error':
              console.error('❌ [WebSocket] Server error:', message.message);
              setError(message.message);
              callbackRefs.current.onError?.(message.message);
              break;
          }
        } catch (e) {
          console.error('❌ [WebSocket] Error parsing message:', e);
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 [WebSocket] Connection closed: ${event.code}`);
        setIsConnected(false);
        setIsLoading(false);
        wsRef.current = null;

        if (event.code !== 1000 && autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(30000, reconnectDelay * Math.pow(2, reconnectAttemptsRef.current));
          console.log(`🔄 [WebSocket] Reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
      };

      ws.onerror = (err) => {
        console.error('❌ [WebSocket] Connection error:', err);
        setError('WebSocket connection failed.');
        setIsLoading(false);
      };

    } catch (err) {
      console.error('❌ [WebSocket] Connection setup failed:', err);
      setError('Failed to initialize WebSocket.');
      setIsLoading(false);
    }
  }, [userId, autoReconnect, maxReconnectAttempts, reconnectDelay, disconnect]);

  const reconnect = useCallback(() => {
    console.log('🔄 [WebSocket] Manual reconnect triggered.');
    reconnectAttemptsRef.current = 0; // Reset attempts for manual reconnect
    connect();
  }, [connect]);

  useEffect(() => {
    if (status === 'authenticated') {
      connect();
    } else if (status === 'unauthenticated') {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [status, connect, disconnect]);

  // Créer un effet pour recharger périodiquement les notifications de la base de données
  useEffect(() => {
    if (!userId) return;
    
    // Charger les notifications au montage
    console.log('🔄 [WebSocket] Initial database load triggered for user:', userId);
    loadDatabaseNotifications();
    
    // Charger les notifications toutes les 30 secondes
    const intervalId = setInterval(() => {
      console.log('🔄 [WebSocket] Periodic database refresh triggered');
      loadDatabaseNotifications();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [userId, loadDatabaseNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    // Mettre à jour l'état local
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    
    // Envoyer la requête à l'API pour marquer comme lu dans la base de données
    if (userId) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'markAsRead', notificationId })
        });
      } catch (error) {
        console.error('❌ [WebSocket] Error marking notification as read:', error);
      }
    }
  }, [userId]);

  const markAllAsRead = useCallback(async () => {
    // Mettre à jour l'état local
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    
    // Envoyer la requête à l'API pour marquer toutes comme lues dans la base de données
    if (userId) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'markAllAsRead' })
        });
      } catch (error) {
        console.error('❌ [WebSocket] Error marking all notifications as read:', error);
      }
    }
  }, [userId]);

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const stats = {
    totalNotifications: notifications.length,
    unreadNotifications: notifications.filter(n => !n.isRead).length,
    notificationsByModule: notifications.reduce((acc, notif) => {
      acc[notif.module] = (acc[notif.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    notificationsBySeverity: notifications.reduce((acc, notif) => {
      acc[notif.severity] = (acc[notif.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  return {
    isConnected,
    isLoading,
    error,
    lastHeartbeat,
    notifications,
    stats,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearNotifications,
    sendMessage,
    reconnect,
    loadDatabaseNotifications,
  };
}
