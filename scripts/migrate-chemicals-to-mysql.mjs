// scripts/migrate-chemicals-to-mysql.mjs
// Script pour migrer les données chemicals du JSON vers MySQL

import fs from 'fs/promises';
import path from 'path';
import { query, initializeDatabase, closePool } from '../lib/db.ts';

const CHEMICALS_FILE = path.join(process.cwd(), 'data', 'chemicals-inventory.json');

async function migrateChemicalsToMySQL() {
  try {
    console.log('🔄 Initialisation de la base de données...');
    await initializeDatabase();
    console.log('✅ Base de données initialisée');

    // Lire le fichier JSON s'il existe
    let chemicalsData = null;
    try {
      const fileContent = await fs.readFile(CHEMICALS_FILE, 'utf-8');
      chemicalsData = JSON.parse(fileContent);
      console.log(`📁 Fichier JSON trouvé avec ${chemicalsData.chemicals?.length || 0} chemicals`);
    } catch (error) {
      console.log('📁 Aucun fichier JSON trouvé ou erreur de lecture:', error.message);
      return;
    }

    if (!chemicalsData?.chemicals || chemicalsData.chemicals.length === 0) {
      console.log('ℹ️ Aucun chemical à migrer');
      return;
    }

    // Vérifier les chemicals existants dans la DB
    const existingChemicals = await query('SELECT id FROM chemicals');
    const existingIds = new Set(existingChemicals.map(c => c.id));
    console.log(`🔍 ${existingChemicals.length} chemicals déjà présents dans la DB`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const chemical of chemicalsData.chemicals) {
      try {
        if (existingIds.has(chemical.id)) {
          console.log(`⏭️ Chemical ${chemical.name} (${chemical.id}) déjà présent, ignoré`);
          skippedCount++;
          continue;
        }

        // Fonction pour convertir les dates ISO en format MySQL
        const convertDate = (dateString) => {
          if (!dateString) return null;
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return null;
          return date.toISOString().slice(0, 19).replace('T', ' '); // Format YYYY-MM-DD HH:MM:SS
        };

        // Vérifier si le supplierId existe, sinon l'ignorer
        let validSupplierId = null;
        if (chemical.supplierId) {
          const supplierExists = await query('SELECT id FROM suppliers WHERE id = ?', [chemical.supplierId]);
          if (supplierExists.length > 0) {
            validSupplierId = chemical.supplierId;
          }
        }

        // Insérer le chemical dans MySQL
        await query(`
          INSERT INTO chemicals (
            id, name, formula, casNumber, quantity, unit, minQuantity, 
            concentration, purchaseDate, expirationDate, storage, room, 
            hazardClass, supplierId, status, notes, quantityPrevision,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          chemical.id,
          chemical.name,
          chemical.formula || null,
          chemical.casNumber || null,
          chemical.quantity || 0,
          chemical.unit || 'g',
          chemical.minQuantity || null,
          chemical.concentration || null,
          convertDate(chemical.purchaseDate),
          convertDate(chemical.expirationDate),
          chemical.storage || null,
          chemical.room || null,
          chemical.hazardClass || null,
          validSupplierId, // Utiliser validSupplierId au lieu de chemical.supplierId
          chemical.status || 'IN_STOCK',
          chemical.notes || null,
          chemical.quantityPrevision || chemical.quantity || 0,
          convertDate(chemical.createdAt) || convertDate(new Date().toISOString()),
          convertDate(chemical.updatedAt) || convertDate(new Date().toISOString())
        ]);

        console.log(`✅ Chemical ${chemical.name} migré avec succès`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Erreur lors de la migration de ${chemical.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Résumé de la migration:');
    console.log(`   ✅ Migrés: ${migratedCount}`);
    console.log(`   ⏭️ Ignorés: ${skippedCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);

    // Créer un backup du fichier JSON
    if (migratedCount > 0) {
      const backupPath = CHEMICALS_FILE + '.backup.' + Date.now();
      await fs.copyFile(CHEMICALS_FILE, backupPath);
      console.log(`💾 Sauvegarde du fichier JSON créée: ${backupPath}`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    await closePool();
    console.log('🔌 Connexion fermée');
  }
}

migrateChemicalsToMySQL();
