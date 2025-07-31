// test-equipment-api.mjs

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'int',
  password: process.env.DB_PASSWORD || '4Na9Gm8mdTVgnUp',
  database: process.env.DB_NAME || 'labo'
};

async function testEquipmentData() {
  let connection;
  
  try {
    console.log('🚀 Test des données d\'équipements dans MySQL...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion à MySQL établie');

    // Test 1: Compter les équipements
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM equipment');
    console.log(`📊 Total équipements: ${countResult[0].total}`);

    // Test 2: Compter les types
    const [typesResult] = await connection.execute('SELECT COUNT(*) as total FROM equipment_types');
    console.log(`📊 Total types: ${typesResult[0].total}`);

    // Test 3: Compter les items
    const [itemsResult] = await connection.execute('SELECT COUNT(*) as total FROM equipment_items');
    console.log(`📊 Total items: ${itemsResult[0].total}`);

    // Test 4: Récupérer quelques équipements avec leurs relations
    const [equipmentRows] = await connection.execute(`
      SELECT 
        e.id,
        e.name,
        e.quantity,
        e.status,
        et.name as type_name,
        ei.name as item_name
      FROM equipment e
      LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
      LEFT JOIN equipment_items ei ON e.equipment_item_id = ei.id
      LIMIT 5
    `);

    console.log('\n📋 Équipements (sample):');
    equipmentRows.forEach(eq => {
      console.log(`  - ${eq.name} (${eq.type_name}${eq.item_name ? ` > ${eq.item_name}` : ''}) - Qty: ${eq.quantity} - Status: ${eq.status}`);
    });

    // Test 5: Vérifier la structure des types avec items
    const [typesWithItems] = await connection.execute(`
      SELECT 
        et.id,
        et.name,
        COUNT(ei.id) as items_count
      FROM equipment_types et
      LEFT JOIN equipment_items ei ON et.id = ei.equipment_type_id
      GROUP BY et.id, et.name
      ORDER BY et.name
    `);

    console.log('\n🏷️ Types avec nombre d\'items:');
    typesWithItems.forEach(type => {
      console.log(`  - ${type.name}: ${type.items_count} items`);
    });

    console.log('\n✅ Tests terminés avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testEquipmentData();
