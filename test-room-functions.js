// Test des fonctions de gestion des salles
import { getAllRooms, getEventsForRoom } from './lib/calendar-utils-timeslots.js'

async function testRoomFunctions() {
  console.log('🧪 Test des fonctions de gestion des salles...\n')
  
  try {
    // Test getAllRooms
    console.log('📋 Test getAllRooms():')
    const rooms = await getAllRooms()
    console.log(`   ✅ Nombre de salles: ${rooms.length}`)
    
    if (rooms.length > 0) {
      console.log('   📝 Première salle:', JSON.stringify(rooms[0], null, 2))
      
      // Test getEventsForRoom
      console.log('\n📅 Test getEventsForRoom():')
      const roomName = rooms[0].name
      const today = new Date().toISOString().split('T')[0]
      
      console.log(`   🔍 Recherche d'événements pour "${roomName}" le ${today}`)
      const events = await getEventsForRoom(roomName, today, today)
      console.log(`   ✅ Nombre d'événements trouvés: ${events.length}`)
      
      if (events.length > 0) {
        console.log('   📝 Premier événement:', JSON.stringify(events[0], null, 2))
      }
    }
    
    console.log('\n🎉 Tests terminés avec succès!')
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

testRoomFunctions()
