import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ExtendedNotification, NotificationStats, NotificationFilter } from '@/types/notifications';

interface DebugResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

interface NotificationsDebugState {
  session: DebugResult;
  notifications: DebugResult;
  stats: DebugResult;
  isLoading: boolean;
  summary: {
    totalErrors: number;
    hasSession: boolean;
    hasNotifications: boolean;
    hasStats: boolean;
  };
}

export function useNotificationsDebug() {
  const { data: session, status } = useSession();
  const [debugState, setDebugState] = useState<NotificationsDebugState>({
    session: { success: false, timestamp: '' },
    notifications: { success: false, timestamp: '' },
    stats: { success: false, timestamp: '' },
    isLoading: true,
    summary: {
      totalErrors: 0,
      hasSession: false,
      hasNotifications: false,
      hasStats: false
    }
  });

  const runDebug = async () => {
    setDebugState(prev => ({ ...prev, isLoading: true }));
    
    const results: Partial<NotificationsDebugState> = {
      session: { success: false, timestamp: new Date().toISOString() },
      notifications: { success: false, timestamp: new Date().toISOString() },
      stats: { success: false, timestamp: new Date().toISOString() }
    };

    // Test 1: Session
    try {
      if (session?.user) {
        const userId = (session.user as any).id;
        const userRole = (session.user as any).role;
        
        if (userId && userRole) {
          results.session = {
            success: true,
            data: { userId, userRole, email: session.user.email },
            timestamp: new Date().toISOString()
          };
        } else {
          results.session = {
            success: false,
            error: 'Session valide mais userId ou role manquant',
            data: session.user,
            timestamp: new Date().toISOString()
          };
        }
      } else {
        results.session = {
          success: false,
          error: 'Aucune session utilisateur trouvée',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      results.session = {
        success: false,
        error: `Erreur session: ${error}`,
        timestamp: new Date().toISOString()
      };
    }

    // Test 2: API Notifications (seulement si session OK)
    if (results.session?.success) {
      try {
        const userId = results.session.data.userId;
        const response = await fetch(`/api/notifications?userId=${userId}&limit=5`);
        
        if (response.ok) {
          const data = await response.json();
          results.notifications = {
            success: true,
            data: {
              count: data.notifications?.length || 0,
              notifications: data.notifications || [],
              hasData: (data.notifications?.length || 0) > 0
            },
            timestamp: new Date().toISOString()
          };
        } else {
          const errorText = await response.text();
          results.notifications = {
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        results.notifications = {
          success: false,
          error: `Erreur API notifications: ${error}`,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Test 3: API Stats (seulement si session OK)
    if (results.session?.success) {
      try {
        const userId = results.session.data.userId;
        const response = await fetch(`/api/notifications/stats?userId=${userId}`);
        
        if (response.ok) {
          const data = await response.json();
          results.stats = {
            success: true,
            data: data.stats || {},
            timestamp: new Date().toISOString()
          };
        } else {
          const errorText = await response.text();
          results.stats = {
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        results.stats = {
          success: false,
          error: `Erreur API stats: ${error}`,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Calculer le résumé
    const totalErrors = [results.session, results.notifications, results.stats]
      .filter(r => !r?.success).length;

    const summary = {
      totalErrors,
      hasSession: results.session?.success || false,
      hasNotifications: results.notifications?.success || false,
      hasStats: results.stats?.success || false
    };

    setDebugState({
      session: results.session!,
      notifications: results.notifications!,
      stats: results.stats!,
      isLoading: false,
      summary
    });
  };

  // Test direct des APIs sans filtres
  const testRawAPIs = async () => {
    if (!session?.user) return null;
    
    const userId = (session.user as any).id;
    const tests = [];

    // Test API brute
    try {
      const response = await fetch(`/api/notifications?userId=${userId}`);
      const data = await response.json();
      tests.push({
        name: 'API Notifications (sans filtres)',
        success: response.ok,
        data: data,
        status: response.status
      });
    } catch (error) {
      tests.push({
        name: 'API Notifications (sans filtres)',
        success: false,
        error: error
      });
    }

    // Test avec différents paramètres
    try {
      const response = await fetch(`/api/notifications?userId=${userId}&limit=100&offset=0`);
      const data = await response.json();
      tests.push({
        name: 'API Notifications (avec limit/offset)',
        success: response.ok,
        data: data,
        status: response.status
      });
    } catch (error) {
      tests.push({
        name: 'API Notifications (avec limit/offset)',
        success: false,
        error: error
      });
    }

    return tests;
  };

  useEffect(() => {
    if (status !== 'loading') {
      runDebug();
    }
  }, [session, status]);

  return {
    ...debugState,
    runDebug,
    testRawAPIs,
    canRetry: status !== 'loading'
  };
}