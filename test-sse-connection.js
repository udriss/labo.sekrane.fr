#!/usr/bin/env node

// Test script pour vérifier la connexion SSE
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const EventSource = require('eventsource');

console.log('🧪 Test de connexion SSE...');
console.log('⚠️  Note: Ce test échouera car il n\'y a pas d\'authentification, mais il nous permettra de voir les logs serveur');

const eventSource = new EventSource('http://localhost:3000/api/notifications/ws');

eventSource.onopen = () => {
  console.log('✅ Connexion SSE ouverte');
};

eventSource.onmessage = (event) => {
  console.log('📨 Message SSE reçu:', event.data);
};

eventSource.onerror = (error) => {
  console.error('❌ Erreur SSE:', {
    type: error.type,
    message: error.message,
    status: error.status
  });
};

// Fermer après 5 secondes
setTimeout(() => {
  console.log('🔚 Fermeture de la connexion de test');
  eventSource.close();
  process.exit(0);
}, 5000);
