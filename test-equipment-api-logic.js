// Test de la nouvelle logique API equipement

const mysql = require('mysql2/promise');

async function testEquipmentAPI() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'int',
    password: '4Na9Gm8mdTVgnUp',
    database: 'labo'
  });

  console.log('🔧 [TEST] Analyse de la structure des données...\n');

  // 1. Examiner les données actuelles
  console.log('=== EQUIPMENT_TYPES ===');
  const [types] = await connection.execute('SELECT id, name FROM equipment_types LIMIT 3');
  console.table(types);

  console.log('=== EQUIPMENT_ITEMS ===');
  const [items] = await connection.execute('SELECT id, name, equipment_type_id FROM equipment_items LIMIT 3');
  console.table(items);

  console.log('=== EQUIPMENT (exemple avec jointures) ===');
  const [equipment] = await connection.execute(`
    SELECT 
      e.id, e.name, e.equipment_type_id, e.equipment_item_id,
      et.name as type_name,
      ei.name as item_name
    FROM chimie_equipment e
    LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
    LEFT JOIN equipment_items ei ON e.equipment_item_id = ei.id
    LIMIT 3
  `);
  console.table(equipment);

  // 2. Test de la logique de détection
  console.log('\n🧪 [TEST] Test de la logique de détection...\n');

  // Exemple 1: Tester avec un equipment_item_id
  if (items.length > 0) {
    const testItemId = items[0].id;
    console.log(`Test avec equipment_item_id: ${testItemId}`);
    
    const [itemCheck] = await connection.execute(
      'SELECT id, equipment_type_id FROM equipment_items WHERE id = ?',
      [testItemId]
    );
    
    if (itemCheck.length > 0) {
      const item = itemCheck[0];
      console.log(`✅ Détecté comme equipment_item_id: ${item.id} -> equipment_type_id: ${item.equipment_type_id}`);
    }
  }

  // Exemple 2: Tester avec un equipment_type_id
  if (types.length > 0) {
    const testTypeId = types[0].id;
    console.log(`\nTest avec equipment_type_id: ${testTypeId}`);
    
    const [itemCheck] = await connection.execute(
      'SELECT id, equipment_type_id FROM equipment_items WHERE id = ?',
      [testTypeId]
    );

    if (itemCheck.length === 0) {
      const [typeCheck] = await connection.execute(
        'SELECT id, name FROM equipment_types WHERE id = ?',
        [testTypeId]
      );
      
      if (typeCheck.length > 0) {
        console.log(`✅ Détecté comme equipment_type_id: ${testTypeId}`);
      }
    }
  }

  await connection.end();
}

testEquipmentAPI().catch(console.error);
