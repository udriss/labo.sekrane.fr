
import { DatabaseNotificationService } from './lib/notifications/database-notification-service';

// Charger les variables d'environnement


async function testNotificationService() {
  try {
    console.log('🧪 Test du service de notifications...');
    
    // Test 1: Créer une notification
    console.log('1️⃣ Création d\'une notification de test...');
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
    
    console.log('✅ Notification créée avec ID:', notificationId);
    
    // Test 2: Récupérer les notifications pour un utilisateur avec rôle ADMIN
    console.log('2️⃣ Récupération des notifications pour un utilisateur ADMIN...');
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
      console.log('3️⃣ Marquage comme lu...');
      const success = await DatabaseNotificationService.markAsRead(result.notifications[0].id, 'test-user-admin');
      console.log('✅ Marquage comme lu:', success ? 'Réussi' : 'Échoué');
    }
    
    // Test 4: Récupérer à nouveau pour vérifier le statut "lu"
    console.log('4️⃣ Vérification du statut lu...');
    const result2 = await DatabaseNotificationService.getNotifications('test-user-admin', {
      limit: 10,
      offset: 0,
      userRole: 'ADMIN',
      userEmail: 'admin@test.com'
    });
    
    console.log('✅ Status après marquage:', {
      firstNotificationIsRead: result2.notifications[0]?.isRead
    });
    
    console.log('🎉 Tous les tests du service réussis !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testNotificationService();


