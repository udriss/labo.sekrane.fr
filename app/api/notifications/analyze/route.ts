import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseNotificationService } from '@/lib/notifications/database-notification-service';
import { query } from '@/lib/db';

// Analyse les notifications pour un utilisateur
async function analyzeNotificationsForUser(
  userId: string,
  userRole: string,
  userEmail: string
) {
  try {
    // 1. Récupérer toutes les notifications de l'utilisateur
    const result = await DatabaseNotificationService.getNotifications(userId, {
      limit: 1000,
      offset: 0,
      userRole,
      userEmail,
    });

    // 2. Statistiques générales de la base de données
    const [totalCount] = await query<{ total: number }[]>(
      'SELECT COUNT(*) as total FROM notifications'
    );
    const [readCount] = await query<{ total: number }[]>(
      `
      SELECT COUNT(*) as total FROM notification_read_status 
      WHERE user_id = ? AND is_read = 1
      `,
      [userId]
    );

    // 3. Répartition par module
    const moduleStats = await query<{ module: string; count: number }[]>(
      `
      SELECT module, COUNT(*) as count 
      FROM notifications 
      WHERE JSON_SEARCH(target_roles, 'one', ?) IS NOT NULL
        OR target_roles IS NULL
        OR target_roles = ''
      GROUP BY module
      `,
      [userRole]
    );

    // 4. Répartition par sévérité
    const severityStats = await query<{ severity: string; count: number }[]>(
      `
      SELECT severity, COUNT(*) as count 
      FROM notifications 
      WHERE JSON_SEARCH(target_roles, 'one', ?) IS NOT NULL
        OR target_roles IS NULL
        OR target_roles = ''
      GROUP BY severity
      `,
      [userRole]
    );

    // 5. Recommandations
    const recommendations: string[] = [];
    if (result.notifications.length === 0) {
      recommendations.push('Aucune notification trouvée - vérifiez le rôle utilisateur');
    }
    if (readCount.total === 0 && result.notifications.length > 0) {
      recommendations.push('Aucune notification lue - pensez à marquer les notifications comme lues');
    }
    if (result.notifications.length > 100) {
      recommendations.push("Beaucoup de notifications - considérez l'archivage ou la pagination");
    }

    return {
      totalNotifications: totalCount.total,
      userNotifications: result.notifications,
      readCount: readCount.total,
      unreadCount: result.notifications.length - readCount.total,
      moduleStats,
      severityStats,
      recommendations,
    };
  } catch (error) {
    console.error("Erreur lors de l'analyse:", error);
    throw error;
  }
}

// Suggestions d'optimisation de la base de données
async function suggestDatabaseOptimizations(userId: string, userRole: string) {
  const suggestions: Array<{
    type: string;
    title: string;
    description: string;
  }> = [];
  try {
    // Vérifier les index
    const indexInfo = await query('SHOW INDEX FROM notifications');
    if (!Array.isArray(indexInfo) || indexInfo.length < 2) {
      suggestions.push({
        type: 'performance',
        title: 'Ajouter des index',
        description: 'Créer des index sur created_at et module pour améliorer les performances',
      });
    }

    // Vérifier les anciennes notifications
    const [oldNotifications] = await query<{ count: number }[]>(
      `
      SELECT COUNT(*) as count FROM notifications 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)
      `
    );
    if (oldNotifications.count > 1000) {
      suggestions.push({
        type: 'maintenance',
        title: 'Archiver les anciennes notifications',
        description: `${oldNotifications.count} notifications de plus de 6 mois pourraient être archivées`,
      });
    }

    // Vérifier les notifications sans rôles cibles
    const [orphanNotifications] = await query<{ count: number }[]>(
      `
      SELECT COUNT(*) as count FROM notifications 
      WHERE target_roles IS NULL OR target_roles = '' OR target_roles = '[]'
      `
    );
    if (orphanNotifications.count > 0) {
      suggestions.push({
        type: 'data-quality',
        title: 'Notifications sans rôles cibles',
        description: `${orphanNotifications.count} notifications n'ont pas de rôles cibles définis`,
      });
    }
  } catch (error) {
    console.error('Erreur lors des suggestions:', error);
  }
  return suggestions;
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const user = session.user as any;
    const { searchParams } = new URL(request.url);

    const action = searchParams.get('action') || 'analyze';
    const testUserId = searchParams.get('testUserId') || user.id;
    const testUserRole = searchParams.get('testUserRole') || user.role;
    const testUserEmail = searchParams.get('testUserEmail') || user.email;

    
    
    

    switch (action) {
      case 'analyze': {
        const analysis = await analyzeNotificationsForUser(testUserId, testUserRole, testUserEmail);
        return NextResponse.json({
          action: 'analyze',
          testParams: { testUserId, testUserEmail, testUserRole },
          analysis,
          summary: {
            databaseAccessible: true,
            totalNotifications: analysis.totalNotifications,
            userNotifications: analysis.userNotifications.length,
            readCount: analysis.readCount,
            unreadCount: analysis.unreadCount,
            hasRecommendations: analysis.recommendations.length > 0,
          },
          timestamp: new Date().toISOString(),
        });
      }
      case 'suggestions': {
        const suggestions = await suggestDatabaseOptimizations(testUserId, testUserRole);
        return NextResponse.json({
          action: 'suggestions',
          testParams: { testUserId, testUserEmail, testUserRole },
          suggestions,
          timestamp: new Date().toISOString(),
        });
      }
      case 'generate-test': {
        const testNotificationId = await DatabaseNotificationService.createNotification(
          [testUserRole],
          'test-analyze',
          'test_creation',
          "Notification de test créée par l'analyseur",
          'Cette notification a été créée pour tester le système d\'analyse',
          'low',
          'test',
          `test-${Date.now()}`,
          user.id
        );
        return NextResponse.json({
          action: 'generate-test',
          testParams: { testUserId, testUserEmail, testUserRole },
          testNotificationId,
          message: 'Notification de test créée en base de données',
          instructions: [
            '1. La notification a été créée directement en base',
            '2. Rechargez la page des notifications pour la voir',
            '3. Elle apparaîtra pour les utilisateurs ayant le rôle: ' + testUserRole,
          ],
          timestamp: new Date().toISOString(),
        });
      }
      default:
        return NextResponse.json(
          {
            error: 'Action non supportée',
            availableActions: ['analyze', 'suggestions', 'generate-test'],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('🔍 [ANALYZE] Erreur:', error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'analyse",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const user = session.user as any;
    const body = await request.json();
    const { action, userId, userEmail, userRole, targetRoles, module, message } = body;

    if (action === 'create-test-notification') {
      const notificationId = await DatabaseNotificationService.createNotification(
        targetRoles || [userRole || user.role],
        module || 'test-manual',
        'manual_test',
        message || 'Notification de test créée manuellement',
        "Cette notification a été créée via l'API d'analyse",
        'medium',
        'test',
        `manual-test-${Date.now()}`,
        user.id
      );
      return NextResponse.json({
        success: true,
        notificationId,
        message: 'Notification de test créée avec succès en base de données',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        error: 'Action POST non supportée',
        availableActions: ['create-test-notification'],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('🔍 [ANALYZE] Erreur POST:', error);
    return NextResponse.json(
      {
        error: 'Erreur lors de la création',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}