// /components/notifications/NotificationProvider.tsx

'use client';

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast'; // ou votre système de toast préféré
import { ExtendedNotification } from '@/types/notifications';

interface NotificationContextType {
  isConnected: boolean;
  notifications: ExtendedNotification[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastHeartbeat: number | null;
  reconnect: () => void;
  disconnect: () => void;
  clearNotifications: () => void;
  // Propriétés du hook useNotifications
  stats: any;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  fetchNotifications: (filters?: any) => Promise<void>;
  fetchStats: (filters?: any) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  showToasts?: boolean;
}

export function NotificationProvider({ 
  children, 
  showToasts = true 
}: NotificationProviderProps) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Utiliser le hook useNotifications standard
  const notificationHook = useNotifications();
  const handleNotification = useCallback((notification: ExtendedNotification) => {
    
    
    if (showToasts) {
      // Afficher un toast selon la sévérité
      switch (notification.severity) {
        case 'critical':
        case 'high':
          toast.error(typeof notification.message === 'string' ? notification.message : notification.message.fr || 'Notification');
          break;
        case 'medium':
          toast(typeof notification.message === 'string' ? notification.message : notification.message.fr || 'Notification', {
            icon: '⚠️',
          });
          break;
        default:
          toast(typeof notification.message === 'string' ? notification.message : notification.message.fr || 'Notification');
      }
    }
  }, [showToasts]);

  const handleConnect = useCallback(() => {
    
    setIsConnected(true);
    setConnectionStatus('connected');
    if (showToasts) {
      toast.success('Connecté aux notifications en temps réel');
    }
  }, [showToasts]);

  const handleDisconnect = useCallback(() => {
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    if (showToasts) {
      toast.error('Déconnecté des notifications en temps réel');
    }
  }, [showToasts]);

  const handleError = useCallback((error: Event) => {
    console.error('Notification service error:', error);
    setConnectionStatus('error');
    if (showToasts) {
      toast.error('Erreur de connexion aux notifications');
    }
  }, [showToasts]);

  // Gérer la connexion SSE comme dans NavbarLIMS
  useEffect(() => {
    if (!session?.user) return;

    const userId = (session.user as any).id;
    
    const connectSSE = () => {
      try {
        setConnectionStatus('connecting');
        
        // Fermer la connexion existante si elle existe
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        // Créer une nouvelle connexion SSE
        const eventSource = new EventSource(`/api/notifications/ws?userId=${encodeURIComponent(userId)}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          handleConnect();
        };

        eventSource.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
              case 'connected':
                
                break;
                
              case 'notification':
                if (message.data) {
                  handleNotification(message.data);
                }
                break;
                
              case 'heartbeat':
                setLastHeartbeat(message.timestamp || Date.now());
                break;
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          handleError(error);
          
          // Tentative de reconnexion après 5 secondes
          setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              
              connectSSE();
            }
          }, 5000);
        };

      } catch (error) {
        console.error('Error creating EventSource:', error);
        setConnectionStatus('error');
      }
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [session, handleConnect, handleDisconnect, handleError, handleNotification]);

  const reconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    // La reconnexion se fera automatiquement via l'useEffect
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const clearNotifications = useCallback(() => {
    // Cette fonction pourrait vider le cache local si nécessaire
    
  }, []);

  const contextValue: NotificationContextType = {
    // États de connexion
    isConnected,
    connectionStatus,
    lastHeartbeat,
    reconnect,
    disconnect,
    clearNotifications,
    // Propriétés du hook useNotifications
    notifications: notificationHook.notifications,
    stats: notificationHook.stats,
    loading: notificationHook.loading,
    error: notificationHook.error,
    hasMore: notificationHook.hasMore,
    total: notificationHook.total,
    fetchNotifications: notificationHook.fetchNotifications,
    fetchStats: notificationHook.fetchStats,
    markAsRead: notificationHook.markAsRead,
    markAllAsRead: notificationHook.markAllAsRead,
    refresh: notificationHook.refresh,
    loadMore: notificationHook.loadMore,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
