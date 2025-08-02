// Script de test pour vérifier les corrections
// test-corrections-finales.js

console.log('🧪 Test des corrections appliquées...\n');

const { readFileSync } = require('fs');
const path = require('path');

// Tests de correction 1: Format de date MySQL
console.log('1️⃣ Test correction format de date MySQL:');

const checkDateFormatCorrection = (filePath, functionName) => {
  try {
    const content = readFileSync(filePath, 'utf8');
    if (content.includes('.slice(0, 19).replace(\'T\', \' \')')) {
      console.log(`   ✅ ${functionName} - Format MySQL appliqué`);
      return true;
    } else {
      console.log(`   ❌ ${functionName} - Format MySQL manquant`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${functionName} - Fichier non trouvé`);
    return false;
  }
};

const dateFormatChecks = [
  ['lib/calendar-utils.ts', 'updateChemistryEvent & updatePhysicsEvent'],
  ['app/api/calendrier/chimie/state-change/route.ts', 'State Change API Chimie'],
  ['app/api/calendrier/physique/state-change/route.ts', 'State Change API Physique'],
  ['app/api/calendrier/chimie/move-event/route.ts', 'Move Event API Chimie'],
  ['app/api/calendrier/physique/move-event/route.ts', 'Move Event API Physique']
];

let passedDateChecks = 0;
dateFormatChecks.forEach(([file, name]) => {
  if (checkDateFormatCorrection(path.join(__dirname, file), name)) {
    passedDateChecks++;
  }
});

console.log(`   📊 Corrections format date: ${passedDateChecks}/${dateFormatChecks.length}\n`);

// Tests de correction 2: APIs state-change
console.log('2️⃣ Test correction APIs state-change:');

const checkStateAPICorrection = (filePath, apiName) => {
  try {
    const content = readFileSync(filePath, 'utf8');
    const hasValidStates = content.includes("'PENDING', 'VALIDATED', 'CANCELLED', 'MOVED', 'IN_PROGRESS'");
    const hasTimeSlots = content.includes('const { newState, reason, timeSlots } = body');
    
    if (hasValidStates && hasTimeSlots) {
      console.log(`   ✅ ${apiName} - Nouveaux états et TimeSlots supportés`);
      return true;
    } else {
      console.log(`   ❌ ${apiName} - Corrections manquantes`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${apiName} - Fichier non trouvé`);
    return false;
  }
};

const stateAPIChecks = [
  ['app/api/calendrier/chimie/state-change/route.ts', 'State Change Chimie'],
  ['app/api/calendrier/physique/state-change/route.ts', 'State Change Physique']
];

let passedStateChecks = 0;
stateAPIChecks.forEach(([file, name]) => {
  if (checkStateAPICorrection(path.join(__dirname, file), name)) {
    passedStateChecks++;
  }
});

console.log(`   📊 Corrections state-change: ${passedStateChecks}/${stateAPIChecks.length}\n`);

// Tests de correction 3: APIs move-event
console.log('3️⃣ Test correction APIs move-event:');

const checkMoveEventCorrection = (filePath, apiName) => {
  try {
    const content = readFileSync(filePath, 'utf8');
    const hasTimeSlots = content.includes('const { newStartDate, newEndDate, timeSlots, reason } = body');
    const hasFlexibleFormat = content.includes('Support des deux formats : timeSlots ou dates directes');
    
    if (hasTimeSlots && hasFlexibleFormat) {
      console.log(`   ✅ ${apiName} - Support format timeSlots ajouté`);
      return true;
    } else {
      console.log(`   ❌ ${apiName} - Support timeSlots manquant`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${apiName} - Fichier non trouvé`);
    return false;
  }
};

const moveEventChecks = [
  ['app/api/calendrier/chimie/move-event/route.ts', 'Move Event Chimie'],
  ['app/api/calendrier/physique/move-event/route.ts', 'Move Event Physique']
];

let passedMoveChecks = 0;
moveEventChecks.forEach(([file, name]) => {
  if (checkMoveEventCorrection(path.join(__dirname, file), name)) {
    passedMoveChecks++;
  }
});

console.log(`   📊 Corrections move-event: ${passedMoveChecks}/${moveEventChecks.length}\n`);

// Tests de correction 4: TimeSlots APIs existantes
console.log('4️⃣ Test APIs TimeSlots existantes:');

const timeSlotAPIs = [
  'app/api/calendrier/chimie/approve-single-timeslot/route.ts',
  'app/api/calendrier/chimie/approve-timeslots/route.ts',
  'app/api/calendrier/chimie/reject-single-timeslot/route.ts',
  'app/api/calendrier/chimie/reject-timeslots/route.ts',
  'app/api/calendrier/physique/approve-single-timeslot/route.ts',
  'app/api/calendrier/physique/approve-timeslots/route.ts',
  'app/api/calendrier/physique/reject-single-timeslot/route.ts',
  'app/api/calendrier/physique/reject-timeslots/route.ts'
];

let existingAPIs = 0;
timeSlotAPIs.forEach(api => {
  try {
    const content = readFileSync(path.join(__dirname, api), 'utf8');
    if (content.includes('export async function POST') && content.includes('synchronizeActuelTimeSlots')) {
      existingAPIs++;
    }
  } catch (error) {
    // Fichier n'existe pas
  }
});

console.log(`   📊 APIs TimeSlots: ${existingAPIs}/${timeSlotAPIs.length} présentes\n`);

// Résumé final
const totalTests = passedDateChecks + passedStateChecks + passedMoveChecks;
const maxTests = dateFormatChecks.length + stateAPIChecks.length + moveEventChecks.length;

console.log('📋 RÉSUMÉ DES CORRECTIONS:');
console.log('================================');
console.log(`✅ Format date MySQL: ${passedDateChecks}/${dateFormatChecks.length}`);
console.log(`✅ APIs state-change: ${passedStateChecks}/${stateAPIChecks.length}`);
console.log(`✅ APIs move-event: ${passedMoveChecks}/${moveEventChecks.length}`);
console.log(`✅ APIs TimeSlots: ${existingAPIs}/${timeSlotAPIs.length}`);
console.log('================================');

if (totalTests === maxTests && existingAPIs === timeSlotAPIs.length) {
  console.log('🎉 TOUTES LES CORRECTIONS APPLIQUÉES AVEC SUCCÈS!');
  console.log('');
  console.log('📝 Prochaines étapes:');
  console.log('   1. Appliquer la migration de base de données:');
  console.log('      ./apply-timeslots-migration.sh');
  console.log('   2. Tester les APIs corrigées');
  console.log('   3. Vérifier l\'interface utilisateur');
} else {
  console.log('⚠️  CERTAINES CORRECTIONS SONT INCOMPLÈTES');
  console.log('   Vérifiez les fichiers marqués ❌ ci-dessus');
}

console.log('');
