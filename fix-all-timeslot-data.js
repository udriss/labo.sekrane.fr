// Script pour corriger toutes les données des créneaux avec user_id et event_owner 'system'
import mysql from 'mysql2/promise'

async function fixAllTimeslotData() {
  let connection
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'int',
      password: '4Na9Gm8mdTVgnUp',
      database: 'labo'
    })
    
    console.log('✅ Connexion à la base de données établie')
    
    // 1. Vérifier l'utilisateur connecté (ID 1)
    console.log('\n📋 1. Informations sur l\'utilisateur ID 1:')
    const [userData] = await connection.execute(
      'SELECT id, email, name, role FROM users WHERE id = ?',
      [1]
    )
    
    if (userData.length === 0) {
      console.log('  ❌ Utilisateur ID 1 non trouvé')
      return
    }

    const user = userData[0]
    console.log(`  ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role}`)
    
    // 2. Corriger tous les événements avec created_by = 'system'
    console.log('\n📋 2. Correction des événements avec created_by = "system":')
    const [eventsToFix] = await connection.execute(
      'SELECT id, title, created_by FROM calendar_chimie WHERE created_by = "system"'
    )
    
    if (eventsToFix.length > 0) {
      console.log(`  ℹ️  ${eventsToFix.length} événement(s) à corriger:`)
      eventsToFix.forEach(event => {
        console.log(`    - ${event.id}: "${event.title}"`)
      })
      
      await connection.execute(
        'UPDATE calendar_chimie SET created_by = ? WHERE created_by = "system"',
        [user.id.toString()]
      )
      console.log(`  ✅ ${eventsToFix.length} événement(s) corrigé(s)`)
    } else {
      console.log(`  ℹ️  Aucun événement à corriger`)
    }
    
    // 3. Corriger tous les créneaux avec user_id ou event_owner = 'system'
    console.log('\n📋 3. Correction des créneaux avec user_id ou event_owner = "system":')
    const [timeslotsToFix] = await connection.execute(
      'SELECT id, event_id, user_id, event_owner FROM timeslots_data WHERE user_id = "system" OR event_owner = "system"'
    )
    
    if (timeslotsToFix.length > 0) {
      console.log(`  ℹ️  ${timeslotsToFix.length} créneau(x) à corriger:`)
      timeslotsToFix.forEach(slot => {
        console.log(`    - ${slot.id}: event_id=${slot.event_id}, user_id=${slot.user_id}, event_owner=${slot.event_owner}`)
      })
      
      await connection.execute(
        'UPDATE timeslots_data SET user_id = ?, event_owner = ? WHERE user_id = "system" OR event_owner = "system"',
        [user.id.toString(), user.id.toString()]
      )
      console.log(`  ✅ ${timeslotsToFix.length} créneau(x) corrigé(s)`)
    } else {
      console.log(`  ℹ️  Aucun créneau à corriger`)
    }
    
    // 4. Vérifier les changements
    console.log('\n📋 4. Vérification finale:')
    
    const [remainingEvents] = await connection.execute(
      'SELECT COUNT(*) as count FROM calendar_chimie WHERE created_by = "system"'
    )
    console.log(`  Événements restants avec created_by="system": ${remainingEvents[0].count}`)
    
    const [remainingTimeslots] = await connection.execute(
      'SELECT COUNT(*) as count FROM timeslots_data WHERE user_id = "system" OR event_owner = "system"'
    )
    console.log(`  Créneaux restants avec user_id/event_owner="system": ${remainingTimeslots[0].count}`)
    
    console.log('\n🎉 Correction terminée avec succès!')
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔐 Connexion fermée')
    }
  }
}

fixAllTimeslotData()
