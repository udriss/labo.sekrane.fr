// Test d'un appel POST à l'API equipement
import fetch from 'node-fetch';

async function testEquipmentPOST() {
  const conn = await import('mysql2/promise').then(m => m.default.createConnection({
    host: 'localhost',
    user: 'int',
    password: '4Na9Gm8mdTVgnUp',
    database: 'labo'
  }));

  try {
    // Récupérer un equipment_item_id pour le test
    const [items] = await conn.execute('SELECT id, name, equipment_type_id FROM equipment_items LIMIT 1');
    
    if (items.length === 0) {
      console.log('❌ Aucun equipment_item trouvé pour le test');
      return;
    }

    const testItem = items[0];
    console.log(`🧪 Test avec equipment_item_id: ${testItem.id}`);
    console.log(`   Nom: ${testItem.name}`);
    console.log(`   Equipment type ID: ${testItem.equipment_type_id}`);

    // Données de test avec equipment_item_id dans equipmentTypeId
    const testData = {
      name: `Test Equipment - ${Date.now()}`,
      equipmentTypeId: testItem.id, // C'est un equipment_item_id, pas un equipment_type_id
      quantity: 1,
      volume: '250ml',
      room: 'Salle Test',
      notes: 'Test de l\'API avec correction equipment_item_id'
    };

    console.log('\n📤 Envoi des données:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:3000/api/chimie/equipement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const responseText = await response.text();
    console.log('\n📥 Réponse de l\'API:');
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('Data:', JSON.stringify(responseData, null, 2));

      if (response.ok && responseData.materiel) {
        console.log('\n✅ Test réussi !');
        console.log(`Equipment créé avec ID: ${responseData.materiel.id}`);
        console.log(`equipment_type_id: ${responseData.materiel.equipment_type_id}`);
        console.log(`equipment_item_id: ${responseData.materiel.equipment_item_id}`);
      } else {
        console.log('\n❌ Test échoué');
      }
    } catch (e) {
      console.log('Response text:', responseText);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await conn.end();
  }
}

testEquipmentPOST();
