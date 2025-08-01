// scripts/fix-json-data.ts

import { withConnection } from '@/lib/db';

// Fonction pour parser JSON de manière sécurisée
function safeJSONParse(jsonString: any): { isValid: boolean; parsed?: any; error?: string } {
  if (!jsonString || jsonString === '' || jsonString === null || jsonString === undefined) {
    return { isValid: true, parsed: null };
  }
  
  // Si c'est déjà un objet/array, c'est valide
  if (typeof jsonString === 'object') {
    return { isValid: true, parsed: jsonString };
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    return { isValid: true, parsed };
  } catch (error) {
    return { isValid: false, error: (error as Error).message };
  }
}

async function fixEquipmentItemsJSON() {
  console.log('🔧 Analyse et correction des données JSON dans equipment_items...');
  
  await withConnection(async (connection) => {
    // Récupérer tous les equipment_items
    const [rows] = await connection.execute(`
      SELECT id, name, volumes, resolutions, tailles, materiaux, custom_fields 
      FROM equipment_items
    `);
    
    const items = rows as any[];
    let fixedCount = 0;
    
    for (const item of items) {
      let needsUpdate = false;
      const updates: string[] = [];
      const values: any[] = [];
      
      // Vérifier chaque champ JSON
      const fields = ['volumes', 'resolutions', 'tailles', 'materiaux', 'custom_fields'];
      
      for (const field of fields) {
        const result = safeJSONParse(item[field]);
        
        if (!result.isValid) {
          console.log(`❌ [${item.id}] ${item.name} - ${field}: ${result.error}`);
          console.log(`   Valeur corrompue: "${item[field]}"`);
          
          needsUpdate = true;
          
          // Définir une valeur par défaut appropriée
          let defaultValue;
          if (field === 'custom_fields') {
            defaultValue = '{}';
          } else {
            defaultValue = '[]';
          }
          
          updates.push(`${field} = ?`);
          values.push(defaultValue);
          
          console.log(`   ✅ Sera corrigé avec: ${defaultValue}`);
        } else if (result.parsed !== null) {
          console.log(`✅ [${item.id}] ${item.name} - ${field}: OK`);
        }
      }
      
      // Effectuer la mise à jour si nécessaire
      if (needsUpdate) {
        values.push(item.id);
        
        const updateQuery = `
          UPDATE equipment_items 
          SET ${updates.join(', ')}
          WHERE id = ?
        `;
        
        await connection.execute(updateQuery, values);
        fixedCount++;
        
        console.log(`🔧 [${item.id}] ${item.name} - Données corrigées`);
      }
    }
    
    console.log(`\n📊 Résumé:`);
    console.log(`   Total d'items analysés: ${items.length}`);
    console.log(`   Items corrigés: ${fixedCount}`);
  });
}

async function checkEquipmentVolumes() {
  console.log('\n🔧 Vérification des volumes dans equipment...');
  
  await withConnection(async (connection) => {
    // Récupérer les équipements avec des volumes JSON via les equipment_items
    const [rows] = await connection.execute(`
      SELECT e.id, e.name, ei.volumes as item_volumes
      FROM equipment e
      LEFT JOIN equipment_items ei ON e.equipment_item_id = ei.id
      WHERE ei.volumes IS NOT NULL AND ei.volumes != ''
    `);
    
    const equipment = rows as any[];
    let corruptedCount = 0;
    
    for (const eq of equipment) {
      const result = safeJSONParse(eq.item_volumes);
      
      if (!result.isValid) {
        console.log(`❌ [${eq.id}] ${eq.name} - Volumes corrompus: ${result.error}`);
        console.log(`   Valeur: "${eq.item_volumes}"`);
        corruptedCount++;
      } else {
        console.log(`✅ [${eq.id}] ${eq.name} - Volumes OK`);
      }
    }
    
    console.log(`\n📊 Résumé équipements:`);
    console.log(`   Total analysés: ${equipment.length}`);
    console.log(`   Corrompus: ${corruptedCount}`);
  });
}

async function main() {
  console.log('🚀 Démarrage de la vérification et correction des données JSON...\n');
  
  try {
    await fixEquipmentItemsJSON();
    await checkEquipmentVolumes();
    
    console.log('\n🎉 Vérification et correction terminées!');
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    process.exit(1);
  }
}

// Exécuter le script
main();
