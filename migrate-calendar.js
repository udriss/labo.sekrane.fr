const fs = require('fs');
const path = require('path');

// Lire le fichier calendar.json
const calendarPath = path.join(process.cwd(), 'data', 'calendar.json');
let data;

try {
  const fileContent = fs.readFileSync(calendarPath, 'utf-8');
  data = JSON.parse(fileContent);
  console.log('✓ Fichier lu avec succès');
} catch (error) {
  console.log('✗ Erreur lecture:', error.message);
  process.exit(1);
}

console.log(`📊 Événements avant migration: ${data.events.length}`);

// Migrer chaque événement
let migratedCount = 0;
data.events = data.events.map((event, index) => {
  const hasActuelTimeSlots = !!event.actuelTimeSlots;
  const hasEventModifying = event.hasOwnProperty('eventModifying');
  
  if (!hasActuelTimeSlots || !hasEventModifying) {
    migratedCount++;
    console.log(`🔄 Migration événement ${index + 1}: ${event.title}`);
    if (!hasActuelTimeSlots) console.log('  - Ajout actuelTimeSlots');
    if (!hasEventModifying) console.log('  - Ajout eventModifying');
  }
  
  const migrated = {
    ...event,
    actuelTimeSlots: event.actuelTimeSlots || (event.timeSlots ? event.timeSlots.filter(slot => slot.status === 'active') : []),
    eventModifying: event.eventModifying || []
  };
  
  return migrated;
});

// Sauvegarder
try {
  fs.writeFileSync(calendarPath, JSON.stringify(data, null, 2));
  console.log('✓ Migration terminée');
  console.log(`📈 Événements migrés: ${migratedCount}`);
  
  // Vérifications
  const firstEvent = data.events[0];
  if (firstEvent) {
    console.log(`✓ Premier événement a actuelTimeSlots: ${!!firstEvent.actuelTimeSlots} (${firstEvent.actuelTimeSlots?.length || 0} créneaux)`);
    console.log(`✓ Premier événement a eventModifying: ${!!firstEvent.eventModifying} (${firstEvent.eventModifying?.length || 0} modifications)`);
  }
} catch (error) {
  console.log('✗ Erreur sauvegarde:', error.message);
  process.exit(1);
}

console.log('🎉 Migration réussie !');
