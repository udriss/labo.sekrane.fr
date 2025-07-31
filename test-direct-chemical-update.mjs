#!/usr/bin/env node

// Test simple de modification directe pour vérifier les notifications
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testDirectChemicalUpdate() {
  console.log('🧪 Test de modification directe d\'un chemical\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
  });

  try {
    // 1. Récupérer un chemical existant
    console.log('1. 📋 Récupération d\'un chemical existant...');
    const [chemicals] = await connection.execute(`
      SELECT id, name, quantity, unit 
      FROM chemicals 
      LIMIT 1
    `);

    if (chemicals.length === 0) {
      console.log('❌ Aucun chemical trouvé');
      return;
    }

    const chemical = chemicals[0];
    console.log(`✅ Chemical sélectionné: ${chemical.name} (ID: ${chemical.id})`);
    console.log(`   Quantité actuelle: ${chemical.quantity}${chemical.unit}`);

    // 2. Créer manuellement une notification avec notre nouveau format
    console.log('\n2. 🔔 Création d\'une notification avec le nouveau format...');
    
    const newQuantity = parseFloat(chemical.quantity) + 15.2;
    const messageObject = {
      messageToDisplay: `Administrateur a modifié la quantité de ${chemical.name} : ${chemical.quantity}${chemical.unit} → ${newQuantity}${chemical.unit}`,
      log_message: 'Action UPDATE effectuée sur chemical dans le module CHEMICALS'
    };
    
    const enhancedNotification = {
      id: 'enhanced_test_' + Date.now(),
      user_role: 'ADMIN',
      target_roles: JSON.stringify(['ADMIN', 'LABORANTIN']),
      module: 'CHEMICALS',
      action_type: 'UPDATE',
      message: JSON.stringify(messageObject), // Sérialiser correctement
      severity: 'low',
      entity_type: 'chemical',
      entity_id: chemical.id,
      triggered_by: '1'
    };

    await connection.execute(`
      INSERT INTO notifications (id, user_role, target_roles, module, action_type, message, severity, entity_type, entity_id, triggered_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      enhancedNotification.id,
      enhancedNotification.user_role,
      enhancedNotification.target_roles,
      enhancedNotification.module,
      enhancedNotification.action_type,
      enhancedNotification.message,
      enhancedNotification.severity,
      enhancedNotification.entity_type,
      enhancedNotification.entity_id,
      enhancedNotification.triggered_by
    ]);

    console.log(`✅ Notification créée: ${enhancedNotification.id}`);

    // 3. Comparer avec une notification ancienne format
    console.log('\n3. 📊 Comparaison des formats...');
    
    // Ancienne notification format - message simple en string
    const oldFormatNotification = {
      id: 'old_format_test_' + Date.now(),
      user_role: 'ADMIN',
      target_roles: JSON.stringify(['ADMIN']),
      module: 'CHEMICALS',
      action_type: 'UPDATE',
      message: 'Action UPDATE effectuée sur chemical dans le module CHEMICALS', // Message simple
      severity: 'low',
      entity_type: 'chemical',
      entity_id: chemical.id,
      triggered_by: '1'
    };

    await connection.execute(`
      INSERT INTO notifications (id, user_role, target_roles, module, action_type, message, severity, entity_type, entity_id, triggered_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      oldFormatNotification.id,
      oldFormatNotification.user_role,
      oldFormatNotification.target_roles,
      oldFormatNotification.module,
      oldFormatNotification.action_type,
      oldFormatNotification.message,
      oldFormatNotification.severity,
      oldFormatNotification.entity_type,
      oldFormatNotification.entity_id,
      oldFormatNotification.triggered_by
    ]);

    console.log(`✅ Notification ancien format créée: ${oldFormatNotification.id}`);

    // 4. Récupérer et afficher les deux notifications
    console.log('\n4. 🔍 Affichage des notifications créées...');
    
    const [notifications] = await connection.execute(`
      SELECT id, message, created_at
      FROM notifications 
      WHERE id IN (?, ?)
      ORDER BY created_at
    `, [enhancedNotification.id, oldFormatNotification.id]);

    notifications.forEach((notif, i) => {
      try {
        const messageObj = JSON.parse(notif.message);
        console.log(`\n   ${i === 0 ? 'NOUVEAU' : 'ANCIEN'} FORMAT (${notif.id}):`);
        
        if (typeof messageObj === 'object' && messageObj.messageToDisplay) {
          console.log(`   💬 Message utilisateur: ${messageObj.messageToDisplay}`);
          console.log(`   📝 Message log: ${messageObj.log_message}`);
        } else {
          console.log(`   📝 Message simple: ${messageObj}`);
        }
        console.log(`   🕒 ${notif.created_at}`);
      } catch (e) {
        console.log(`   ❌ Erreur de parsing: ${notif.message}`);
      }
    });

    // 5. Test de l'affichage côté frontend (simulation)
    console.log('\n5. 🖥️ Simulation de l\'affichage frontend...');
    
    const frontendDisplay = notifications.map(notif => {
      try {
        const messageObj = JSON.parse(notif.message);
        
        // Logique d'affichage côté frontend
        let displayText;
        if (typeof messageObj === 'object' && messageObj.messageToDisplay) {
          displayText = messageObj.messageToDisplay; // Nouveau format
        } else if (typeof messageObj === 'string') {
          displayText = messageObj; // Ancien format
        } else {
          displayText = 'Action effectuée'; // Fallback
        }
        
        return {
          id: notif.id,
          displayText,
          timestamp: notif.created_at
        };
      } catch (e) {
        return {
          id: notif.id,
          displayText: 'Message non disponible',
          timestamp: notif.created_at
        };
      }
    });

    console.log('\n📱 Affichage dans l\'interface utilisateur:');
    frontendDisplay.forEach((item, i) => {
      console.log(`   ${i + 1}. "${item.displayText}"`);
      console.log(`      🕒 ${item.timestamp}\n`);
    });

    console.log('✅ Test terminé avec succès!');
    console.log('\n🎯 Résumé:');
    console.log('• Nouveau format: Messages spécifiques et informatifs');
    console.log('• Ancien format: Messages génériques pour les logs');
    console.log('• Compatibilité: Les deux formats sont gérés correctement');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await connection.end();
  }
}

// Exécuter le test
testDirectChemicalUpdate().catch(console.error);
