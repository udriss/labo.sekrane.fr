#!/usr/bin/env node

// Test de lecture et affichage des notifications améliorées
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testNotificationDisplay() {
  console.log('🧪 Test d\'affichage des notifications améliorées\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
  });

  try {
    // 1. Récupérer quelques notifications récentes
    console.log('1. 📋 Récupération des notifications récentes...');
    
    const [notifications] = await connection.execute(`
      SELECT id, module, action_type, message, severity, created_at
      FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log(`✅ ${notifications.length} notifications trouvées\n`);

    // 2. Analyser et afficher chaque notification
    console.log('2. 🔍 Analyse des formats de messages...\n');
    
    notifications.forEach((notif, i) => {
      console.log(`📬 Notification ${i + 1} (${notif.id.substring(0, 20)}...)`);
      console.log(`   Module: ${notif.module} | Action: ${notif.action_type} | Sévérité: ${notif.severity}`);
      console.log(`   Créée: ${notif.created_at}`);
      
      try {
        const messageObj = JSON.parse(notif.message);
        
        if (typeof messageObj === 'object' && messageObj !== null) {
          if (messageObj.messageToDisplay && messageObj.log_message) {
            // Nouveau format avec messageToDisplay et log_message
            console.log(`   📱 FORMAT AMÉLIORÉ:`);
            console.log(`      💬 Message utilisateur: "${messageObj.messageToDisplay}"`);
            console.log(`      📝 Message log: "${messageObj.log_message}"`);
          } else {
            // Autre format objet
            console.log(`   📄 FORMAT OBJET: ${JSON.stringify(messageObj)}`);
          }
        } else if (typeof messageObj === 'string') {
          // Ancien format simple
          console.log(`   📜 FORMAT SIMPLE: "${messageObj}"`);
        } else {
          console.log(`   ❓ FORMAT INCONNU: ${typeof messageObj}`);
        }
      } catch (e) {
        console.log(`   ❌ ERREUR JSON: ${e.message}`);
        console.log(`   📄 Message brut: ${notif.message}`);
      }
      
      console.log(''); // Ligne vide entre les notifications
    });

    // 3. Simuler l'affichage côté frontend
    console.log('3. 🖥️ Simulation d\'affichage frontend...\n');
    
    const getDisplayMessage = (notification) => {
      try {
        const messageObj = JSON.parse(notification.message);
        
        // Logique d'affichage prioritaire
        if (typeof messageObj === 'object' && messageObj.messageToDisplay) {
          return {
            text: messageObj.messageToDisplay,
            type: 'enhanced'
          };
        } else if (typeof messageObj === 'string') {
          return {
            text: messageObj,
            type: 'simple'
          };
        } else {
          return {
            text: 'Notification système',
            type: 'fallback'
          };
        }
      } catch (e) {
        return {
          text: 'Message indisponible',
          type: 'error'
        };
      }
    };

    console.log('📱 Interface utilisateur - Panneau de notifications:\n');
    console.log('┌' + '─'.repeat(80) + '┐');
    console.log('│' + ' '.repeat(30) + 'NOTIFICATIONS' + ' '.repeat(37) + '│');
    console.log('├' + '─'.repeat(80) + '┤');
    
    notifications.forEach((notif, i) => {
      const display = getDisplayMessage(notif);
      const typeEmoji = {
        enhanced: '⭐',
        simple: '📄',
        fallback: '⚙️',
        error: '❌'
      };
      
      const timeAgo = new Date(Date.now() - new Date(notif.created_at).getTime());
      const minutesAgo = Math.floor(timeAgo / (1000 * 60));
      
      console.log(`│ ${typeEmoji[display.type]} ${display.text.substring(0, 65).padEnd(65)} ${minutesAgo}m │`);
    });
    
    console.log('└' + '─'.repeat(80) + '┘\n');

    // 4. Statistiques
    console.log('4. 📊 Statistiques des formats...\n');
    
    const stats = {
      enhanced: 0,
      simple: 0,
      other: 0,
      error: 0
    };

    notifications.forEach(notif => {
      const display = getDisplayMessage(notif);
      stats[display.type]++;
    });

    console.log('📈 Répartition des formats:');
    console.log(`   ⭐ Format amélioré: ${stats.enhanced}/${notifications.length}`);
    console.log(`   📄 Format simple: ${stats.simple}/${notifications.length}`);
    console.log(`   ⚙️ Autres: ${stats.fallback}/${notifications.length}`);
    console.log(`   ❌ Erreurs: ${stats.error}/${notifications.length}`);

    const enhancedPercent = Math.round((stats.enhanced / notifications.length) * 100);
    console.log(`\n🎯 Taux d'adoption du nouveau format: ${enhancedPercent}%`);

    console.log('\n✅ Test d\'affichage terminé avec succès!');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await connection.end();
  }
}

// Exécuter le test
testNotificationDisplay().catch(console.error);
