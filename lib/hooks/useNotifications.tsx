import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ExtendedNotification, NotificationStats, NotificationFilter } from '@/types/notifications';
import { useNotificationSSE } from './useNotificationSSE';

interface UseNotificationsResult {
  notifications: ExtendedNotification[];
  stats: NotificationStats | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  // Actions
  fetchNotifications: (filters?: NotificationFilter) => Promise<void>;
  fetchStats: (filters?: Partial<NotificationFilter>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  // SSE Properties
  isSSEConnected: boolean;
  reconnectSSE: () => void;
}

interface NotificationsResponse {
  success: boolean;
  notifications: ExtendedNotification[];
  total: number;
  hasMore: boolean;
  userInfo?: {
    userId: string;
    userRole: string;
    userEmail: string;
  };
}

interface StatsResponse {
  success: boolean;
  stats?: NotificationStats;
  userInfo?: {
    userId: string;
    userRole: string;
    userEmail: string;
  };
  error?: string;
  details?: string;
}

export function useNotifications(initialFilters: NotificationFilter = {}): UseNotificationsResult {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<NotificationFilter>(initialFilters);

  // Refs pour éviter les appels multiples
  const fetchingRef = useRef(false);
  const fetchingStatsRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fonction utilitaire pour valider une notification
  const validateNotification = (notification: any): notification is ExtendedNotification => {
    if (!notification || typeof notification !== 'object') {
      console.warn('Notification invalide (null ou non-objet):', notification);
      return false;
    }

    const requiredFields = ['id', 'userId', 'role', 'module', 'actionType', 'createdAt', 'severity'];
    const missingFields = requiredFields.filter(field => !notification[field]);
    
    if (missingFields.length > 0) {
      console.warn('Notification avec champs manquants:', missingFields, notification);
      return false;
    }

    // Vérifier que isRead existe et est un boolean
    if (typeof notification.isRead !== 'boolean') {
      console.warn('Notification avec isRead invalide:', notification.isRead, notification);
      // Corriger automatiquement
      notification.isRead = false;
    }

    return true;
  };

  // Fonction utilitaire pour nettoyer les notifications
  const sanitizeNotifications = (rawNotifications: any[]): ExtendedNotification[] => {
    if (!Array.isArray(rawNotifications)) {
      console.error('Les notifications reçues ne sont pas un tableau:', rawNotifications);
      return [];
    }

    return rawNotifications
      .filter(validateNotification)
      .map(notification => ({
        ...notification,
        // S'assurer que tous les champs requis existent avec des valeurs par défaut
        isRead: notification.isRead === true,
        message: notification.message || { fr: 'Message non disponible', en: 'Message not available' },
        details: notification.details || '',
        reason: notification.reason || 'role',
        severity: notification.severity || 'medium'
      }));
  };

  // Fonction utilitaire pour valider les stats
  const validateStats = (stats: any): NotificationStats => {
    if (!stats || typeof stats !== 'object') {
      console.warn('Stats invalides reçues:', stats);
      return {
        total: 0,
        unread: 0,
        byModule: {},
        bySeverity: {},
        byReason: {}
      };
    }

    return {
      total: typeof stats.total === 'number' ? stats.total : 0,
      unread: typeof stats.unread === 'number' ? stats.unread : 0,
      byModule: stats.byModule && typeof stats.byModule === 'object' ? stats.byModule : {},
      bySeverity: stats.bySeverity && typeof stats.bySeverity === 'object' ? stats.bySeverity : {},
      byReason: stats.byReason && typeof stats.byReason === 'object' ? stats.byReason : {}
    };
  };

  // Récupérer les notifications avec protection contre les appels multiples
  const fetchNotifications = useCallback(async (filters: NotificationFilter = {}) => {
    if (status === 'loading' || !session?.user || fetchingRef.current) {
      return;
    }

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Créer un nouveau AbortController
    abortControllerRef.current = new AbortController();
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const user = session.user as any;
      
      // Construire les paramètres de requête
      const params = new URLSearchParams();
      
      // Ajouter les filtres
      const mergedFilters = { ...currentFilters, ...filters };
      
      if (mergedFilters.limit) params.append('limit', mergedFilters.limit.toString());
      if (mergedFilters.offset) params.append('offset', mergedFilters.offset.toString());
      if (mergedFilters.module) params.append('module', mergedFilters.module);
      if (mergedFilters.severity) params.append('severity', mergedFilters.severity);
      if (mergedFilters.isRead !== undefined) params.append('isRead', mergedFilters.isRead.toString());
      if (mergedFilters.dateFrom) params.append('dateFrom', mergedFilters.dateFrom);
      if (mergedFilters.dateTo) params.append('dateTo', mergedFilters.dateTo);
      if (mergedFilters.entityType) params.append('entityType', mergedFilters.entityType);
      if (mergedFilters.entityId) params.append('entityId', mergedFilters.entityId);

      

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorData}`);
      }

      const data: NotificationsResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Réponse API indique un échec');
      }

      console.log('✅ [Hook] Données reçues:', {
        count: data.notifications?.length || 0,
        total: data.total,
        hasMore: data.hasMore
      });

      // Nettoyer et valider les notifications
      const cleanNotifications = sanitizeNotifications(data.notifications || []);
      
      // Mettre à jour l'état selon le mode (nouveau fetch ou load more)
      if (mergedFilters.offset && mergedFilters.offset > 0) {
        // Load more - ajouter aux notifications existantes
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newNotifications = cleanNotifications.filter(n => !existingIds.has(n.id));
          return [...prev, ...newNotifications];
        });
      } else {
        // Nouveau fetch - remplacer les notifications
        setNotifications(cleanNotifications);
      }

      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
      setCurrentFilters(mergedFilters);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        
        return;
      }
      console.error('❌ [Hook] Erreur lors de la récupération des notifications:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setNotifications([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [session, status]); // Dépendances minimales

  // Récupérer les statistiques avec protection contre les appels multiples
  const fetchStats = useCallback(async (filters: Partial<NotificationFilter> = {}) => {
    if (status === 'loading' || !session?.user || fetchingStatsRef.current) {
      return;
    }

    fetchingStatsRef.current = true;

    try {
      const params = new URLSearchParams();
      
      if (filters.module) params.append('module', filters.module);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      

      const response = await fetch(`/api/notifications/stats?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorData}`);
      }

      const data: StatsResponse = await response.json();
      
      

      if (!data.success) {
        const errorMessage = data.error || data.details || 'Erreur lors de la récupération des statistiques';
        console.warn('⚠️ [Hook] API stats a échoué:', errorMessage);
        
        // Utiliser des stats par défaut au lieu de lever une erreur
        setStats({
          total: 0,
          unread: 0,
          byModule: {},
          bySeverity: {},
          byReason: {}
        });
        return;
      }

      // Valider et nettoyer les stats
      const validatedStats = validateStats(data.stats);
      
      setStats(validatedStats);

    } catch (err) {
      console.error('❌ [Hook] Erreur lors de la récupération des stats:', err);
      
      // Utiliser des stats par défaut au lieu de lever une erreur
      setStats({
        total: 0,
        unread: 0,
        byModule: {},
        bySeverity: {},
        byReason: {}
      });
    } finally {
      fetchingStatsRef.current = false;
    }
  }, [session, status]); // Dépendances minimales

  // Marquer une notification comme lue
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!session?.user) {
      console.warn('❌ [Hook] Utilisateur non connecté pour markAsRead');
      return false;
    }

    try {
      

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          action: 'markAsRead'
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Mettre à jour localement
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true }
              : notification
          )
        );

        // Mettre à jour les stats
        setStats(prev => prev ? {
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        } : null);

        
        return true;
      }

      return false;
    } catch (err) {
      console.error('❌ [Hook] Erreur lors du marquage comme lu:', err);
      return false;
    }
  }, [session]);

  // Marquer toutes les notifications comme lues
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!session?.user) {
      console.warn('❌ [Hook] Utilisateur non connecté pour markAllAsRead');
      return false;
    }

    try {
      

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAllAsRead'
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Mettre à jour localement
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, isRead: true }))
        );

        // Mettre à jour les stats
        setStats(prev => prev ? { ...prev, unread: 0 } : null);

        
        return true;
      }

      return false;
    } catch (err) {
      console.error('❌ [Hook] Erreur lors du marquage de toutes comme lues:', err);
      return false;
    }
  }, [session]);

  // Rafraîchir les données
  const refresh = useCallback(async () => {
    
    await Promise.all([
      fetchNotifications({ ...currentFilters, offset: 0 }),
      fetchStats()
    ]);
  }, [fetchNotifications, fetchStats, currentFilters]);

  // Charger plus de notifications
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || fetchingRef.current) {
      return;
    }

    
    await fetchNotifications({
      ...currentFilters,
      offset: notifications.length
    });
  }, [hasMore, loading, fetchNotifications, currentFilters, notifications.length]);

  // Chargement initial - SEULEMENT une fois quand l'utilisateur est authentifié
  useEffect(() => {
    if (status === 'authenticated' && session?.user && !initialLoadDoneRef.current) {
      
      initialLoadDoneRef.current = true;
      
      // Délai pour éviter les appels simultanés
      const timeoutId = setTimeout(() => {
        refresh();
      }, 100);

      return () => clearTimeout(timeoutId);
      
    }
  }, [status, session?.user]); // Dépendances minimales, pas de refresh

  // Intégration du système SSE pour les notifications en temps réel
  const { isConnected, reconnect } = useNotificationSSE({
    onNotification: useCallback((newNotification: ExtendedNotification) => {
      console.log('🔔 [Hook] Nouvelle notification reçue via SSE:', newNotification);
      
      // Valider et nettoyer la notification
      const cleanNotification = sanitizeNotifications([newNotification])[0];
      if (!cleanNotification) {
        console.warn('❌ [Hook] Notification SSE invalide ignorée');
        return;
      }

      // Ajouter la nouvelle notification en tête de liste
      setNotifications(prev => {
        // Éviter les doublons
        const exists = prev.some(n => n.id === cleanNotification.id);
        if (exists) {
          console.log('🔄 [Hook] Notification déjà présente, ignorée');
          return prev;
        }
        
        return [cleanNotification, ...prev];
      });

      // Mettre à jour les stats
      setStats(prev => prev ? {
        ...prev,
        total: prev.total + 1,
        unread: prev.unread + (cleanNotification.isRead ? 0 : 1)
      } : null);

      // Mettre à jour le total
      setTotal(prev => prev + 1);
      
    }, []),
    
    onConnected: useCallback(() => {
      console.log('✅ [Hook] Connexion SSE établie');
    }, []),
    
    onError: useCallback((error: string) => {
      console.error('❌ [Hook] Erreur SSE:', error);
      setError(`Erreur notifications temps réel: ${error}`);
    }, []),
    
    onReconnect: useCallback(() => {
      console.log('🔄 [Hook] Reconnexion SSE en cours...');
      // Optionnel : rafraîchir les données lors de la reconnexion
      refresh();
    }, [])
  });

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    notifications,
    stats,
    loading,
    error,
    hasMore,
    total,
    fetchNotifications,
    fetchStats,
    markAsRead,
    markAllAsRead,
    refresh,
    loadMore,
    // Propriétés SSE
    isSSEConnected: isConnected,
    reconnectSSE: reconnect
  };
}