
import { query, initializeDatabase } from '../lib/db';

// Charger les variables d'environnement
// config();

async function testDatabase() {
  try {
    
    
    
    
    
    
    
    
    // Test de connexion simple
    const testResult = await query('SELECT 1 as test');
    
    
    // Initialiser les tables
    
    await initializeDatabase();
    
    
    // Vérifier que les tables existent
    const tables = await query('SHOW TABLES LIKE "notifications%"');
    
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testDatabase();
