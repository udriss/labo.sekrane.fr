// Script pour tester les notifications SSE
async function testNotificationSSE() {
  console.log('🧪 Test de notification SSE...');
  
  try {
    // Appel direct à l'API de notification
    const response = await fetch('http://localhost:3000/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'user_cl6r3qj2a0001l7088x8f6a3x',
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
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Notification envoyée avec succès!');
      console.log('📧 ID:', result.notification?.id);
      console.log('🔔 Titre:', result.notification?.title);
      console.log('📝 Message:', result.notification?.message);
      console.log('⚡ La notification devrait apparaître en temps réel dans l\'interface grâce à SSE');
    } else {
      const error = await response.text();
      console.error('❌ Erreur lors de l\'envoi:', error);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('💡 Assurez-vous que le serveur Next.js est démarré (npm run dev)');
  }
}

testNotificationSSE();
