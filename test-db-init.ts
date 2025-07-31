// test-db-init.ts
import { initializeDatabase } from './lib/db.js';

async function testInit() {
  try {
    console.log('🚀 Initialisation de la base de données...');
    await initializeDatabase();
    console.log('✅ Base de données initialisée');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testInit();
