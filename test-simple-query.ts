
import { query } from './lib/db';

// Charger les variables d'environnement
// config();

async function testSimpleQuery() {
  try {
    console.log('🧪 Test de requête simple...');
    
    // Requête simple sans JSON pour tester
    const result1 = await query('SELECT * FROM notifications LIMIT 5');
    console.log('✅ Résultat requête simple:', result1);
    
    // Test avec paramètres
    const result2 = await query('SELECT * FROM notifications WHERE module = ? LIMIT ?', ['test', 3]);
    console.log('✅ Résultat avec paramètres:', result2);
    
    // Test LIMIT/OFFSET seuls
    const result3 = await query('SELECT * FROM notifications LIMIT ? OFFSET ?', [2, 0]);
    console.log('✅ Résultat LIMIT/OFFSET:', result3);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testSimpleQuery();
