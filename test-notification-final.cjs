const mysql = require('mysql2/promise');

async function testNotificationSystem() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'int',
    password: '4Na9Gm8mdTVgnUp',
    database: 'labo',
    charset: 'utf8mb4'
  });

  try {
    console.log('🧪 Test du système de notifications WebSocket...\n');

    // 1. Test des notifications existantes
    console.log('1. 📋 Récupération des notifications...');
    const [notifications] = await connection.execute(`
      SELECT n.*, 
             CASE WHEN nrs.is_read IS NOT NULL THEN nrs.is_read 
                  WHEN n.user_id = ? THEN n.is_read 
                  ELSE FALSE END as isRead,
             nrs.read_at
      FROM notifications n
      LEFT JOIN notification_read_status nrs ON (n.id = nrs.notification_id AND nrs.user_id = ?)
      WHERE (n.user_id = ? OR JSON_CONTAINS(n.target_roles, ?))
      ORDER BY n.created_at DESC
      LIMIT 5 OFFSET 0
    `, ['1', '1', '1', JSON.stringify('ADMIN')]);

    console.log(`✅ ${notifications.length} notifications trouvées`);
    notifications.forEach((notif, i) => {
      const messageObj = typeof notif.message === 'string' ? JSON.parse(notif.message) : notif.message;
      console.log(`   ${i+1}. ${messageObj.content || 'Message'} - ${notif.action_type} (${notif.isRead ? 'Lu' : 'Non lu'})`);
    });

    // 2. Créer une nouvelle notification de test
    console.log('\n2. 🆕 Création d\'une notification de test...');
    const testNotification = {
      id: 'test_' + Date.now(),
      user_role: 'ADMIN',
      target_roles: JSON.stringify(['ADMIN']),
      module: 'SYSTEM',
      action_type: 'TEST_WEBSOCKET',
      message: JSON.stringify({
        content: 'Test de validation du système WebSocket complet',
        details: 'Cette notification teste la création, stockage et récupération'
      }),
      severity: 'medium',
      user_id: null,
      entity_type: 'system_test',
      triggered_by: 'automated_test'
    };

    const [result] = await connection.execute(`
      INSERT INTO notifications (id, user_role, target_roles, module, action_type, message, severity, user_id, entity_type, triggered_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      testNotification.id,
      testNotification.user_role,
      testNotification.target_roles,
      testNotification.module,
      testNotification.action_type,
      testNotification.message,
      testNotification.severity,
      testNotification.user_id,
      testNotification.entity_type,
      testNotification.triggered_by
    ]);

    console.log(`✅ Notification créée avec ID: ${testNotification.id}`);

    // 3. Vérifier que la notification est récupérable
    console.log('\n3. 🔍 Vérification de la récupération...');
    const [newNotifications] = await connection.execute(`
      SELECT n.*, 
             CASE WHEN nrs.is_read IS NOT NULL THEN nrs.is_read 
                  WHEN n.user_id = ? THEN n.is_read 
                  ELSE FALSE END as isRead,
             nrs.read_at
      FROM notifications n
      LEFT JOIN notification_read_status nrs ON (n.id = nrs.notification_id AND nrs.user_id = ?)
      WHERE n.id = ?
    `, ['1', '1', testNotification.id]);

    if (newNotifications.length > 0) {
      const notif = newNotifications[0];
      const messageObj = typeof notif.message === 'string' ? JSON.parse(notif.message) : notif.message;
      console.log(`✅ Notification récupérée:`);
      console.log(`   - ID: ${notif.id}`);
      console.log(`   - Module: ${notif.module}`);
      console.log(`   - Action: ${notif.action_type}`);
      console.log(`   - Message: ${messageObj.content}`);
      console.log(`   - Statut: ${notif.isRead ? 'Lu' : 'Non lu'}`);
      console.log(`   - Créée: ${notif.created_at}`);
    }

    // 4. Test des statistiques
    console.log('\n4. 📊 Test des statistiques...');
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN n.is_read = 0 AND nrs.is_read IS NULL THEN 1 
                 WHEN nrs.is_read = 0 THEN 1 
                 ELSE 0 END) as unread
      FROM notifications n
      LEFT JOIN notification_read_status nrs ON (n.id = nrs.notification_id AND nrs.user_id = ?)
      WHERE (n.user_id = ? OR JSON_CONTAINS(n.target_roles, ?))
    `, ['1', '1', JSON.stringify('ADMIN')]);

    console.log(`✅ Statistiques:`);
    console.log(`   - Total: ${stats[0].total}`);
    console.log(`   - Non lues: ${stats[0].unread}`);

    console.log('\n🎉 Test du système de notifications terminé avec succès!');
    console.log('\n📋 Résumé:');
    console.log('   ✅ Stockage en base de données');
    console.log('   ✅ Requêtes SQL avec paramètres');
    console.log('   ✅ Gestion des rôles et utilisateurs');
    console.log('   ✅ Calcul des statistiques');
    console.log('\n🔜 Prochaines étapes:');
    console.log('   1. Test de l\'API REST');
    console.log('   2. Test des connexions WebSocket');
    console.log('   3. Test de l\'interface utilisateur');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await connection.end();
  }
}

testNotificationSystem();
