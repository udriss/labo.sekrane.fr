// Test direct de la base de données pour les timeslots
// Fichier : test-db-timeslots.js

const mysql = require('mysql2/promise')

async function testActiveTimeslots() {
  let connection
  
  try {
    // Configuration de connexion (adaptez selon votre configuration)
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'labo_user',
      password: 'labo_password',
      database: 'labo'
    })
    
    console.log('✅ Connexion à la base de données établie')
    
    // Vérifier si la table active_timeslots existe
    const [tables] = await connection.execute('SHOW TABLES LIKE "active_timeslots"')
    
    if (tables.length === 0) {
      console.log('❌ Table active_timeslots introuvable')
      console.log('📋 Tables disponibles:')
      const [allTables] = await connection.execute('SHOW TABLES')
      allTables.forEach(table => {
        console.log(' -', Object.values(table)[0])
      })
      return
    }
    
    console.log('✅ Table active_timeslots trouvée')
    
    // Vérifier la structure de la table
    const [structure] = await connection.execute('DESCRIBE active_timeslots')
    console.log('📋 Structure de la table active_timeslots:')
    structure.forEach(column => {
      console.log(` - ${column.Field}: ${column.Type}`)
    })
    
    // Compter les enregistrements
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM active_timeslots')
    console.log(`📊 Nombre total d'enregistrements: ${count[0].total}`)
    
    // Vérifier si l'event_id spécifique existe
    const eventId = '9d789f14-958f-44da-9700-a60f7fb1b3d5'
    const [eventRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM active_timeslots WHERE event_id = ?',
      [eventId]
    )
    console.log(`📊 Créneaux pour l'événement ${eventId}: ${eventRows[0].count}`)
    
    if (eventRows[0].count > 0) {
      // Afficher les données pour cet événement
      const [rows] = await connection.execute(
        'SELECT * FROM active_timeslots WHERE event_id = ? LIMIT 5',
        [eventId]
      )
      console.log('📋 Exemple de données:')
      rows.forEach((row, index) => {
        console.log(`  [${index + 1}]`, JSON.stringify(row, null, 2))
      })
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔐 Connexion fermée')
    }
  }
}

testActiveTimeslots()
