
import { DatabaseNotificationService } from '../lib/notifications/database-notification-service';

// Charger les variables d'environnement
// config();

async function testNotificationService() {
  try {
    
    
    // Test 1: Créer une notification
    
    const notificationId = await DatabaseNotificationService.createNotification(
      ['ADMIN', 'TEACHER'],
      'test',
      'test_action',
      'Message de test',
      'Détails du test',
      'medium',
      'test',
      'test-1',
      'system'
    );
    
    
    
    // Test 2: Récupérer les notifications pour un utilisateur avec rôle ADMIN
    
    const result = await DatabaseNotificationService.getNotifications('test-user-admin', {
      limit: 10,
      offset: 0,
      userRole: 'ADMIN',
      userEmail: 'admin@test.com'
    });
    
    console.log('✅ Notifications récupérées:', {
      count: result.notifications.length,
      total: result.total,
      firstNotification: result.notifications[0] ? {
        id: result.notifications[0].id,
        message: result.notifications[0].message,
        module: result.notifications[0].module,
        isRead: result.notifications[0].isRead
      } : null
    });
    
    // Test 3: Marquer comme lu
    if (result.notifications.length > 0) {
      
      const success = await DatabaseNotificationService.markAsRead(result.notifications[0].id, 'test-user-admin');
      
    }
    
    // Test 4: Récupérer à nouveau pour vérifier le statut "lu"
    
    const result2 = await DatabaseNotificationService.getNotifications('test-user-admin', {
      limit: 10,
      offset: 0,
      userRole: 'ADMIN',
      userEmail: 'admin@test.com'
    });
    
    console.log('✅ Status après marquage:', {
      firstNotificationIsRead: result2.notifications[0]?.isRead
    });
    
    
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testNotificationService();


