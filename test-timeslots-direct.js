// Test interne direct du système TimeSlots
const mysql = require('mysql2/promise')
const { formatDateForMySQL, parseJsonSafe } = require('./lib/calendar-utils-timeslots.ts')

const testTimeSlotsDirect = async () => {
  console.log('🧪 Test direct du système TimeSlots...\n')

  // Configuration de base de données depuis .env
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'labo_sekrane'
  })

  try {
    // 1. Test formatDateForMySQL
    console.log('1️⃣ Test formatage dates...')
    const testDate = '2025-01-15T09:00:00.000Z'
    const formatted = formatDateForMySQL(testDate)
    console.log(`📅 Date ISO: ${testDate}`)
    console.log(`📅 Date MySQL: ${formatted}`)
    
    // 2. Test parseJsonSafe
    console.log('\n2️⃣ Test parsing JSON...')
    const jsonString = '["microscope", "balance"]'
    const jsonArray = ['HCl', 'NaOH']
    const invalidJson = 'invalid-json'
    
    console.log(`🔧 String JSON: ${parseJsonSafe(jsonString, []).join(', ')}`)
    console.log(`🔧 Array direct: ${parseJsonSafe(jsonArray, []).join(', ')}`)
    console.log(`🔧 JSON invalide: ${parseJsonSafe(invalidJson, []).length} éléments`)

    // 3. Test insertion directe en base
    console.log('\n3️⃣ Test insertion base de données...')
    const testEvent = {
      title: 'Test TimeSlots Direct',
      description: 'Test insertion directe',
      start_date: formatDateForMySQL('2025-01-15T09:00:00.000Z'),
      end_date: formatDateForMySQL('2025-01-15T11:00:00.000Z'),
      type: 'TP',
      class_name: 'TS1',
      room: 'Chimie1',
      equipment_used: JSON.stringify(['microscope', 'balance']),
      chemicals_used: JSON.stringify(['HCl', 'NaOH']),
      notes: 'Test direct',
      created_by: 'test-user',
      created_at: formatDateForMySQL(new Date().toISOString()),
      state: 'confirmed'
    }

    const insertQuery = `
      INSERT INTO calendar_events_chimie (
        title, description, start_date, end_date, type, class_name, room,
        equipment_used, chemicals_used, notes, created_by, created_at, state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const [result] = await connection.execute(insertQuery, [
      testEvent.title,
      testEvent.description,
      testEvent.start_date,
      testEvent.end_date,
      testEvent.type,
      testEvent.class_name,
      testEvent.room,
      testEvent.equipment_used,
      testEvent.chemicals_used,
      testEvent.notes,
      testEvent.created_by,
      testEvent.created_at,
      testEvent.state
    ])

    console.log(`✅ Événement inséré avec ID: ${result.insertId}`)

    // 4. Test lecture et parsing
    console.log('\n4️⃣ Test lecture et parsing...')
    const [rows] = await connection.execute(
      'SELECT * FROM calendar_events_chimie WHERE id = ?',
      [result.insertId]
    )

    if (rows.length > 0) {
      const event = rows[0]
      console.log(`📖 Événement lu: ${event.title}`)
      console.log(`🔧 Matériaux parsés: ${parseJsonSafe(event.equipment_used, []).length} éléments`)
      console.log(`🧪 Produits parsés: ${parseJsonSafe(event.chemicals_used, []).length} éléments`)
      console.log(`📅 Date formatée: ${event.start_date}`)
    }

    // 5. Nettoyage
    await connection.execute('DELETE FROM calendar_events_chimie WHERE id = ?', [result.insertId])
    console.log('🧹 Données de test nettoyées')

    console.log('\n🎉 Tous les tests directs réussis!')

  } catch (error) {
    console.error('❌ Erreur test direct:', error.message)
  } finally {
    await connection.end()
  }
}

testTimeSlotsDirect()
