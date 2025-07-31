#!/usr/bin/env node

// Test d'affichage de la notification manuelle
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testManualNotification() {
  console.log('🧪 Test de la notification insérée manuellement\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
  });

  try {
    // Récupérer la notification manuelle
    const [notifications] = await connection.execute(`
      SELECT id, CAST(message AS CHAR) as message, module, action_type, severity, created_at
      FROM notifications 
      WHERE id LIKE 'manual_test_%'
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (notifications.length === 0) {
      console.log('❌ Aucune notification manuelle trouvée');
      return;
    }

    const notif = notifications[0];
    console.log(`📬 Notification trouvée: ${notif.id}`);
    console.log(`   Module: ${notif.module} | Action: ${notif.action_type}`);
    console.log(`   Message brut: ${notif.message}`);

    // Test du parsing
    try {
      const messageObj = JSON.parse(notif.message);
      console.log('\n✅ Parsing JSON réussi:');
      console.log(`   💬 Message utilisateur: "${messageObj.messageToDisplay}"`);
      console.log(`   📝 Message log: "${messageObj.log_message}"`);

      // Test de la logique d'affichage frontend
      const frontendDisplayLogic = (message) => {
        try {
          const messageObj = JSON.parse(message);
          
          if (typeof messageObj === 'object' && messageObj.messageToDisplay) {
            return {
              text: messageObj.messageToDisplay,
              type: 'enhanced',
              logMessage: messageObj.log_message
            };
          } else if (typeof messageObj === 'string') {
            return {
              text: messageObj,
              type: 'legacy'
            };
          }
          
          return {
            text: 'Format non reconnu',
            type: 'unknown'
          };
        } catch (e) {
          return {
            text: 'Message indisponible',
            type: 'error'
          };
        }
      };

      const display = frontendDisplayLogic(notif.message);
      console.log('\n🖥️ Affichage frontend:');
      console.log(`   Type: ${display.type}`);
      console.log(`   Texte: "${display.text}"`);
      if (display.logMessage) {
        console.log(`   Log: "${display.logMessage}"`);
      }

    } catch (e) {
      console.log(`❌ Erreur parsing: ${e.message}`);
    }

    console.log('\n✅ Test terminé!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await connection.end();
  }
}

testManualNotification().catch(console.error);
