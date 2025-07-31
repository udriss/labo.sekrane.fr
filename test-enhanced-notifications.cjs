#!/usr/bin/env node

const { parseNotificationMessage, getDetailedDescription } = require('./lib/utils/notification-messages');

// Simuler une notification chimique
const chemicalNotification = {
  id: 'test-1',
  message: JSON.stringify({
    messageToDisplay: "Administrateur a modifié la quantité de Acide sulfurique : 500ml → 250ml",
    log_message: "Action UPDATE effectuée sur chemical dans le module CHEMICALS",
    change_details: {
      field: "quantity",
      old_value: "500ml",
      new_value: "250ml",
      chemical_name: "Acide sulfurique"
    }
  }),
  module: 'CHEMICALS',
  severity: 'medium',
  actionType: 'UPDATE',
  triggeredBy: 'admin@example.com',
  timestamp: new Date().toISOString(),
  isRead: false
};

// Simuler une notification d'équipement
const equipmentNotification = {
  id: 'test-2',
  message: JSON.stringify({
    messageToDisplay: "John Doe a ajouté un nouvel équipement : Spectromètre UV-Vis (UV-001)",
    log_message: "Action CREATE effectuée sur equipment dans le module EQUIPMENT",
    change_details: {
      equipment_name: "Spectromètre UV-Vis",
      serial_number: "UV-001",
      location: "Laboratoire A"
    }
  }),
  module: 'EQUIPMENT',
  severity: 'low',
  actionType: 'CREATE',
  triggeredBy: 'john.doe@example.com',
  timestamp: new Date().toISOString(),
  isRead: false
};

console.log('=== Test des notifications améliorées ===\n');

// Test de parsing des messages
console.log('1. Test du parsing des messages:');
const chemicalData = parseNotificationMessage(chemicalNotification.message);
console.log('Message chimique parsé:', chemicalData);

const equipmentData = parseNotificationMessage(equipmentNotification.message);
console.log('Message équipement parsé:', equipmentData);

console.log('\n2. Test des descriptions détaillées:');
const chemicalDesc = getDetailedDescription(chemicalNotification, chemicalData);
console.log('Description chimique:', chemicalDesc);

const equipmentDesc = getDetailedDescription(equipmentNotification, equipmentData);
console.log('Description équipement:', equipmentDesc);

console.log('\n3. Simulation d\'affichage dans l\'interface:');
console.log('=== Notification Chimique ===');
console.log('📊 CHEMICALS - Priorité: MEDIUM');
console.log('👤 Par: admin@example.com');
console.log('💬 Message: ' + chemicalData.messageToDisplay);
console.log('🔍 Détails: ' + chemicalDesc);
console.log('📝 Log technique: ' + chemicalData.logMessage);

console.log('\n=== Notification Équipement ===');
console.log('🔧 EQUIPMENT - Priorité: LOW');
console.log('👤 Par: john.doe@example.com');
console.log('💬 Message: ' + equipmentData.messageToDisplay);
console.log('🔍 Détails: ' + equipmentDesc);
console.log('📝 Log technique: ' + equipmentData.logMessage);

console.log('\n✅ Test terminé avec succès !');
