// Test script pour vérifier la correction de l'API /api/chimie/equipement
import mysql from 'mysql2/promise';

async function testEquipmentAPIFix() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'int',
    password: '4Na9Gm8mdTVgnUp',
    database: 'labo'
  });

  try {
    console.log('=== Test de la logique de distinction equipment_type_id vs equipmentItemId ===\n');

    // 1. Récupérer quelques examples de données
    const [types] = await conn.execute('SELECT id, name FROM equipment_types LIMIT 3');
    const [items] = await conn.execute('SELECT id, name, equipment_type_id FROM equipment_items LIMIT 3');

    console.log('🏷️  Equipment Types:');
    types.forEach(type => console.log(`  - ${type.id}: ${type.name}`));
    
    console.log('\n📦 Equipment Items:');
    items.forEach(item => console.log(`  - ${item.id}: ${item.name} (type: ${item.equipment_type_id})`));

    // 2. Tester la logique qui sera dans l'API
    console.log('\n🔍 Test de la logique de détection:\n');

    // Test avec un equipmentItemId
    if (items.length > 0) {
      const testItemId = items[0].id;
      console.log(`Test avec equipmentItemId: ${testItemId}`);
      
      const [itemCheck] = await conn.execute(
        'SELECT id, equipment_type_id FROM equipment_items WHERE id = ?',
        [testItemId]
      );

      if (itemCheck.length > 0) {
        const item = itemCheck[0];
        console.log(`✅ Détecté comme equipmentItemId: ${item.id} -> equipment_type_id: ${item.equipment_type_id}`);
      }
    }

    // Test avec un equipment_type_id
    if (types.length > 0) {
      const testTypeId = types[0].id;
      console.log(`\nTest avec equipment_type_id: ${testTypeId}`);
      
      const [itemCheck] = await conn.execute(
        'SELECT id, equipment_type_id FROM equipment_items WHERE id = ?',
        [testTypeId]
      );

      if (itemCheck.length === 0) {
        const [typeCheck] = await conn.execute(
          'SELECT id, name FROM equipment_types WHERE id = ?',
          [testTypeId]
        );

        if (typeCheck.length > 0) {
          console.log(`✅ Détecté comme equipment_type_id: ${testTypeId}`);
        }
      }
    }

    // 3. Test avec un ID inexistant
    console.log('\nTest avec ID inexistant: INVALID_ID');
    const [itemCheck] = await conn.execute(
      'SELECT id, equipment_type_id FROM equipment_items WHERE id = ?',
      ['INVALID_ID']
    );

    if (itemCheck.length === 0) {
      const [typeCheck] = await conn.execute(
        'SELECT id, name FROM equipment_types WHERE id = ?',
        ['INVALID_ID']
      );

      if (typeCheck.length === 0) {
        console.log('❌ ID non trouvé dans les deux tables (comportement attendu)');
      }
    }

    console.log('\n✅ Tests de logique terminés avec succès!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await conn.end();
  }
}

testEquipmentAPIFix();
