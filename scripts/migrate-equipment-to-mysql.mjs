// scripts/migrate-equipment-to-mysql.mjs

import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'int',
  password: process.env.DB_PASSWORD || '4Na9Gm8mdTVgnUp',
  database: process.env.DB_NAME || 'labo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Fonction pour convertir les dates
function convertDateToMySQL(dateString) {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString().slice(0, 19).replace('T', ' ');
  } catch (error) {
    console.warn(`Erreur de conversion de date: ${dateString}`, error);
    return null;
  }
}

// Fonction pour générer un ID unique
function generateId() {
  return 'EQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function migrateEquipment() {
  let connection;
  
  try {
    console.log('🚀 Début de la migration des équipements vers MySQL...');
    
    // Connexion à la base de données
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion à MySQL établie');

    // Lecture des fichiers JSON
    const equipmentTypesPath = path.join(__dirname, '..', 'data', 'equipment-types.json');
    const equipmentInventoryPath = path.join(__dirname, '..', 'data', 'equipment-inventory.json');
    
    console.log('📖 Lecture des fichiers JSON...');
    const equipmentTypesData = JSON.parse(await fs.readFile(equipmentTypesPath, 'utf8'));
    const equipmentInventoryData = JSON.parse(await fs.readFile(equipmentInventoryPath, 'utf8'));

    console.log(`📊 Types d'équipements trouvés: ${equipmentTypesData.types?.length || 0}`);
    console.log(`📊 Équipements trouvés: ${equipmentInventoryData.equipment?.length || 0}`);

    // ====================
    // MIGRATION DES TYPES D'ÉQUIPEMENTS
    // ====================
    
    console.log('\n🔄 Migration des types d\'équipements...');
    
    for (const type of equipmentTypesData.types || []) {
      try {
        // Insérer le type d'équipement
        await connection.execute(`
          INSERT INTO chimie_equipment_types (id, name, svg, is_custom, created_at, updated_at)
          VALUES (?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            svg = VALUES(svg),
            is_custom = VALUES(is_custom),
            updated_at = NOW()
        `, [
          type.id,
          type.name,
          type.svg || null,
          type.isCustom || false
        ]);
        
        console.log(`✅ Type d'équipement migré: ${type.name} (${type.id})`);
        
        // Insérer les items de ce type
        for (const item of type.items || []) {
          await connection.execute(`
            INSERT INTO chimie_equipment_items (id, name, svg, equipment_type_id, volumes, resolutions, tailles, materiaux, custom_fields, is_custom, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              svg = VALUES(svg),
              volumes = VALUES(volumes),
              resolutions = VALUES(resolutions),
              tailles = VALUES(tailles),
              materiaux = VALUES(materiaux),
              custom_fields = VALUES(custom_fields),
              is_custom = VALUES(is_custom),
              updated_at = NOW()
          `, [
            item.id,
            item.name,
            item.svg || null,
            type.id,
            item.volumes ? JSON.stringify(item.volumes) : null,
            item.resolutions ? JSON.stringify(item.resolutions) : null,
            item.tailles ? JSON.stringify(item.tailles) : null,
            item.materiaux ? JSON.stringify(item.materiaux) : null,
            item.customFields ? JSON.stringify(item.customFields) : null,
            item.isCustom || false
          ]);
          
          console.log(`  ✅ Item migré: ${item.name} (${item.id})`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur lors de la migration du type ${type.name}:`, error);
      }
    }

    // ====================
    // MIGRATION DES ÉQUIPEMENTS
    // ====================
    
    console.log('\n🔄 Migration des équipements...');
    
    // Créer un mapping des item_id vers type_id
    const itemToTypeMap = new Map();
    for (const type of equipmentTypesData.types || []) {
      for (const item of type.items || []) {
        itemToTypeMap.set(item.id, type.id);
      }
    }
    
    for (const equipment of equipmentInventoryData.equipment || []) {
      try {
        // Déterminer le bon equipment_type_id et equipment_item_id
        let equipmentTypeId = equipment.equipmentTypeId;
        let equipmentItemId = null;
        
        // Si equipmentTypeId correspond à un item_id, récupérer le type_id parent
        if (itemToTypeMap.has(equipmentTypeId)) {
          equipmentItemId = equipmentTypeId;
          equipmentTypeId = itemToTypeMap.get(equipmentTypeId);
        }
        
        console.log(`📝 Traitement: ${equipment.name}`);
        console.log(`  - Type original: ${equipment.equipmentTypeId}`);
        console.log(`  - Type final: ${equipmentTypeId}`);
        console.log(`  - Item final: ${equipmentItemId}`);
        
        await connection.execute(`
          INSERT INTO chimie_equipment  (
            id, name, equipment_type_id, equipment_item_id, model, serial_number, 
            barcode, quantity, min_quantity, volume, location, room, status, 
            purchase_date, notes, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            equipment_type_id = VALUES(equipment_type_id),
            equipment_item_id = VALUES(equipment_item_id),
            model = VALUES(model),
            serial_number = VALUES(serial_number),
            barcode = VALUES(barcode),
            quantity = VALUES(quantity),
            min_quantity = VALUES(min_quantity),
            volume = VALUES(volume),
            location = VALUES(location),
            room = VALUES(room),
            status = VALUES(status),
            purchase_date = VALUES(purchase_date),
            notes = VALUES(notes),
            updated_at = NOW()
        `, [
          equipment.id,
          equipment.name,
          equipmentTypeId,
          equipmentItemId,
          equipment.model || null,
          equipment.serialNumber || null,
          equipment.barcode || null,
          equipment.quantity || 1,
          equipment.minQuantity || null,
          equipment.volume || null,
          equipment.location || null,
          equipment.room || null,
          equipment.status || 'AVAILABLE',
          convertDateToMySQL(equipment.purchaseDate),
          equipment.notes || null,
          convertDateToMySQL(equipment.createdAt) || new Date().toISOString().slice(0, 19).replace('T', ' '),
          convertDateToMySQL(equipment.updatedAt) || new Date().toISOString().slice(0, 19).replace('T', ' ')
        ]);
        
        console.log(`✅ Équipement migré: ${equipment.name} (${equipment.id})`);
        
      } catch (error) {
        console.error(`❌ Erreur lors de la migration de l'équipement ${equipment.name}:`, error);
        console.error('Données:', {
          id: equipment.id,
          name: equipment.name,
          equipmentTypeId: equipment.equipmentTypeId,
          status: equipment.status
        });
      }
    }

    // ====================
    // VÉRIFICATIONS
    // ====================
    
    console.log('\n📊 Vérification des données migrées...');
    
    const [typesCount] = await connection.execute('SELECT COUNT(*) as count FROM chimie_equipment_types');
    const [itemsCount] = await connection.execute('SELECT COUNT(*) as count FROM chimie_equipment_items');
    const [equipmentCount] = await connection.execute('SELECT COUNT(*) as count FROM chimie_equipment');
    
    console.log(`✅ Types d'équipements migrés: ${typesCount[0].count}`);
    console.log(`✅ Items d'équipements migrés: ${itemsCount[0].count}`);
    console.log(`✅ Équipements migrés: ${equipmentCount[0].count}`);
    
    // Affichage des équipements par statut
    const [statusStats] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM chimie_equipment 
      GROUP BY status
    `);
    
    console.log('\n📈 Répartition par statut:');
    statusStats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count}`);
    });
    
    console.log('\n🎉 Migration des équipements terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration des équipements:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 Connexion MySQL fermée');
    }
  }
}

// Exécuter la migration
migrateEquipment().catch(console.error);
