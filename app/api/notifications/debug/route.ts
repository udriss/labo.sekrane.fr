// /app/api/notifications/debug/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NotificationsFileDebugService } from '@/lib/debug/notifications-file-debug';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    const { searchParams } = new URL(request.url);
    
    // Paramètres de test
    const testUserId = searchParams.get('testUserId') || user.id;
    const testUserEmail = searchParams.get('testUserEmail') || user.email;
    const action = searchParams.get('action') || 'full';

    console.log('🔍 [API DEBUG] Début du test de débogage notifications');
    console.log('🔍 [API DEBUG] User session:', { id: user.id, email: user.email, role: user.role });
    console.log('🔍 [API DEBUG] Test params:', { testUserId, testUserEmail, action });

    switch (action) {
      case 'file-access':
        // Test basique d'accès au fichier
        const fileResult = await NotificationsFileDebugService.debugFileAccess();
        return NextResponse.json({
          action: 'file-access',
          result: fileResult,
          timestamp: new Date().toISOString()
        });

      case 'user-filter':
        // Test de filtrage pour un utilisateur spécifique
        const userResult = await NotificationsFileDebugService.debugFileAccess(testUserId, testUserEmail);
        return NextResponse.json({
          action: 'user-filter',
          testParams: { testUserId, testUserEmail },
          result: userResult,
          timestamp: new Date().toISOString()
        });

      case 'user-formats':
        // Test des différents formats d'userId
        const formatsResult = await NotificationsFileDebugService.testUserIdFormats(testUserId, testUserEmail);
        return NextResponse.json({
          action: 'user-formats',
          testParams: { testUserId, testUserEmail },
          result: formatsResult,
          timestamp: new Date().toISOString()
        });

      case 'get-notifications':
        // Test de récupération des notifications
        const notifications = await NotificationsFileDebugService.getNotificationsForUser(
          testUserId, 
          testUserEmail,
          parseInt(searchParams.get('limit') || '20'),
          parseInt(searchParams.get('offset') || '0')
        );
        return NextResponse.json({
          action: 'get-notifications',
          testParams: { testUserId, testUserEmail },
          result: {
            count: notifications.length,
            notifications
          },
          timestamp: new Date().toISOString()
        });

      case 'get-stats':
        // Test de récupération des statistiques
        const stats = await NotificationsFileDebugService.getStatsForUser(testUserId, testUserEmail);
        return NextResponse.json({
          action: 'get-stats',
          testParams: { testUserId, testUserEmail },
          result: { stats },
          timestamp: new Date().toISOString()
        });

      case 'full':
      default:
        // Test complet
        const fullResult = await NotificationsFileDebugService.debugFileAccess(testUserId, testUserEmail);
        const formatsTest = await NotificationsFileDebugService.testUserIdFormats(testUserId, testUserEmail);
        const notificationsTest = await NotificationsFileDebugService.getNotificationsForUser(testUserId, testUserEmail, 5);
        const statsTest = await NotificationsFileDebugService.getStatsForUser(testUserId, testUserEmail);

        return NextResponse.json({
          action: 'full',
          testParams: { testUserId, testUserEmail },
          results: {
            fileAccess: fullResult,
            userFormats: formatsTest,
            notifications: {
              count: notificationsTest.length,
              data: notificationsTest
            },
            stats: statsTest
          },
          summary: {
            fileAccessible: fullResult.success,
            hasNotificationsForUser: (fullResult.stats?.notificationsForUser || 0) > 0,
            totalNotifications: fullResult.stats?.totalNotifications || 0,
            userNotifications: fullResult.stats?.notificationsForUser || 0
          },
          timestamp: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('🔍 [API DEBUG] Erreur:', error);
    return NextResponse.json({
      error: 'Erreur lors du débogage',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}