import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseNotificationService } from '@/lib/notifications/database-notification-service';
import { query } from '@/lib/db';

// /app/api/notifications/debug/route.ts


// Service de debug pour la base de données
class DatabaseNotificationDebugService {
  static async debugDatabaseConnection() {
    try {
      const [testQuery] = await query<{ result: number }[]>('SELECT 1 as result');
      const [notificationCount] = await query<{ count: number }[]>('SELECT COUNT(*) as count FROM notifications');
      const [readStatusCount] = await query<{ count: number }[]>('SELECT COUNT(*) as count FROM notification_read_status');

      return {
        success: true,
        connection: 'OK',
        tables: {
          notifications: notificationCount.count,
          notification_read_status: readStatusCount.count,
        },
        testQuery: testQuery.result === 1,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async debugUserNotifications(userId: string, userRole: string, userEmail: string) {
    try {
      // 1. Tester la récupération directe
      const result = await DatabaseNotificationService.getNotifications(userId, {
        limit: 10,
        offset: 0,
        userRole,
        userEmail,
      });

      // 2. Compter les notifications par rôle
      const [roleCount] = await query<{ count: number }[]>(
        `SELECT COUNT(*) as count FROM notifications WHERE JSON_SEARCH(target_roles, 'one', ?) IS NOT NULL`,
        [userRole]
      );

      // 3. Statut de lecture
      const [readStatus] = await query<{ count: number }[]>(
        `SELECT COUNT(*) as count FROM notification_read_status WHERE user_id = ? AND is_read = 1`,
        [userId]
      );

      return {
        success: true,
        userId,
        userRole,
        userEmail,
        notifications: result.notifications.slice(0, 3), // Premiers résultats seulement
        totalNotifications: result.total,
        notificationsForRole: roleCount.count,
        readNotifications: readStatus.count,
        rawQuery: `JSON_SEARCH(target_roles, 'one', '${userRole}') IS NOT NULL`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async debugNotificationStructure() {
    try {
      // Récupérer quelques notifications pour analyser la structure
      const samples = await query(`SELECT * FROM notifications LIMIT 3`);

      // Vérifier les types de target_roles
      const roleTypes = await query(
        `SELECT target_roles, JSON_TYPE(target_roles) as role_type, JSON_VALID(target_roles) as is_valid_json
         FROM notifications WHERE target_roles IS NOT NULL LIMIT 5`
      );

      return {
        success: true,
        sampleNotifications: samples,
        roleAnalysis: roleTypes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async testNotificationCreation(userId: string, userRole: string) {
    try {
      // Créer une notification de test
      const notificationId = await DatabaseNotificationService.createNotification(
        [userRole],
        'debug-test',
        'debug_action',
        'Notification créée par le débogueur',
        'Cette notification a été créée automatiquement pour tester le système',
        'low',
        'debug',
        `debug-${Date.now()}`,
        userId
      );
      return {
        success: true,
        notificationId,
        message: 'Notification de test créée avec succès',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
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

    // Paramètres de test
    const testUserId = searchParams.get('testUserId') || user.id;
    const testUserRole = searchParams.get('testUserRole') || user.role;
    const testUserEmail = searchParams.get('testUserEmail') || user.email;
    const action = searchParams.get('action') || 'full';

    
    
    

    switch (action) {
      case 'database-connection': {
        const dbResult = await DatabaseNotificationDebugService.debugDatabaseConnection();
        return NextResponse.json({
          action: 'database-connection',
          result: dbResult,
          timestamp: new Date().toISOString(),
        });
      }
      case 'user-notifications': {
        const userResult = await DatabaseNotificationDebugService.debugUserNotifications(
          testUserId,
          testUserRole,
          testUserEmail
        );
        return NextResponse.json({
          action: 'user-notifications',
          testParams: { testUserId, testUserEmail, testUserRole },
          result: userResult,
          timestamp: new Date().toISOString(),
        });
      }
      case 'notification-structure': {
        const structureResult = await DatabaseNotificationDebugService.debugNotificationStructure();
        return NextResponse.json({
          action: 'notification-structure',
          result: structureResult,
          timestamp: new Date().toISOString(),
        });
      }
      case 'create-test': {
        const createResult = await DatabaseNotificationDebugService.testNotificationCreation(
          testUserId,
          testUserRole
        );
        return NextResponse.json({
          action: 'create-test',
          testParams: { testUserId, testUserRole },
          result: createResult,
          timestamp: new Date().toISOString(),
        });
      }
      case 'full':
      default: {
        const fullResults = {
          database: await DatabaseNotificationDebugService.debugDatabaseConnection(),
          userNotifications: await DatabaseNotificationDebugService.debugUserNotifications(
            testUserId,
            testUserRole,
            testUserEmail
          ),
          structure: await DatabaseNotificationDebugService.debugNotificationStructure(),
        };

        return NextResponse.json({
          action: 'full',
          testParams: { testUserId, testUserEmail, testUserRole },
          results: fullResults,
          summary: {
            databaseOK: fullResults.database.success,
            userNotificationsFound: fullResults.userNotifications.success,
            structureValid: fullResults.structure.success,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('🔍 [API DEBUG] Erreur:', error);
    return NextResponse.json(
      {
        error: 'Erreur lors du débogage',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}