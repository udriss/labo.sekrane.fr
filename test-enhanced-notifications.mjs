#!/usr/bin/env node

// Test des notifications améliorées
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testEnhancedNotifications() {
  console.log('🧪 Test des notifications améliorées\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
  });

  try {
    // 1. Créer une notification de test pour chemical
    console.log('1. 🧪 Test notification CHEMICAL CREATE...');
    const chemicalNotification = {
      id: 'test_chem_' + Date.now(),
      user_role: 'ADMIN',
      target_roles: JSON.stringify(['ADMIN', 'LABORANTIN']),
      module: 'CHEMICALS',
      action_type: 'CREATE',
      message: JSON.stringify({
        messageToDisplay: 'Administrateur a ajouté Acide sulfurique (500ml) à l\'inventaire',
        log_message: 'Action CREATE effectuée sur chemical dans le module CHEMICALS'
      }),
      severity: 'medium',
      entity_type: 'chemical',
      entity_id: 'CHEM_TEST_123',
      triggered_by: '1'
    };

    await connection.execute(`
      INSERT INTO notifications (id, user_role, target_roles, module, action_type, message, severity, entity_type, entity_id, triggered_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      chemicalNotification.id,
      chemicalNotification.user_role,
      chemicalNotification.target_roles,
      chemicalNotification.module,
      chemicalNotification.action_type,
      chemicalNotification.message,
      chemicalNotification.severity,
      chemicalNotification.entity_type,
      chemicalNotification.entity_id,
      chemicalNotification.triggered_by
    ]);

    console.log(`✅ Notification chemical créée: ${chemicalNotification.id}`);

    // 2. Créer une notification de test pour chemical UPDATE avec quantité
    console.log('\n2. 🔄 Test notification CHEMICAL UPDATE (quantité)...');
    const chemicalUpdateNotification = {
      id: 'test_chem_update_' + Date.now(),
      user_role: 'ADMIN',
      target_roles: JSON.stringify(['ADMIN', 'LABORANTIN']),
      module: 'CHEMICALS',
      action_type: 'UPDATE',
      message: JSON.stringify({
        messageToDisplay: 'Administrateur a modifié la quantité de Acide sulfurique : 500ml → 250ml',
        log_message: 'Action UPDATE effectuée sur chemical dans le module CHEMICALS'
      }),
      severity: 'low',
      entity_type: 'chemical',
      entity_id: 'CHEM_TEST_123',
      triggered_by: '1'
    };

    await connection.execute(`
      INSERT INTO notifications (id, user_role, target_roles, module, action_type, message, severity, entity_type, entity_id, triggered_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      chemicalUpdateNotification.id,
      chemicalUpdateNotification.user_role,
      chemicalUpdateNotification.target_roles,
      chemicalUpdateNotification.module,
      chemicalUpdateNotification.action_type,
      chemicalUpdateNotification.message,
      chemicalUpdateNotification.severity,
      chemicalUpdateNotification.entity_type,
      chemicalUpdateNotification.entity_id,
      chemicalUpdateNotification.triggered_by
    ]);

    console.log(`✅ Notification chemical update créée: ${chemicalUpdateNotification.id}`);

    // 3. Créer une notification de test pour equipment
    console.log('\n3. 🔧 Test notification EQUIPMENT CREATE...');
    const equipmentNotification = {
      id: 'test_equip_' + Date.now(),
      user_role: 'ADMIN',
      target_roles: JSON.stringify(['ADMIN', 'LABORANTIN']),
      module: 'EQUIPMENT',
      action_type: 'CREATE',
      message: JSON.stringify({
        messageToDisplay: 'Administrateur a ajouté Bécher 250ml (5 unités) à l\'inventaire',
        log_message: 'Action CREATE effectuée sur equipment dans le module EQUIPMENT'
      }),
      severity: 'medium',
      entity_type: 'equipment',
      entity_id: 'EQUIP_TEST_123',
      triggered_by: '1'
    };

    await connection.execute(`
      INSERT INTO notifications (id, user_role, target_roles, module, action_type, message, severity, entity_type, entity_id, triggered_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      equipmentNotification.id,
      equipmentNotification.user_role,
      equipmentNotification.target_roles,
      equipmentNotification.module,
      equipmentNotification.action_type,
      equipmentNotification.message,
      equipmentNotification.severity,
      equipmentNotification.entity_type,
      equipmentNotification.entity_id,
      equipmentNotification.triggered_by
    ]);

    console.log(`✅ Notification equipment créée: ${equipmentNotification.id}`);

    // 4. Créer une notification de test pour equipment DELETE
    console.log('\n4. 🗑️ Test notification EQUIPMENT DELETE...');
    const equipmentDeleteNotification = {
      id: 'test_equip_delete_' + Date.now(),
      user_role: 'ADMIN',
      target_roles: JSON.stringify(['ADMIN', 'LABORANTIN']),
      module: 'EQUIPMENT',
      action_type: 'DELETE',
      message: JSON.stringify({
        messageToDisplay: 'Administrateur a supprimé Bécher cassé de l\'inventaire',
        log_message: 'Action DELETE effectuée sur equipment dans le module EQUIPMENT'
      }),
      severity: 'high',
      entity_type: 'equipment',
      entity_id: 'EQUIP_TEST_DELETED',
      triggered_by: '1'
    };

    await connection.execute(`
      INSERT INTO notifications (id, user_role, target_roles, module, action_type, message, severity, entity_type, entity_id, triggered_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      equipmentDeleteNotification.id,
      equipmentDeleteNotification.user_role,
      equipmentDeleteNotification.target_roles,
      equipmentDeleteNotification.module,
      equipmentDeleteNotification.action_type,
      equipmentDeleteNotification.message,
      equipmentDeleteNotification.severity,
      equipmentDeleteNotification.entity_type,
      equipmentDeleteNotification.entity_id,
      equipmentDeleteNotification.triggered_by
    ]);

    console.log(`✅ Notification equipment delete créée: ${equipmentDeleteNotification.id}`);

    // 5. Vérifier les notifications créées
    console.log('\n5. 📋 Vérification des notifications créées...');
    const [notifications] = await connection.execute(`
      SELECT id, module, action_type, message, severity, created_at
      FROM notifications 
      WHERE id LIKE 'test_%' 
      ORDER BY created_at DESC
    `);

    console.log(`\n📊 ${notifications.length} notifications de test trouvées:`);
    notifications.forEach((notif, i) => {
      try {
        // Vérifier si le message est déjà un objet ou une chaîne
        let messageObj;
        if (typeof notif.message === 'string') {
          if (notif.message.startsWith('{') || notif.message.startsWith('[')) {
            messageObj = JSON.parse(notif.message);
          } else {
            messageObj = { log_message: notif.message, messageToDisplay: notif.message };
          }
        } else {
          messageObj = notif.message;
        }
        
        console.log(`   ${i+1}. [${notif.module}:${notif.action_type}] ${notif.severity.toUpperCase()}`);
        console.log(`      💬 Display: ${messageObj.messageToDisplay || 'N/A'}`);
        console.log(`      📝 Log: ${messageObj.log_message || 'N/A'}`);
        console.log(`      🕒 ${notif.created_at}\n`);
      } catch (e) {
        console.log(`   ${i+1}. [${notif.module}:${notif.action_type}] Message brut: ${notif.message}`);
        console.log(`      ⚠️ Erreur de parsing: ${e.message}\n`);
      }
    });

    // 6. Test de comparaison avec les anciennes notifications
    console.log('6. 🔍 Comparaison avec les anciennes notifications...');
    const [oldNotifications] = await connection.execute(`
      SELECT id, module, action_type, message, created_at
      FROM notifications 
      WHERE id NOT LIKE 'test_%' 
      AND message NOT LIKE '%messageToDisplay%'
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    console.log(`\n📋 Exemple d'anciennes notifications (format simple):`);
    oldNotifications.forEach((notif, i) => {
      console.log(`   ${i+1}. [${notif.module}:${notif.action_type}] ${notif.message}`);
    });

    console.log('\n✅ Test des notifications améliorées terminé!');
    console.log('🎯 Les nouvelles notifications incluent maintenant:');
    console.log('   - messageToDisplay: Message convivial pour les utilisateurs');
    console.log('   - log_message: Message technique pour les logs/admin');
    console.log('   - Informations spécifiques (noms, quantités, changements)');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await connection.end();
  }
}

// Exécuter le test
testEnhancedNotifications().catch(console.error);
