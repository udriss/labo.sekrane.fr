#!/usr/bin/env node

// Test de modification d'un chemical pour vérifier les nouvelles notifications
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testRealChemicalUpdate() {
  console.log('🧪 Test de modification réelle d\'un chemical\n');

  try {
    // 1. D'abord, récupérer un chemical existant
    console.log('1. 📋 Récupération des chemicals existants...');
    const chemicalsResponse = await fetch('http://localhost:3000/api/chemicals');
    const chemicalsData = await chemicalsResponse.json();
    
    if (!chemicalsData.chemicals || chemicalsData.chemicals.length === 0) {
      console.log('❌ Aucun chemical trouvé');
      return;
    }

    const chemical = chemicalsData.chemicals[0];
    console.log(`✅ Chemical sélectionné: ${chemical.name} (ID: ${chemical.id})`);
    console.log(`   Quantité actuelle: ${chemical.quantity}${chemical.unit}`);

    // 2. Modifier la quantité du chemical
    const newQuantity = parseFloat(chemical.quantity) + 10.5;
    console.log(`\n2. 🔄 Modification de la quantité: ${chemical.quantity} → ${newQuantity}`);

    const updateResponse = await fetch(`http://localhost:3000/api/chemicals/${chemical.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=test-admin-session' // Simuler une session admin
      },
      body: JSON.stringify({
        quantity: newQuantity
      })
    });

    if (updateResponse.ok) {
      const updateResult = await updateResponse.json();
      console.log(`✅ Chemical modifié avec succès`);
      console.log(`   Nouvelle quantité: ${updateResult.chemical?.quantity || updateResult.quantity}${chemical.unit}`);
    } else {
      console.log(`❌ Erreur lors de la modification: ${updateResponse.status} ${updateResponse.statusText}`);
      const errorData = await updateResponse.text();
      console.log(`   Détails: ${errorData}`);
    }

    // 3. Vérifier les notifications créées récemment
    console.log('\n3. 📬 Vérification des notifications récentes...');
    
    // Attendre un peu pour que la notification soit créée
    await new Promise(resolve => setTimeout(resolve, 1000));

    const notificationsResponse = await fetch('http://localhost:3000/api/notifications', {
      headers: {
        'Cookie': 'next-auth.session-token=test-admin-session'
      }
    });

    if (notificationsResponse.ok) {
      const notificationsData = await notificationsResponse.json();
      
      // Chercher les notifications récentes (dernières 5 minutes)
      const recentTime = new Date(Date.now() - 5 * 60 * 1000);
      const recentNotifications = (notificationsData.notifications || [])
        .filter(notif => new Date(notif.created_at) > recentTime)
        .filter(notif => notif.module === 'CHEMICALS');

      console.log(`📊 ${recentNotifications.length} notifications CHEMICALS récentes trouvées:`);
      
      recentNotifications.forEach((notif, i) => {
        try {
          let messageObj;
          if (typeof notif.message === 'string') {
            messageObj = JSON.parse(notif.message);
          } else {
            messageObj = notif.message;
          }
          
          console.log(`\n   ${i+1}. [${notif.action_type}] Sévérité: ${notif.severity}`);
          console.log(`      💬 Message utilisateur: ${messageObj.messageToDisplay || 'N/A'}`);
          console.log(`      📝 Message log: ${messageObj.log_message || 'N/A'}`);
          console.log(`      🎯 Entité: ${notif.entity_type} (${notif.entity_id})`);
          console.log(`      🕒 ${notif.created_at}`);
        } catch (e) {
          console.log(`   ${i+1}. Message brut: ${notif.message}`);
        }
      });
    } else {
      console.log('❌ Erreur lors de la récupération des notifications');
    }

    console.log('\n✅ Test terminé!');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testRealChemicalUpdate().catch(console.error);
