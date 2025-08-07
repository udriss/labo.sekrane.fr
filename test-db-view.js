// Test direct de la VIEW active_timeslots
import mysql from 'mysql2/promise'

async function testActiveTimeslotsView() {
  let connection
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'int',
      password: '4Na9Gm8mdTVgnUp',
      database: 'labo'
    })
    
    console.log('✅ Connexion à la base de données établie')
    
    const eventId = '9d789f14-958f-44da-9700-a60f7fb1b3d5'
    
    // 1. Vérifier les données dans timeslots_data
    console.log('\n📋 1. Données dans timeslots_data pour cet événement:')
    const [rawData] = await connection.execute(
      'SELECT * FROM timeslots_data WHERE event_id = ?',
      [eventId]
    )
    console.log(`Trouvé ${rawData.length} enregistrement(s):`)
    rawData.forEach((row, index) => {
      console.log(`  [${index + 1}] ID: ${row.id}, State: ${row.state}, Discipline: ${row.discipline}`)
    })
    
    // 2. Vérifier la VIEW active_timeslots
    console.log('\n📋 2. Données dans active_timeslots pour cet événement:')
    const [viewData] = await connection.execute(
      'SELECT * FROM active_timeslots WHERE event_id = ?',
      [eventId]
    )
    console.log(`Trouvé ${viewData.length} enregistrement(s):`)
    viewData.forEach((row, index) => {
      console.log(`  [${index + 1}] ID: ${row.id}, State: ${row.state}, Discipline: ${row.discipline}`)
    })
    
    // 3. Tester avec les paramètres exacts de l'API
    console.log('\n📋 3. Test avec paramètres API (event_id + discipline):')
    const [apiData] = await connection.execute(
      'SELECT * FROM active_timeslots WHERE event_id = ? AND discipline = ?',
      [eventId, 'chimie']
    )
    console.log(`Trouvé ${apiData.length} enregistrement(s):`)
    apiData.forEach((row, index) => {
      console.log(`  [${index + 1}] ID: ${row.id}, State: ${row.state}, Start: ${row.start_date}`)
    })
    
    // 4. Vérifier la définition de la VIEW
    console.log('\n📋 4. Définition de la VIEW active_timeslots:')
    const [viewDef] = await connection.execute('SHOW CREATE VIEW active_timeslots')
    console.log(viewDef[0]['Create View'])
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔐 Connexion fermée')
    }
  }
}

testActiveTimeslotsView()
