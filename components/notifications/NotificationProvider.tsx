// components/notifications/NotificationProvider.tsx
'use client';

import React, { createContext, useContext } from 'react';
import { useWebSocketNotifications } from '@/lib/hooks/useWebSocketNotifications';
import { toast } from 'react-hot-toast';

interface WebSocketNotification {
  id: string;
  message: string | object;
  severity: 'low' | 'medium' | 'high' | 'critical';
  module: string;
  actionType: string;
  timestamp: string;
  entityType?: string;
  entityId?: string;
  triggeredBy?: string;
  isRead: boolean;
}

interface NotificationContextType {
  // État de connexion
  isConnected: boolean;
  lastHeartbeat: Date | null;
  
  // Notifications
  notifications: WebSocketNotification[];
  stats: {
    totalNotifications: number;
    unreadNotifications: number;
    notificationsByModule: Record<string, number>;
    notificationsBySeverity: Record<string, number>;
  };
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  clearNotification: (notificationId: string) => void;
  sendMessage: (message: any) => boolean;
  loadDatabaseNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  showToasts?: boolean;
  toastPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NotificationProvider({ 
  children, 
  showToasts = true,
  toastPosition = 'top-right'
}: NotificationProviderProps) {
  
  const handleNotification = React.useCallback((notification: WebSocketNotification) => {
    
    
    if (showToasts) {
      // Extraire le message pour l'affichage
      const message = typeof notification.message === 'string' 
        ? notification.message 
        : (notification.message as any)?.fr || 'Notification';
        
      // Afficher un toast selon la sévérité
      const toastOptions = {
        position: toastPosition as any,
        duration: notification.severity === 'critical' ? 8000 : 
                notification.severity === 'high' ? 6000 :
                notification.severity === 'medium' ? 4000 : 3000
      };

      switch (notification.severity) {
        case 'critical':
          toast.error(`🚨 ${message}`, toastOptions);
          break;
        case 'high':
          toast.error(`⚠️ ${message}`, toastOptions);
          break;
        case 'medium':
          toast(`⚠️ ${message}`, { ...toastOptions, icon: '⚠️' });
          break;
        default:
          toast.success(`📢 ${message}`, toastOptions);
      }
    }
  }, [showToasts, toastPosition]);

  const webSocketHook = useWebSocketNotifications({
    onNotification: handleNotification,
    onConnected: () => {
      
      if (showToasts) {
        toast.success('🔔 Connecté aux notifications en temps réel', {
          position: toastPosition as any,
          duration: 2000
        });
      }
    },
    onError: (error: string) => {
      console.error('❌ [NotificationProvider] Erreur WebSocket:', error);
      if (showToasts) {
        toast.error(`❌ ${error}`, {
          position: toastPosition as any,
          duration: 4000
        });
      }
    },
    onReconnect: () => {
      
      if (showToasts) {
        toast('🔄 Reconnexion aux notifications...', {
          position: toastPosition as any,
          duration: 2000
        });
      }
    }
  });

  const contextValue: NotificationContextType = {
    isConnected: webSocketHook.isConnected,
    lastHeartbeat: webSocketHook.lastHeartbeat,
    notifications: webSocketHook.notifications,
    stats: webSocketHook.stats,
    connect: webSocketHook.connect,
    disconnect: webSocketHook.disconnect,
    reconnect: webSocketHook.reconnect,
    markAsRead: webSocketHook.markAsRead,
    markAllAsRead: webSocketHook.markAllAsRead,
    clearNotifications: webSocketHook.clearNotifications,
    clearNotification: webSocketHook.clearNotification,
    sendMessage: webSocketHook.sendMessage,
    loadDatabaseNotifications: webSocketHook.loadDatabaseNotifications
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
