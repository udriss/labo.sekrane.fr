// Test des paramètres de base de données utilisés par l'application
import { config } from 'dotenv'

// Charger les variables d'environnement
config()

console.log('📋 Configuration de base de données utilisée par l\'application:')
console.log('  DB_HOST:', process.env.DB_HOST || 'localhost')
console.log('  DB_USER:', process.env.DB_USER || 'int')  
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '[DÉFINI]' : '[VIDE]')
console.log('  DB_NAME:', process.env.DB_NAME || 'labo')
console.log('  DB_PORT:', process.env.DB_PORT || '3306')

// Test de la connexion avec les mêmes paramètres que l'application
import mysql from 'mysql2/promise'

async function testAppDbConnection() {
  let connection
  
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'int',
      password: process.env.DB_PASSWORD || '4Na9Gm8mdTVgnUp',
      database: process.env.DB_NAME || 'labo'
    }
    
    console.log('\n🔗 Test de connexion avec les paramètres de l\'application...')
    console.log('Config:', {
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password ? '[DÉFINI]' : '[VIDE]',
      database: dbConfig.database
    })
    
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ Connexion réussie avec les paramètres de l\'application')
    
    // Test de la même requête que getActiveTimeslots
    const eventId = '9d789f14-958f-44da-9700-a60f7fb1b3d5'
    const discipline = 'chimie'
    
    const query = 'SELECT * FROM active_timeslots WHERE event_id = ? AND discipline = ? ORDER BY timeslot_date ASC, start_date ASC'
    console.log('\n📋 Test de la requête exacte de getActiveTimeslots:')
    console.log('Query:', query)
    console.log('Params:', [eventId, discipline])
    
    const [rows] = await connection.execute(query, [eventId, discipline])
    console.log(`✅ Résultat: ${rows.length} enregistrement(s) trouvé(s)`)
    
    if (rows.length > 0) {
      console.log('  Premier enregistrement:', {
        id: rows[0].id,
        state: rows[0].state,
        start_date: rows[0].start_date,
        end_date: rows[0].end_date
      })
    }
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔐 Connexion fermée')
    }
  }
}

testAppDbConnection()
