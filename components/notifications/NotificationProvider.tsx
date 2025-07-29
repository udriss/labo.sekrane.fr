// /components/notifications/NotificationProvider.tsx

'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { toast } from 'react-hot-toast'; // ou votre système de toast préféré

interface NotificationContextType {
  isConnected: boolean;
  notifications: any[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastHeartbeat: number | null;
  reconnect: () => void;
  disconnect: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  userId: string;
  showToasts?: boolean;
}

export function NotificationProvider({ 
  children, 
  userId, 
  showToasts = true 
}: NotificationProviderProps) {
  const handleNotification = useCallback((notification: any) => {
    console.log('New notification received:', notification);
    
    if (showToasts) {
      // Afficher un toast selon le type de notification
      switch (notification.type) {
        case 'success':
          toast.success(notification.message || notification.title);
          break;
        case 'error':
          toast.error(notification.message || notification.title);
          break;
        case 'warning':
          toast(notification.message || notification.title, {
            icon: '⚠️',
          });
          break;
        default:
          toast(notification.message || notification.title);
      }
    }

    // Vous pouvez ajouter d'autres actions ici :
    // - Jouer un son
    // - Afficher une notification système
    // - Mettre à jour un badge de compteur
    // - etc.
  }, [showToasts]);

  const handleConnect = useCallback(() => {
    console.log('Connected to notification service');
    if (showToasts) {
      toast.success('Connecté aux notifications en temps réel');
    }
  }, [showToasts]);

  const handleDisconnect = useCallback(() => {
    console.log('Disconnected from notification service');
    if (showToasts) {
      toast.error('Déconnecté des notifications en temps réel');
    }
  }, [showToasts]);

  const handleError = useCallback((error: Event) => {
    console.error('Notification service error:', error);
    if (showToasts) {
      toast.error('Erreur de connexion aux notifications');
    }
  }, [showToasts]);

  const notificationHook = useNotifications({
    userId,
    onNotification: handleNotification,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError,
    autoReconnect: true,
    reconnectInterval: 5000
  });

  return (
    <NotificationContext.Provider value={notificationHook}>
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