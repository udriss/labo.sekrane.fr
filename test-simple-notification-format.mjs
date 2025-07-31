#!/usr/bin/env node

// Test simple de l'amélioration des notifications
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testSimpleNotificationFormat() {
  console.log('🧪 Test simple du nouveau format de notifications\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
  });

  try {
    // 1. Insérer directement avec la bonne syntaxe JSON
    console.log('1. 🔔 Insertion de notifications test...');
    
    const testId = 'simple_test_' + Date.now();
    
    // Message au format JSON avec messageToDisplay et log_message
    const jsonMessage = JSON.stringify({
      messageToDisplay: "Administrateur a ajouté Acide sulfurique (500ml) à l'inventaire",
      log_message: "Action CREATE effectuée sur chemical dans le module CHEMICALS"
    });

    await connection.execute(`
      INSERT INTO notifications (
        id, user_role, target_roles, module, action_type, message, 
        severity, entity_type, entity_id, triggered_by, created_at
      ) VALUES (?, 'ADMIN', ?, 'CHEMICALS', 'CREATE', ?, 'medium', 'chemical', 'TEST_ID', '1', NOW())
    `, [
      testId,
      JSON.stringify(['ADMIN', 'LABORANTIN']),
      jsonMessage
    ]);

    console.log(`✅ Notification JSON créée: ${testId}`);

    // 2. Insérer une notification ancienne format
    const oldTestId = 'old_simple_test_' + Date.now();
    
    await connection.execute(`
      INSERT INTO notifications (
        id, user_role, target_roles, module, action_type, message, 
        severity, entity_type, entity_id, triggered_by, created_at
      ) VALUES (?, 'ADMIN', ?, 'CHEMICALS', 'CREATE', ?, 'medium', 'chemical', 'TEST_ID', '1', NOW())
    `, [
      oldTestId,
      JSON.stringify(['ADMIN']),
      '"Action CREATE effectuée sur chemical dans le module CHEMICALS"' // Ancien format avec guillemets JSON
    ]);

    console.log(`✅ Notification ancienne créée: ${oldTestId}`);

    // 3. Récupérer et afficher
    console.log('\n2. 📋 Récupération et affichage...');
    
    const [notifications] = await connection.execute(`
      SELECT id, message, created_at, JSON_VALID(message) as is_valid_json
      FROM notifications 
      WHERE id IN (?, ?)
      ORDER BY created_at
    `, [testId, oldTestId]);

    notifications.forEach((notif, i) => {
      console.log(`\n   ${i === 0 ? 'NOUVEAU' : 'ANCIEN'} FORMAT (${notif.id}):`);
      console.log(`   📋 JSON valide: ${notif.is_valid_json ? 'Oui' : 'Non'}`);
      
      try {
        const messageObj = JSON.parse(notif.message);
        
        if (typeof messageObj === 'object' && messageObj.messageToDisplay) {
          console.log(`   💬 Message utilisateur: "${messageObj.messageToDisplay}"`);
          console.log(`   📝 Message log: "${messageObj.log_message}"`);
        } else {
          console.log(`   📝 Message simple: "${messageObj}"`);
        }
      } catch (e) {
        console.log(`   ❌ Erreur parsing: ${e.message}`);
        console.log(`   📄 Message brut: ${notif.message}`);
      }
    });

    // 4. Test de logique d'affichage frontend
    console.log('\n3. 🖥️ Logique d\'affichage frontend...');
    
    const displayLogic = (notification) => {
      try {
        const messageObj = JSON.parse(notification.message);
        
        // Nouvelle logique : privilégier messageToDisplay
        if (typeof messageObj === 'object' && messageObj.messageToDisplay) {
          return messageObj.messageToDisplay;
        }
        // Ancienne logique : utiliser le message simple
        else if (typeof messageObj === 'string') {
          return messageObj;
        }
        // Fallback
        return 'Notification système';
      } catch (e) {
        return 'Message indisponible';
      }
    };

    notifications.forEach((notif, i) => {
      const displayText = displayLogic(notif);
      console.log(`   ${i === 0 ? 'NOUVEAU' : 'ANCIEN'}: "${displayText}"`);
    });

    console.log('\n✅ Test terminé avec succès!');
    
    // 5. Nettoyage
    await connection.execute(`
      DELETE FROM notifications 
      WHERE id IN (?, ?)
    `, [testId, oldTestId]);
    
    console.log('🧹 Notifications de test supprimées');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await connection.end();
  }
}

// Exécuter le test
testSimpleNotificationFormat().catch(console.error);
