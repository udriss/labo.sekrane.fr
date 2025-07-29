
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RoleBasedNotificationService } from '@/lib/notifications/role-based-notification-service';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    const { searchParams } = new URL(request.url);
    
    const action = searchParams.get('action') || 'debug';
    const testUserId = searchParams.get('testUserId') || user.id;
    const testUserEmail = searchParams.get('testUserEmail') || user.email;
    const testUserRole = searchParams.get('testUserRole') || user.role;

    console.log('🔍 [DEBUG ROLES] Début du débogage système basé sur les rôles');
    console.log('🔍 [DEBUG ROLES] User session:', { id: user.id, email: user.email, role: user.role });
    console.log('🔍 [DEBUG ROLES] Test params:', { testUserId, testUserEmail, testUserRole, action });

    switch (action) {
      case 'debug':
        // Débogage complet pour un utilisateur
        const debugResult = await RoleBasedNotificationService.debugUserNotifications(
          testUserId,
          testUserEmail,
          testUserRole
        );
        
        return NextResponse.json({
          action: 'debug',
          testParams: { testUserId, testUserEmail, testUserRole },
          result: debugResult,
          summary: {
            hasRole: !!testUserRole,
            hasPreferences: Object.keys(debugResult.preferences).length > 0,
            totalNotifications: debugResult.allNotifications,
            userNotifications: debugResult.summary.roleBasedMatches + debugResult.summary.specificMatches,
            roleBasedMatches: debugResult.summary.roleBasedMatches,
            specificMatches: debugResult.summary.specificMatches,
            preferenceBlocked: debugResult.summary.preferenceBlocked
          },
          timestamp: new Date().toISOString()
        });

      case 'test-notifications':
        // Tester la récupération des notifications
        const { notifications, total } = await RoleBasedNotificationService.getNotifications(
          testUserId,
          testUserEmail,
          testUserRole,
          10,
          0
        );
        
        return NextResponse.json({
          action: 'test-notifications',
          testParams: { testUserId, testUserEmail, testUserRole },
          result: {
            notifications,
            total,
            count: notifications.length
          },
          timestamp: new Date().toISOString()
        });

      case 'test-stats':
        // Tester la récupération des statistiques
        const stats = await RoleBasedNotificationService.getStats(
          testUserId,
          testUserEmail,
          testUserRole
        );
        
        return NextResponse.json({
          action: 'test-stats',
          testParams: { testUserId, testUserEmail, testUserRole },
          result: { stats },
          timestamp: new Date().toISOString()
        });

      case 'generate-test':
        // Générer une notification de test
        const testNotification = RoleBasedNotificationService.generateTestNotificationForRole(
          [testUserRole],
          'SYSTEM',
          'TEST',
          testUserId
        );
        
        return NextResponse.json({
          action: 'generate-test',
          testParams: { testUserId, testUserEmail, testUserRole },
          testNotification,
          instructions: [
            '1. Copiez cette notification dans votre fichier notifications.json',
            '2. Ajoutez-la au début du tableau de notifications',
            '3. Sauvegardez le fichier',
            '4. Testez à nouveau l\'API notifications'
          ],
          timestamp: new Date().toISOString()
        });

      case 'validate-files':
        // Valider l'existence et la structure des fichiers
        try {
          const fs = require('fs');
          const notificationsFile = '/var/www/labo.sekrane.fr/data/notifications.json';
          const preferencesFile = '/var/www/labo.sekrane.fr/data/notification-preferences.json';
          
          const validation = {
            notificationsFile: {
              exists: fs.existsSync(notificationsFile),
              size: fs.existsSync(notificationsFile) ? fs.statSync(notificationsFile).size : 0,
              valid: false,
              count: 0
            },
            preferencesFile: {
              exists: fs.existsSync(preferencesFile),
              size: fs.existsSync(preferencesFile) ? fs.statSync(preferencesFile).size : 0,
              valid: false,
              count: 0
            }
          };

          // Valider le fichier notifications
          if (validation.notificationsFile.exists && validation.notificationsFile.size > 0) {
            try {
              const notifContent = fs.readFileSync(notificationsFile, 'utf8');
              const notifications = JSON.parse(notifContent);
              validation.notificationsFile.valid = Array.isArray(notifications);
              validation.notificationsFile.count = notifications.length;
            } catch (e) {
              validation.notificationsFile.valid = false;
            }
          }

          // Valider le fichier préférences
          if (validation.preferencesFile.exists && validation.preferencesFile.size > 0) {
            try {
              const prefContent = fs.readFileSync(preferencesFile, 'utf8');
              const preferences = JSON.parse(prefContent);
              validation.preferencesFile.valid = Array.isArray(preferences);
              validation.preferencesFile.count = preferences.length;
            } catch (e) {
              validation.preferencesFile.valid = false;
            }
          }

          return NextResponse.json({
            action: 'validate-files',
            result: validation,
            recommendations: [
              !validation.notificationsFile.exists ? 'Créer le fichier notifications.json' : null,
              !validation.preferencesFile.exists ? 'Créer le fichier notification-preferences.json' : null,
              !validation.notificationsFile.valid ? 'Corriger la structure du fichier notifications.json' : null,
              !validation.preferencesFile.valid ? 'Corriger la structure du fichier notification-preferences.json' : null,
              validation.notificationsFile.count === 0 ? 'Ajouter des notifications de test' : null,
              validation.preferencesFile.count === 0 ? 'Ajouter des préférences par défaut' : null
            ].filter(Boolean),
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          return NextResponse.json({
            action: 'validate-files',
            error: `Erreur lors de la validation: ${error}`,
            timestamp: new Date().toISOString()
          });
        }

      default:
        return NextResponse.json({ 
          error: 'Action non supportée',
          availableActions: ['debug', 'test-notifications', 'test-stats', 'generate-test', 'validate-files']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('🔍 [DEBUG ROLES] Erreur:', error);
    return NextResponse.json({
      error: 'Erreur lors du débogage',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}