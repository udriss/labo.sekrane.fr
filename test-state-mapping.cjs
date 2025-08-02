// Script de test pour vérifier les états dans la base de données
// test-state-mapping.cjs

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USERNAME || 'int',
  password: process.env.DB_PASSWORD || 'DB_PASSWORD',
  database: process.env.DB_NAME || 'labo',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function testStateMapping() {
  let connection;
  
  try {
    console.log('🔄 Connexion à la base de données...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion établie\n');
    
    // Vérifier la structure des tables
    console.log('📋 Structure de calendar_chimie:');
    const [chimieStructure] = await connection.execute('DESCRIBE calendar_chimie');
    console.table(chimieStructure.filter(col => col.Field === 'state' || col.Field === 'status'));
    
    console.log('\n📋 Structure de calendar_physique:');
    const [physiqueStructure] = await connection.execute('DESCRIBE calendar_physique');
    console.table(physiqueStructure.filter(col => col.Field === 'state' || col.Field === 'status'));
    
    // Vérifier les données existantes
    console.log('\n📊 Distribution des états dans calendar_chimie:');
    const [chimieStates] = await connection.execute(
      'SELECT state, status, COUNT(*) as count FROM calendar_chimie GROUP BY state, status'
    );
    console.table(chimieStates);
    
    console.log('\n📊 Distribution des états dans calendar_physique:');
    const [physiqueStates] = await connection.execute(
      'SELECT state, status, COUNT(*) as count FROM calendar_physique GROUP BY state, status'
    );
    console.table(physiqueStates);
    
    // Vérifier les derniers événements
    console.log('\n🔍 Derniers événements de chimie (avec états):');
    const [latestChimie] = await connection.execute(
      'SELECT id, title, state, status, created_at FROM calendar_chimie ORDER BY created_at DESC LIMIT 3'
    );
    console.table(latestChimie);
    
    console.log('\n🔍 Derniers événements de physique (avec états):');
    const [latestPhysique] = await connection.execute(
      'SELECT id, title, state, status, created_at FROM calendar_physique ORDER BY created_at DESC LIMIT 3'
    );
    console.table(latestPhysique);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Suggestions:');
      console.log('   - Vérifiez les variables d\'environnement dans .env');
      console.log('   - Assurez-vous que MySQL est accessible');
      console.log('   - Vérifiez les permissions utilisateur');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 La table n\'existe pas. Avez-vous appliqué la migration ?');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔐 Connexion fermée');
    }
  }
}

testStateMapping();
