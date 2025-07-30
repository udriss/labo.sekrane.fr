// lib/hooks/useNotificationSSE.ts

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';

interface SSEMessage {
  type: 'connected' | 'heartbeat' | 'notification' | 'error';
  timestamp: string;
  data?: any;
  userId?: string;
}

interface UseNotificationSSEOptions {
  onNotification?: (notification: any) => void;
  onConnected?: () => void;
  onError?: (error: string) => void;
  onReconnect?: () => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

export function useNotificationSSE({
  onNotification,
  onConnected,
  onError,
  onReconnect,
  autoReconnect = true,
  reconnectDelay = 5000
}: UseNotificationSSEOptions = {}) {
  const { data: session, status } = useSession();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (status !== 'authenticated' || !session?.user) {
      console.log('🔄 [SSE Hook] Utilisateur non authentifié, pas de connexion SSE');
      return;
    }

    if (eventSourceRef.current) {
      console.log('🔄 [SSE Hook] Connexion SSE déjà active');
      return;
    }

    try {
      console.log('🔄 [SSE Hook] Tentative de connexion SSE...');
      
      const eventSource = new EventSource('/api/notifications/ws');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ [SSE Hook] Connexion SSE établie');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnected?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          console.log('📨 [SSE Hook] Message reçu:', message.type);

          switch (message.type) {
            case 'connected':
              console.log('✅ [SSE Hook] Connexion confirmée pour utilisateur:', message.userId);
              break;
            
            case 'heartbeat':
              // Heartbeat silencieux
              break;
            
            case 'notification':
              console.log('🔔 [SSE Hook] Nouvelle notification reçue:', message.data);
              onNotification?.(message.data);
              break;
            
            default:
              console.log('📨 [SSE Hook] Message non géré:', message.type);
          }
        } catch (error) {
          console.error('❌ [SSE Hook] Erreur parsing message SSE:', error);
          onError?.('Erreur lors du traitement d\'un message SSE');
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ [SSE Hook] Erreur connexion SSE:', error);
        setIsConnected(false);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('🔄 [SSE Hook] Connexion SSE fermée par le serveur');
        }

        // Nettoyer la connexion actuelle
        eventSourceRef.current = null;
        eventSource.close();

        // Tentative de reconnexion automatique
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1); // Backoff exponentiel
          
          console.log(`🔄 [SSE Hook] Tentative de reconnexion ${reconnectAttemptsRef.current}/${maxReconnectAttempts} dans ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            onReconnect?.();
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('❌ [SSE Hook] Nombre maximum de tentatives de reconnexion atteint');
          onError?.('Impossible de se reconnecter au système de notifications');
        }
      };

    } catch (error) {
      console.error('❌ [SSE Hook] Erreur lors de la création de la connexion SSE:', error);
      onError?.('Erreur lors de la connexion au système de notifications');
    }
  }, [session, status, onNotification, onConnected, onError, onReconnect, autoReconnect, reconnectDelay]);

  const disconnect = useCallback(() => {
    console.log('🔄 [SSE Hook] Fermeture de la connexion SSE');
    
    // Nettoyer le timeout de reconnexion
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Fermer la connexion EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    console.log('🔄 [SSE Hook] Reconnexion manuelle');
    disconnect();
    setTimeout(connect, 1000); // Délai court pour la reconnexion manuelle
  }, [disconnect, connect]);

  // Établir la connexion au montage et quand l'utilisateur s'authentifie
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      connect();
    }

    // Nettoyer au démontage
    return () => {
      disconnect();
    };
  }, [status, session?.user]); // Ne pas inclure connect/disconnect pour éviter les boucles

  // Nettoyer au démontage du composant
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    reconnect
  };
}
