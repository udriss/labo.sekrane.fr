#!/usr/bin/env node

// Script de test pour les APIs de gestion des timeslots

const baseUrl = 'http://localhost:3000'

// Fonction pour tester une API
async function testAPI(endpoint, method, body, description) {
  console.log(`\n🧪 Test: ${description}`)
  console.log(`   Endpoint: ${method} ${endpoint}`)
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ Succès (${response.status}):`, data.message || 'OK')
      if (data.event) {
        console.log(`   État de l'événement: ${data.event.state}`)
        console.log(`   Nombre de créneaux actuels: ${data.event.actuelTimeSlots?.length || 0}`)
        console.log(`   Nombre de créneaux proposés: ${data.event.timeSlots?.length || 0}`)
      }
    } else {
      console.log(`❌ Erreur (${response.status}):`, data.error || 'Erreur inconnue')
    }
  } catch (error) {
    console.log(`💥 Erreur de connexion:`, error.message)
  }
}

async function runTests() {
  console.log('🚀 Tests des APIs de gestion des timeslots')
  console.log('=' .repeat(50))
  
  // Ces tests sont des exemples - ajustez les IDs selon vos données réelles
  const testEventId = 'test-event-id'
  const testSlotId = 'test-slot-id'
  const testUserId = 'test-user-id'
  
  await testAPI(
    '/api/calendrier/approve-single-timeslot',
    'POST',
    { eventId: testEventId, slotId: testSlotId },
    'Approuver un créneau individuel'
  )
  
  await testAPI(
    '/api/calendrier/reject-single-timeslot', 
    'POST',
    { eventId: testEventId, slotId: testSlotId },
    'Rejeter un créneau individuel'
  )
  
  await testAPI(
    '/api/calendrier/approve-timeslots',
    'POST', 
    { eventId: testEventId, userId: testUserId },
    'Approuver tous les créneaux'
  )
  
  await testAPI(
    '/api/calendrier/reject-timeslots',
    'POST',
    { eventId: testEventId, userId: testUserId }, 
    'Rejeter tous les créneaux'
  )
  
  console.log('\n🏁 Tests terminés')
  console.log('Note: Ces tests utilisent des IDs factices. Pour tester avec de vraies données,')
  console.log('      modifiez les variables testEventId, testSlotId et testUserId.')
}

// Exécuter les tests si le serveur est accessible
runTests().catch(console.error)
