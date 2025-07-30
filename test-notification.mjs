#!/usr/bin/env node

// Script de test pour envoyer une notification SSE
import { promises as fs } from 'fs';

const testNotification = async () => {
  try {
    console.log('🧪 Test d\'envoi de notification SSE...');
    
    const response = await fetch('http://localhost:3000/api/notifications/ws/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'test'
      })
    });

    const result = await response.json();
    console.log('📨 Réponse du serveur:', result);

    if (result.success) {
      console.log(`✅ Notification envoyée à ${result.sentToConnections} connexions`);
      console.log(`📊 ID de notification: ${result.notificationId}`);
    } else {
      console.log('❌ Erreur:', result.error);
    }

  } catch (error) {
    console.error('💥 Erreur lors du test:', error.message);
  }
};

testNotification();
