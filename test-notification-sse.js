import { createNotification } from './lib/services/notification-service.js';

async function testNotificationSSE() {
  console.log('🧪 Test de notification SSE...');
  
  try {
    // Créer une notification de test
    const testNotification = {
      userId: 'user_cl6r3qj2a0001l7088x8f6a3x', // ID d'un utilisateur existant
      type: 'equipment_malfunction',
      title: 'Test SSE - Dysfonctionnement équipement',
      message: 'Ceci est un test pour vérifier que les notifications SSE fonctionnent correctement.',
      module: 'equipment',
      entityId: 'eq_test_001',
      severity: 'HIGH',
      metadata: {
        equipmentName: 'Microscope de test',
        room: 'Salle de test',
        testType: 'SSE_CONNECTION_TEST'
      }
    };

    console.log('📤 Envoi de la notification...');
    const result = await createNotification(testNotification);
    
    if (result.success) {
      console.log('✅ Notification envoyée avec succès!');
      console.log('📧 ID:', result.notification.id);
      console.log('🔔 Titre:', result.notification.title);
      console.log('📝 Message:', result.notification.message);
      console.log('⚡ La notification devrait apparaître en temps réel dans l\'interface grâce à SSE');
    } else {
      console.error('❌ Erreur lors de l\'envoi:', result.error);
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testNotificationSSE();
