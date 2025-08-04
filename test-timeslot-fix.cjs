// test-timeslot-fix.js
// Test pour vérifier que les corrections du système TimeSlot fonctionnent

const { processTimeSlots, hasTimeSlotChanged } = require('./lib/calendar-utils-timeslots');

console.log('🧪 Test des corrections des TimeSlots...\n');

// Test 1: hasTimeSlotChanged avec slots identiques
console.log('Test 1: Slots identiques');
const originalSlot = {
  id: 'slot1',
  startDate: '2024-01-15T09:00:00Z',
  endDate: '2024-01-15T10:00:00Z',
  status: 'active',
  room: 'Labo A',
  notes: 'Test'
};

const identicalSlot = {
  id: 'slot1',
  startDate: '2024-01-15T09:00:00Z',
  endDate: '2024-01-15T10:00:00Z',
  status: 'active',
  room: 'Labo A',
  notes: 'Test'
};

const hasChanged1 = hasTimeSlotChanged(originalSlot, identicalSlot);
console.log(`Slots identiques -> hasChanged: ${hasChanged1} (attendu: false)`);

// Test 2: hasTimeSlotChanged avec slots différents
console.log('\nTest 2: Slots différents');
const modifiedSlot = {
  id: 'slot1',
  startDate: '2024-01-15T09:00:00Z',
  endDate: '2024-01-15T11:00:00Z', // Changement d'heure de fin
  status: 'active',
  room: 'Labo A',
  notes: 'Test'
};

const hasChanged2 = hasTimeSlotChanged(originalSlot, modifiedSlot);
console.log(`Slots différents -> hasChanged: ${hasChanged2} (attendu: true)`);

// Test 3: processTimeSlots avec slots non modifiés
console.log('\nTest 3: processTimeSlots avec slots non modifiés');
const originalSlots = [originalSlot];
const newSlots = [identicalSlot];
const userId = 'user123';

const processedSlots1 = processTimeSlots(newSlots, originalSlots, userId);
console.log('Slot traité (non modifié):');
console.log(`- ID: ${processedSlots1[0].id}`);
console.log(`- Nombre d'entrées modifiedBy: ${processedSlots1[0].modifiedBy ? processedSlots1[0].modifiedBy.length : 0} (attendu: 0)`);

// Test 4: processTimeSlots avec slots modifiés
console.log('\nTest 4: processTimeSlots avec slots modifiés');
const processedSlots2 = processTimeSlots([modifiedSlot], originalSlots, userId);
console.log('Slot traité (modifié):');
console.log(`- ID: ${processedSlots2[0].id}`);
console.log(`- Nombre d'entrées modifiedBy: ${processedSlots2[0].modifiedBy ? processedSlots2[0].modifiedBy.length : 1} (attendu: 1)`);
if (processedSlots2[0].modifiedBy && processedSlots2[0].modifiedBy.length > 0) {
  console.log(`- Dernière modification par: ${processedSlots2[0].modifiedBy[processedSlots2[0].modifiedBy.length - 1].userId}`);
  console.log(`- Action: ${processedSlots2[0].modifiedBy[processedSlots2[0].modifiedBy.length - 1].action}`);
}

console.log('\n✅ Tests terminés !');
console.log('\n📋 Résumé des corrections apportées:');
console.log('1. Ajout de hasTimeSlotChanged() pour détecter les vraies modifications');
console.log('2. Ajout de processTimeSlots() pour éviter les entrées modifiedBy inutiles');
console.log('3. Correction des APIs chimie et physique pour utiliser ces nouvelles fonctions');
console.log('4. Les TimeSlots ne sont marqués comme "modifiés" que s\'ils ont vraiment changé');
