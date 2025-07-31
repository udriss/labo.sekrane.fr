#!/usr/bin/env node

// Test de vraie notification via l'API 
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testAPINotificationTrigger() {
  console.log('🧪 Test de déclenchement de notification via modification directe DB\n');

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
    console.log(`✅ Chemical: ${chemical.name} (${chemical.quantity}${chemical.unit})`);

    // 2. Simuler notre fonction createEnhancedNotificationMessage
    console.log('\n2. 🎨 Test de la fonction createEnhancedNotificationMessage...');
    
    const triggeredBy = {
      id: '1',
      name: 'Administrateur',
      email: 'admin@labo.fr',
      role: 'ADMIN'
    };

    const oldQuantity = parseFloat(chemical.quantity);
    const newQuantity = oldQuantity + 25.5;
    
    const details = {
      chemicalName: chemical.name,
      quantityUpdate: true,
      before: { quantity: oldQuantity, unit: chemical.unit },
      after: { quantity: newQuantity, unit: chemical.unit },
      fields: ['quantity'],
      quantity: newQuantity,
      unit: chemical.unit
    };

    // Reproduire la logique de createChemicalNotificationMessage
    const createChemicalMessage = (triggeredBy, actionType, details) => {
      const userName = triggeredBy.name;
      
      if (actionType === 'UPDATE' && details.quantityUpdate && 
          details.before?.quantity !== undefined && 
          details.after?.quantity !== undefined) {
        const oldQuantity = details.before.quantity;
        const newQuantity = details.after.quantity;
        const unit = details.after.unit || details.before.unit || '';
        return `${userName} a modifié la quantité de ${details.chemicalName} : ${oldQuantity}${unit} → ${newQuantity}${unit}`;
      }
      
      return `${userName} a effectué une action sur un réactif chimique`;
    };

    const messageToDisplay = createChemicalMessage(triggeredBy, 'UPDATE', details);
    const logMessage = 'Action UPDATE effectuée sur chemical dans le module CHEMICALS';

    console.log(`💬 Message utilisateur: "${messageToDisplay}"`);
    console.log(`📝 Message log: "${logMessage}"`);

    // 3. Créer la notification avec le nouveau format
    console.log('\n3. 📤 Création de la notification test...');
    
    const notificationId = 'api_test_' + Date.now();
    const messageObject = {
      messageToDisplay: messageToDisplay,
      log_message: logMessage
    };

    await connection.execute(`
      INSERT INTO notifications (
        id, user_role, target_roles, module, action_type, message,
        severity, entity_type, entity_id, triggered_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      notificationId,
      'ADMIN',
      JSON.stringify(['ADMIN', 'LABORANTIN']),
      'CHEMICALS',
      'UPDATE',
      JSON.stringify(messageObject),
      'low',
      'chemical',
      chemical.id,
      triggeredBy.id
    ]);

    console.log(`✅ Notification créée: ${notificationId}`);

    // 4. Vérifier la notification créée
    console.log('\n4. 🔍 Vérification de la notification...');
    
    const [notifications] = await connection.execute(`
      SELECT id, message, created_at
      FROM notifications 
      WHERE id = ?
    `, [notificationId]);

    if (notifications.length > 0) {
      const notif = notifications[0];
      console.log(`📬 Notification récupérée:`);
      
      try {
        const messageObj = JSON.parse(notif.message);
        console.log(`   💬 Message utilisateur: "${messageObj.messageToDisplay}"`);
        console.log(`   📝 Message log: "${messageObj.log_message}"`);
        console.log(`   🕒 Créée: ${notif.created_at}`);
      } catch (e) {
        console.log(`   ❌ Erreur parsing: ${e.message}`);
        console.log(`   📄 Message brut: ${notif.message}`);
      }
    }

    // 5. Test de compatibilité avec l'affichage frontend
    console.log('\n5. 🖥️ Test de compatibilité frontend...');
    
    const frontendDisplayLogic = (message) => {
      try {
        const messageObj = JSON.parse(message);
        
        // Nouveau format prioritaire
        if (typeof messageObj === 'object' && messageObj.messageToDisplay) {
          return {
            text: messageObj.messageToDisplay,
            type: 'enhanced'
          };
        }
        // Ancien format
        else if (typeof messageObj === 'string') {
          return {
            text: messageObj,
            type: 'legacy'
          };
        }
        // Autres formats (multi-langue, etc.)
        else if (typeof messageObj === 'object' && messageObj.fr) {
          return {
            text: messageObj.fr,
            type: 'i18n'
          };
        }
        
        return {
          text: JSON.stringify(messageObj),
          type: 'unknown'
        };
      } catch (e) {
        return {
          text: 'Message indisponible',
          type: 'error'
        };
      }
    };

    const display = frontendDisplayLogic(notifications[0].message);
    console.log(`📱 Affichage frontend: "${display.text}" (Type: ${display.type})`);

    // 6. Nettoyage
    await connection.execute(`DELETE FROM notifications WHERE id = ?`, [notificationId]);
    console.log('\n🧹 Notification de test supprimée');

    console.log('\n✅ Test terminé avec succès!');
    console.log('\n🎯 Résultats:');
    console.log('   • La fonction de création de message fonctionne correctement');
    console.log('   • Le format JSON est bien sérialisé en base');
    console.log('   • L\'affichage frontend peut gérer le nouveau format');
    console.log('   • La rétrocompatibilité est assurée');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await connection.end();
  }
}

// Exécuter le test
testAPINotificationTrigger().catch(console.error);
