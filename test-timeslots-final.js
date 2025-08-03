// Test final du système TimeSlots complet
const testTimeSlots = async () => {
  console.log('🧪 Test final du système TimeSlots complet...\n')

  try {
    // 1. Test de création d'un événement avec TimeSlots (chimie)
    console.log('1️⃣ Test création événement avec TimeSlots (chimie)...')
    const createResponse = await fetch('http://localhost:3000/api/calendrier/chimie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test TimeSlots Final',
        description: 'Test complet du système TimeSlots',
        start_date: '2025-01-15',
        start_time: '09:00',
        end_time: '11:00',
        type: 'TP',
        class_name: 'TS1',
        room: 'Chimie1',
        equipment_used: JSON.stringify(['microscope', 'balance']),
        chemicals_used: JSON.stringify(['HCl', 'NaOH']),
        notes: 'Test avec TimeSlots',
        created_by: 'test-user',
        timeSlots: [
          {
            date: '2025-01-15',
            startTime: '09:00',
            endTime: '10:00',
            type: 'TP'
          },
          {
            date: '2025-01-15', 
            startTime: '10:00',
            endTime: '11:00',
            type: 'TP'
          }
        ]
      })
    })

    const createData = await createResponse.json()
    console.log('✅ Création:', createData.success ? '✅ Succès' : '❌ Échec')
    
    if (!createData.success) {
      console.error('Erreur création:', createData.error)
      return
    }

    const eventId = createData.event.id
    console.log(`📝 ID événement créé: ${eventId}`)
    console.log(`🎯 TimeSlots créés: ${createData.event.timeSlots?.length || 0}`)

    // 2. Test de déplacement de TimeSlots
    console.log('\n2️⃣ Test déplacement TimeSlots...')
    const moveResponse = await fetch('http://localhost:3000/api/calendrier/move-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: eventId,
        discipline: 'chimie',
        userId: 'test-user',
        newTimeSlots: [
          {
            date: '2025-01-16',
            startTime: '14:00',
            endTime: '15:00',
            type: 'TP'
          },
          {
            date: '2025-01-16',
            startTime: '15:00', 
            endTime: '16:00',
            type: 'TP'
          }
        ]
      })
    })

    const moveData = await moveResponse.json()
    console.log('✅ Déplacement:', moveData.success ? '✅ Succès' : '❌ Échec')
    
    if (moveData.success) {
      console.log(`📅 Nouveaux TimeSlots: ${moveData.event.timeSlots?.length || 0}`)
      console.log(`👤 Propriétaire: ${moveData.isOwner ? 'Oui' : 'Non'}`)
    } else {
      console.error('Erreur déplacement:', moveData.error)
    }

    // 3. Test de récupération des événements
    console.log('\n3️⃣ Test récupération événements...')
    const getResponse = await fetch('http://localhost:3000/api/calendrier/chimie?date=2025-01')
    const getData = await getResponse.json()
    
    console.log('✅ Récupération:', getData.success ? '✅ Succès' : '❌ Échec')
    if (getData.success) {
      const events = getData.events || []
      console.log(`📊 Événements trouvés: ${events.length}`)
      
      const testEvent = events.find(e => e.id === eventId)
      if (testEvent) {
        console.log(`🔍 Événement test trouvé:`)
        console.log(`   - Titre: ${testEvent.title}`)
        console.log(`   - TimeSlots: ${testEvent.timeSlots?.length || 0}`)
        console.log(`   - Matériaux: ${testEvent.materials?.length || 0}`)
        console.log(`   - Produits chimiques: ${testEvent.chemicals?.length || 0}`)
      }
    }

    console.log('\n🎉 Test TimeSlots final terminé!')

  } catch (error) {
    console.error('❌ Erreur test:', error)
  }
}

// Lancer le test
testTimeSlots()
