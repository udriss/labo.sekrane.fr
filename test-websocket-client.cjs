// test-websocket-client.js
const WebSocket = require('ws');

// Test de connexion WebSocket
const wsUrl = 'ws://localhost:3000/api/notifications/ws?userId=1';

console.log('🔄 Tentative de connexion WebSocket à:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket connecté !');
  
  // Envoyer un ping de test
  ws.send(JSON.stringify({
    type: 'ping',
    message: 'test depuis client JS'
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 Message reçu:', message);
  } catch (error) {
    console.log('📨 Message brut reçu:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ Erreur WebSocket:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connexion fermée - Code: ${code}, Raison: ${reason}`);
});

// Fermer après 10 secondes
setTimeout(() => {
  console.log('⏰ Fermeture du test après 10 secondes');
  ws.close();
  process.exit(0);
}, 10000);
