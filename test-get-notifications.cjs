const mysql = require('mysql2/promise');

async function testQuery() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'int',
    password: '4Na9Gm8mdTVgnUp',
    database: 'labo',
    charset: 'utf8mb4'
  });

  try {
    console.log('🔍 Test de la requête SQL pour récupérer les notifications...');
    
    const userId = '1';
    const userRole = 'ADMIN';
    const limit = 5;
    const offset = 0;
    
    // Test simple d'abord
    console.log('📋 Test 1: Requête simple');
    const [simple] = await connection.execute(
      'SELECT COUNT(*) as count FROM notifications', 
      []
    );
    console.log('✅ Count total:', simple[0].count);
    
    // Test avec paramètres basiques
    console.log('📋 Test 2: Requête avec WHERE simple');
    const [basicResults] = await connection.execute(
      'SELECT * FROM notifications WHERE user_id = ? LIMIT ?', 
      [userId, limit]
    );
    console.log('✅ Résultats basiques:', basicResults.length);
    
    // Test JSON_CONTAINS
    console.log('� Test 3: Test JSON_CONTAINS');
    const [jsonResults] = await connection.execute(
      'SELECT * FROM notifications WHERE JSON_CONTAINS(target_roles, ?) LIMIT ?', 
      [`"${userRole}"`, limit]
    );
    console.log('✅ Résultats JSON:', jsonResults.length);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('🔧 Code:', error.code);
    console.error('🔧 SQL State:', error.sqlState);
  } finally {
    await connection.end();
  }
}

testQuery();
