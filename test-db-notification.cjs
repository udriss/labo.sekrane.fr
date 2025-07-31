#!/usr/bin/env node

// Test d'insertion d'une notification améliorée dans la base de données
const mysql = require('mysql2/promise');

async function testEnhancedNotification() {
  let connection;
  
  try {
    // Configuration de la base de données (à adapter selon votre configuration)
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'int', // Ajustez selon votre configuration
      password: '4Na9Gm8mdTVgnUp', // Ajustez selon votre configuration  
      database: 'labo'
    });

    console.log('✅ Connexion à la base de données établie');

    // Créer une notification test avec la nouvelle structure
    const enhancedMessage = {
      messageToDisplay: "Test Système a modifié la quantité de Acide chlorhydrique : 1L → 500ml",
      log_message: "Action UPDATE effectuée sur chemical dans le module CHEMICALS - TEST",
      change_details: {
        field: "quantity",
        old_value: "1L",
        new_value: "500ml", 
        chemical_name: "Acide chlorhydrique",
        test_notification: true
      }
    };

    const notification = {
      message: JSON.stringify(enhancedMessage),
      module: 'CHEMICALS',
      severity: 'medium',
      actionType: 'UPDATE',
      triggeredBy: 'test@example.com',
      timestamp: new Date(),
      isRead: false
    };

    // Insérer la notification
    const [result] = await connection.execute(
      `INSERT INTO notifications (message, module, severity, action_type, triggered_by, updated_at, is_read) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        notification.message,
        notification.module, 
        notification.severity,
        notification.actionType,
        notification.triggeredBy,
        notification.timestamp,
        notification.isRead
      ]
    );

    console.log('✅ Notification test insérée avec l\'ID:', result.insertId);

    // Récupérer et afficher la notification
    const [rows] = await connection.execute(
      'SELECT * FROM notifications WHERE id = ?',
      [result.insertId]
    );

    if (rows.length > 0) {
      const retrievedNotification = rows[0];
      console.log('\n📋 Notification récupérée:');
      console.log('ID:', retrievedNotification.id);
      console.log('Module:', retrievedNotification.module);
      console.log('Sévérité:', retrievedNotification.severity);
      console.log('Action:', retrievedNotification.actionType);
      console.log('Déclenchée par:', retrievedNotification.triggeredBy);
      
      // Parser le message JSON
      const parsedMessage = JSON.parse(retrievedNotification.message);
      console.log('\n💬 Messages:');
      console.log('Message utilisateur:', parsedMessage.messageToDisplay);
      console.log('Log technique:', parsedMessage.log_message);
      console.log('Détails:', JSON.stringify(parsedMessage.change_details, null, 2));
    }

    // Nettoyer - supprimer la notification test
    await connection.execute('DELETE FROM notifications WHERE id = ?', [result.insertId]);
    console.log('\n🧹 Notification test supprimée');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 La base de données MySQL n\'est pas accessible.');
      console.log('   Vérifiez que MySQL est démarré et que les paramètres de connexion sont corrects.');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 La table notifications n\'existe pas.');
      console.log('   Vérifiez que les migrations Prisma ont été exécutées.');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Exécuter le test
testEnhancedNotification();
