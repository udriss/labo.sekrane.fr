// Script de test pour l'API calendrier physique
import { createPhysicsEvent } from './lib/calendar-utils.js';

async function testPhysicsAPI() {
  try {
    console.log('🧪 Test de création d\'événement physique...');
    
    const testEvent = {
      title: 'Test Physique API',
      description: 'Test de l\'API physique',
      type: 'MAINTENANCE',
      startDate: '2025-01-15',
      endDate: '2025-01-15',
      startTime: '09:00',
      endTime: '10:00',
      room: 'Salle Physique 1',
      class: 'Terminale S',
      createdBy: 'test',
      equipmentUsed: [],
      chemicalsUsed: [],
      notes: 'Test via script'
    };

    const result = await createPhysicsEvent(testEvent);
    console.log('✅ Événement créé avec succès:', result);
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testPhysicsAPI();
