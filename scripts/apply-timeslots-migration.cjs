const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lab_management',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function applyMigration() {
  let connection;
  
  try {
    console.log('🔄 Connexion à la base de données...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion établie');
    
    // Vérifier si le champ state existe déjà
    console.log('🔍 Vérification de la structure actuelle des tables...');
    
    // Vérifier table calendar_chimie
    const [chimieColumns] = await connection.execute(
      "SHOW COLUMNS FROM calendar_chimie LIKE 'state'"
    );
    
    if (chimieColumns.length === 0) {
      console.log('📝 Ajout du champ state à calendar_chimie...');
      await connection.execute(`
        ALTER TABLE calendar_chimie 
        ADD COLUMN state ENUM('PENDING', 'VALIDATED', 'CANCELLED', 'MOVED', 'IN_PROGRESS') 
        DEFAULT 'PENDING' AFTER status
      `);
      console.log('✅ Champ state ajouté à calendar_chimie');
    } else {
      console.log('ℹ️  Le champ state existe déjà dans calendar_chimie');
    }
    
    // Vérifier table calendar_physique
    const [physiqueColumns] = await connection.execute(
      "SHOW COLUMNS FROM calendar_physique LIKE 'state'"
    );
    
    if (physiqueColumns.length === 0) {
      console.log('📝 Ajout du champ state à calendar_physique...');
      await connection.execute(`
        ALTER TABLE calendar_physique 
        ADD COLUMN state ENUM('PENDING', 'VALIDATED', 'CANCELLED', 'MOVED', 'IN_PROGRESS') 
        DEFAULT 'PENDING' AFTER status
      `);
      console.log('✅ Champ state ajouté à calendar_physique');
    } else {
      console.log('ℹ️  Le champ state existe déjà dans calendar_physique');
    }
    
    // Migrer les données existantes : convertir status -> state
    console.log('🔄 Migration des données existantes...');
    
    await connection.execute(`
      UPDATE calendar_chimie 
      SET state = CASE 
        WHEN status = 'scheduled' THEN 'PENDING'
        WHEN status = 'in_progress' THEN 'IN_PROGRESS' 
        WHEN status = 'completed' THEN 'VALIDATED'
        WHEN status = 'cancelled' THEN 'CANCELLED'
        ELSE 'PENDING'
      END
      WHERE state = 'PENDING'
    `);
    
    await connection.execute(`
      UPDATE calendar_physique 
      SET state = CASE 
        WHEN status = 'scheduled' THEN 'PENDING'
        WHEN status = 'in_progress' THEN 'IN_PROGRESS'
        WHEN status = 'completed' THEN 'VALIDATED' 
        WHEN status = 'cancelled' THEN 'CANCELLED'
        ELSE 'PENDING'
      END
      WHERE state = 'PENDING'
    `);
    
    console.log('✅ Migration des données terminée');
    
    // Ajouter des index pour améliorer les performances
    console.log('📊 Ajout des index...');
    
    try {
      await connection.execute('ALTER TABLE calendar_chimie ADD INDEX idx_state (state)');
      console.log('✅ Index idx_state ajouté à calendar_chimie');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Index idx_state existe déjà dans calendar_chimie');
      } else {
        throw error;
      }
    }
    
    try {
      await connection.execute('ALTER TABLE calendar_physique ADD INDEX idx_state (state)');
      console.log('✅ Index idx_state ajouté à calendar_physique');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Index idx_state existe déjà dans calendar_physique');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 Migration TimeSlots terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 Connexion fermée');
    }
  }
}

// Exécuter la migration
applyMigration();
