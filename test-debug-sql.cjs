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
    
    // Test simple d'abord
    console.log('📋 Test 1: Requête simple');
    const [simple] = await connection.execute(
      'SELECT COUNT(*) as count FROM notifications', 
      []
    );
    console.log('✅ Count total:', simple[0].count);
    
    // Test avec un paramètre simple
    console.log('📋 Test 2: Requête avec un seul paramètre');
    const [oneParam] = await connection.execute(
      'SELECT * FROM notifications WHERE user_id = ?', 
      ['1']
    );
    console.log('✅ Un paramètre:', oneParam.length);
    
    // Test avec deux paramètres 
    console.log('📋 Test 3: Requête avec deux paramètres');
    const [twoParams] = await connection.execute(
      'SELECT * FROM notifications WHERE user_id = ? OR user_id = ?', 
      ['1', '2']
    );
    console.log('✅ Deux paramètres:', twoParams.length);
    
    // Test avec LIMIT sans paramètre
    console.log('📋 Test 4: Requête avec LIMIT sans paramètre');
    const [limitStatic] = await connection.execute(
      'SELECT * FROM notifications WHERE user_id = ? LIMIT 5', 
      ['1']
    );
    console.log('✅ LIMIT static:', limitStatic.length);
    
    // Test JSON_CONTAINS avec bon format
    console.log('📋 Test 5: Test JSON_CONTAINS avec JSON.stringify');
    const userRole = 'ADMIN';
    console.log('📦 Paramètre JSON_CONTAINS:', JSON.stringify(userRole));
    const [jsonResults] = await connection.execute(
      'SELECT * FROM notifications WHERE JSON_CONTAINS(target_roles, ?)', 
      [JSON.stringify(userRole)]
    );
    console.log('✅ Résultats JSON:', jsonResults.length);
    
    // Test de la requête complète SANS LIMIT/OFFSET en paramètres
    console.log('📋 Test 6: Requête complète sans LIMIT/OFFSET en paramètres');
    const userId = '1';
    const limit = 5;
    const offset = 0;
    
    const params = [userId, userId, userId, JSON.stringify(userRole)];
    console.log('📦 Paramètres sans LIMIT/OFFSET:', params);
    
    const sql = `
      SELECT n.*, 
             CASE WHEN nrs.is_read IS NOT NULL THEN nrs.is_read 
                  WHEN n.user_id = ? THEN n.is_read 
                  ELSE FALSE END as isRead,
             nrs.read_at
      FROM notifications n
      LEFT JOIN notification_read_status nrs ON (n.id = nrs.notification_id AND nrs.user_id = ?)
      WHERE (n.user_id = ? OR JSON_CONTAINS(n.target_roles, ?))
      ORDER BY n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const [fullResults] = await connection.execute(sql, params);
    console.log('✅ Requête complète:', fullResults.length, 'notification(s)');
    if (fullResults[0]) {
      console.log('📝 Première notification:', {
        id: fullResults[0].id,
        module: fullResults[0].module,
        action_type: fullResults[0].action_type,
        isRead: fullResults[0].isRead
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('🔧 Code:', error.code);
    console.error('🔧 SQL State:', error.sqlState);
  } finally {
    await connection.end();
  }
}

testQuery();
