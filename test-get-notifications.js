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
      LIMIT ? OFFSET ?
    `;
    
    const params = [userId, userId, userId, `"${userRole}"`, limit, offset];
    
    console.log('📋 SQL:', sql);
    console.log('📊 Params:', params);
    
    const [results] = await connection.execute(sql, params);
    
    console.log('✅ Résultats:', results.length, 'notification(s)');
    console.log('📝 Première notification:', results[0] || 'Aucune');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('🔧 Code:', error.code);
  } finally {
    await connection.end();
  }
}

testQuery();
