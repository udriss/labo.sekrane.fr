'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: number;
  user_id: number;
  module: string;
  action_type: string;
  severity: string;
  message: any;
  created_at: string;
  read_at?: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

/**
 * Hook personnalisé pour gérer les notifications
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculer le nombre de notifications non lues
  const unreadCount = notifications.filter(n => !n.read_at).length;

  /**
   * Charger les notifications depuis l'API
   */
  const refreshNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur lors du chargement des notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Marquer une notification comme lue
   */
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      // Mettre à jour l'état local
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read_at: new Date().toISOString() }
            : notification
        )
      );
    } catch (err) {
      console.error('Erreur lors du marquage comme lu:', err);
      // Ne pas afficher d'erreur à l'utilisateur pour cette action
    }
  }, []);

  /**
   * Marquer toutes les notifications comme lues
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      // Mettre à jour l'état local
      const now = new Date().toISOString();
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          read_at: notification.read_at || now 
        }))
      );
    } catch (err) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', err);
      // Ne pas afficher d'erreur à l'utilisateur pour cette action
    }
  }, []);

  // Charger les notifications au montage du composant
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  };
}

/**
 * Hook pour écouter les notifications en temps réel via WebSocket
 */
export function useNotificationWebSocket(onNewNotification?: (notification: Notification) => void) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connecté pour les notifications');
          setConnected(true);
          setError(null);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification' && onNewNotification) {
              onNewNotification(data.notification);
            }
          } catch (err) {
            console.error('Erreur lors du parsing du message WebSocket:', err);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket fermé');
          setConnected(false);
          
          // Tentative de reconnexion après 5 secondes
          reconnectTimeout = setTimeout(() => {
            console.log('Tentative de reconnexion WebSocket...');
            connect();
          }, 5000);
        };

        ws.onerror = (error) => {
          console.error('Erreur WebSocket:', error);
          setError('Erreur de connexion WebSocket');
        };

      } catch (err) {
        console.error('Erreur lors de la création de la connexion WebSocket:', err);
        setError('Impossible de se connecter au WebSocket');
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [onNewNotification]);

  return { connected, error };
}

/**
 * Hook combiné pour notifications avec WebSocket
 */
export function useNotificationsWithWebSocket(): UseNotificationsReturn & { wsConnected: boolean; wsError: string | null } {
  const notificationsHook = useNotifications();
  
  const handleNewNotification = useCallback((newNotification: Notification) => {
    // Ajouter la nouvelle notification en tête de liste
    notificationsHook.refreshNotifications();
  }, [notificationsHook]);

  const { connected: wsConnected, error: wsError } = useNotificationWebSocket(handleNewNotification);

  return {
    ...notificationsHook,
    wsConnected,
    wsError,
  };
}
