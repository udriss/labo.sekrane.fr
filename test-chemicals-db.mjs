// test-chemicals-db.mjs
// Script pour tester la connexion et les opérations sur les chemicals

import { query, initializeDatabase, closePool } from './lib/db.ts';

async function testChemicalsDatabase() {
  try {
    console.log('🔄 Initialisation de la base de données...');
    await initializeDatabase();
    console.log('✅ Base de données initialisée avec succès');

    // Tester l'insertion d'un chemical
    console.log('\n🔄 Test d\'insertion d\'un chemical...');
    const testChemicalId = `CHEM_TEST_${Date.now()}`;
    await query(`
      INSERT INTO chemicals (
        id, name, formula, quantity, unit, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [testChemicalId, 'Test Chemical', 'H2O', 100, 'mL', 'IN_STOCK']);
    console.log('✅ Chemical inséré avec succès');

    // Tester la récupération des chemicals
    console.log('\n🔄 Test de récupération des chemicals...');
    const chemicals = await query(`
      SELECT c.*, s.name as supplierName 
      FROM chemicals c 
      LEFT JOIN suppliers s ON c.supplierId = s.id 
      ORDER BY c.name ASC
    `);
    console.log(`✅ ${chemicals.length} chemical(s) trouvé(s)`);
    console.log('Chemicals:', chemicals.map(c => ({ id: c.id, name: c.name, quantity: c.quantity })));

    // Tester la mise à jour
    console.log('\n🔄 Test de mise à jour d\'un chemical...');
    await query(
      'UPDATE chemicals SET quantity = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [150, testChemicalId]
    );
    console.log('✅ Chemical mis à jour avec succès');

    // Vérifier la mise à jour
    const updatedChemical = await query('SELECT * FROM chemicals WHERE id = ?', [testChemicalId]);
    console.log('Chemical mis à jour:', updatedChemical[0]);

    // Nettoyer le test
    console.log('\n🔄 Nettoyage du chemical de test...');
    await query('DELETE FROM chemicals WHERE id = ?', [testChemicalId]);
    console.log('✅ Nettoyage terminé');

    console.log('\n🎉 Tous les tests ont réussi !');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await closePool();
    console.log('🔌 Connexion fermée');
  }
}

testChemicalsDatabase();
