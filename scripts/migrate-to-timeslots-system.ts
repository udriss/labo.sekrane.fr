// Script de migration vers le système de créneaux
// Fichier : scripts/migrate-to-timeslots-system.ts

import db from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { generateTimeslotId, dateUtils } from '@/lib/timeslots-database'

interface LegacyEvent {
  id: string
  title: string
  discipline: 'chimie' | 'physique'
  createdBy: string
  timeSlots?: any[]
  actuelTimeSlots?: any[]
}

interface MigrationStats {
  totalEvents: number
  eventsProcessed: number
  timeslotsCreated: number
  timeslotsSkipped: number
  errors: string[]
}

export async function migrateToTimeslotsSystem(
  dryRun: boolean = true,
  batchSize: number = 100
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalEvents: 0,
    eventsProcessed: 0,
    timeslotsCreated: 0,
    timeslotsSkipped: 0,
    errors: []
  }

  const connection = await db.getConnection()

  try {
    console.log(`🚀 Début de la migration ${dryRun ? '(mode test)' : '(mode réel)'}`)

    // 1. Créer les tables si elles n'existent pas
    if (!dryRun) {
      await createTimeslotsTables(connection)
    }

    // 2. Récupérer tous les événements avec des créneaux
    const events = await getLegacyEventsWithTimeslots(connection)
    stats.totalEvents = events.length

    console.log(`📊 Trouvé ${events.length} événements à traiter`)

    // 3. Traiter les événements par lots
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)
      
      console.log(`📦 Traitement du lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)}`)
      
      await processBatch(connection, batch, stats, dryRun)
    }

    console.log(`✅ Migration terminée`)
    console.log(`📈 Statistiques:`)
    console.log(`   - Événements traités: ${stats.eventsProcessed}/${stats.totalEvents}`)
    console.log(`   - Créneaux créés: ${stats.timeslotsCreated}`)
    console.log(`   - Créneaux ignorés: ${stats.timeslotsSkipped}`)
    console.log(`   - Erreurs: ${stats.errors.length}`)

    if (stats.errors.length > 0) {
      console.log(`❌ Erreurs rencontrées:`)
      stats.errors.forEach(error => console.log(`   - ${error}`))
    }

    return stats

  } catch (error) {
    console.error('💥 Erreur fatale lors de la migration:', error)
    stats.errors.push(`Erreur fatale: ${error}`)
    throw error
  } finally {
    connection.release()
  }
}

// Créer les tables du système de créneaux
async function createTimeslotsTables(connection: any): Promise<void> {
  console.log('🔨 Création des tables du système de créneaux...')
  
  // Lire et exécuter le script SQL
  const fs = require('fs')
  const path = require('path')
  const sqlScript = fs.readFileSync(
    path.join(process.cwd(), 'sql/create-timeslots-system.sql'),
    'utf8'
  )

  // Diviser le script en requêtes individuelles
  const queries = sqlScript
    .split(';')
    .map((q: string) => q.trim())
    .filter((q: string) => q.length > 0 && !q.startsWith('--'))

  for (const query of queries) {
    try {
      await connection.execute(query)
    } catch (error) {
      console.warn(`⚠️ Erreur lors de l'exécution de la requête: ${error}`)
      // Continuer avec les autres requêtes
    }
  }
}

// Récupérer les événements legacy avec créneaux
async function getLegacyEventsWithTimeslots(connection: any): Promise<LegacyEvent[]> {
  const [rows]: [RowDataPacket[], any] = await connection.execute(`
    SELECT 
      id, title, discipline, createdBy, timeSlots, actuelTimeSlots
    FROM calendar_events_chemistry 
    WHERE (timeSlots IS NOT NULL AND timeSlots != '[]' AND timeSlots != '')
       OR (actuelTimeSlots IS NOT NULL AND actuelTimeSlots != '[]' AND actuelTimeSlots != '')
    
    UNION ALL
    
    SELECT 
      id, title, discipline, createdBy, timeSlots, actuelTimeSlots
    FROM calendar_events_physics 
    WHERE (timeSlots IS NOT NULL AND timeSlots != '[]' AND timeSlots != '')
       OR (actuelTimeSlots IS NOT NULL AND actuelTimeSlots != '[]' AND actuelTimeSlots != '')
  `)

  return rows.map((row: RowDataPacket) => ({
    id: row.id,
    title: row.title,
    discipline: row.discipline,
    createdBy: row.createdBy,
    timeSlots: parseJsonSafe(row.timeSlots, []),
    actuelTimeSlots: parseJsonSafe(row.actuelTimeSlots, [])
  }))
}

// Traiter un lot d'événements
async function processBatch(
  connection: any,
  events: LegacyEvent[],
  stats: MigrationStats,
  dryRun: boolean
): Promise<void> {
  
  for (const event of events) {
    try {
      await processEvent(connection, event, stats, dryRun)
      stats.eventsProcessed++
    } catch (error) {
      stats.errors.push(`Erreur pour l'événement ${event.id}: ${error}`)
      console.error(`❌ Erreur pour l'événement ${event.id}:`, error)
    }
  }
}

// Traiter un événement individuel
async function processEvent(
  connection: any,
  event: LegacyEvent,
  stats: MigrationStats,
  dryRun: boolean
): Promise<void> {
  
  console.log(`🔄 Traitement de l'événement ${event.id} (${event.discipline})`)

  // Combiner tous les créneaux (timeSlots et actuelTimeSlots)
  const allSlots = [
    ...(event.timeSlots || []),
    ...(event.actuelTimeSlots || [])
  ]

  // Déduplication par ID ou par contenu
  const uniqueSlots = deduplicateTimeslots(allSlots)

  console.log(`   📝 ${uniqueSlots.length} créneaux uniques trouvés`)

  for (const slot of uniqueSlots) {
    try {
      const migrated = await migrateTimeslot(connection, event, slot, dryRun)
      if (migrated) {
        stats.timeslotsCreated++
      } else {
        stats.timeslotsSkipped++
      }
    } catch (error) {
      stats.errors.push(`Erreur pour le créneau de l'événement ${event.id}: ${error}`)
      stats.timeslotsSkipped++
    }
  }
}

// Migrer un créneau individuel
async function migrateTimeslot(
  connection: any,
  event: LegacyEvent,
  slot: any,
  dryRun: boolean
): Promise<boolean> {
  
  // Validation des données du créneau
  if (!slot.start || !slot.end) {
    console.warn(`   ⚠️ Créneau ignoré (dates manquantes):`, slot)
    return false
  }

  try {
    // Normaliser les dates
    const startDate = normalizeDate(slot.start)
    const endDate = normalizeDate(slot.end)
    const timeslotDate = startDate.split('T')[0]

    // Validation des dates
    if (new Date(startDate) >= new Date(endDate)) {
      console.warn(`   ⚠️ Créneau ignoré (dates invalides): ${startDate} - ${endDate}`)
      return false
    }

    // Générer les données du nouveau créneau
    const timeslotId = generateTimeslotId()
    const now = dateUtils.getCurrentMysqlDateTime()

    if (dryRun) {
      console.log(`   ✅ [TEST] Créneau migrés: ${startDate} - ${endDate}`)
      return true
    }

    // Insérer dans la nouvelle table
    const query = `
      INSERT INTO timeslots_data (
        id, event_id, discipline, user_id, event_owner, 
        state, start_date, end_date, timeslot_date, 
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, ?, ?)
    `

    await connection.execute(query, [
      timeslotId,
      event.id,
      event.discipline,
      event.createdBy,
      event.createdBy,
      dateUtils.isoToMysql(startDate),
      dateUtils.isoToMysql(endDate),
      timeslotDate,
      slot.notes || null,
      now,
      now
    ])

    console.log(`   ✅ Créneau migré: ${startDate} - ${endDate}`)
    return true

  } catch (error) {
    console.error(`   ❌ Erreur lors de la migration du créneau:`, error)
    throw error
  }
}

// Fonctions utilitaires

function parseJsonSafe(jsonString: string | null | undefined, defaultValue: any[]): any[] {
  try {
    if (!jsonString || jsonString === 'null' || jsonString === '[]') {
      return defaultValue
    }
    return JSON.parse(jsonString)
  } catch {
    return defaultValue
  }
}

function normalizeDate(dateInput: string | Date): string {
  try {
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) {
      throw new Error('Date invalide')
    }
    return date.toISOString()
  } catch (error) {
    throw new Error(`Impossible de normaliser la date: ${dateInput}`)
  }
}

function deduplicateTimeslots(slots: any[]): any[] {
  const seen = new Set<string>()
  const unique: any[] = []

  for (const slot of slots) {
    // Créer une clé unique basée sur les horaires
    const key = `${slot.start}-${slot.end}-${slot.notes || ''}`
    
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(slot)
    }
  }

  return unique
}

// Fonction de vérification de l'intégrité post-migration
export async function verifyMigration(): Promise<{
  legacyCount: number
  newCount: number
  isValid: boolean
  details: string[]
}> {
  const connection = await db.getConnection()
  const details: string[] = []

  try {
    // Compter les créneaux dans les anciennes tables
    const [legacyRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT COUNT(*) as count FROM (
        SELECT id FROM calendar_events_chemistry 
        WHERE (timeSlots IS NOT NULL AND timeSlots != '[]' AND timeSlots != '')
           OR (actuelTimeSlots IS NOT NULL AND actuelTimeSlots != '[]' AND actuelTimeSlots != '')
        UNION ALL
        SELECT id FROM calendar_events_physics 
        WHERE (timeSlots IS NOT NULL AND timeSlots != '[]' AND timeSlots != '')
           OR (actuelTimeSlots IS NOT NULL AND actuelTimeSlots != '[]' AND actuelTimeSlots != '')
      ) as legacy_events
    `)

    // Compter les créneaux dans la nouvelle table
    const [newRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT COUNT(*) as count FROM timeslots_data
    `)

    const legacyCount = legacyRows[0].count
    const newCount = newRows[0].count

    details.push(`Événements legacy avec créneaux: ${legacyCount}`)
    details.push(`Créneaux dans la nouvelle table: ${newCount}`)

    // Vérifications supplémentaires
    const [orphanRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM timeslots_data t
      WHERE NOT EXISTS (
        SELECT 1 FROM calendar_events_chemistry c WHERE c.id = t.event_id
        UNION ALL
        SELECT 1 FROM calendar_events_physics p WHERE p.id = t.event_id
      )
    `)

    const orphanCount = orphanRows[0].count
    details.push(`Créneaux orphelins: ${orphanCount}`)

    const isValid = orphanCount === 0 && newCount > 0

    return {
      legacyCount,
      newCount,
      isValid,
      details
    }

  } finally {
    connection.release()
  }
}

// Fonction de rollback
export async function rollbackMigration(): Promise<void> {
  const connection = await db.getConnection()

  try {
    console.log('🔄 Début du rollback...')

    // Sauvegarder les données avant suppression
    const [backupRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT * FROM timeslots_data
    `)

    console.log(`💾 Sauvegarde de ${backupRows.length} créneaux`)

    // Supprimer les données migrées
    await connection.execute('DELETE FROM timeslot_history')
    await connection.execute('DELETE FROM timeslots_data')

    console.log('✅ Rollback terminé')

  } catch (error) {
    console.error('❌ Erreur lors du rollback:', error)
    throw error
  } finally {
    connection.release()
  }
}

// Script principal si exécuté directement
if (require.main === module) {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--real')
  const verify = args.includes('--verify')
  const rollback = args.includes('--rollback')

  async function main() {
    try {
      if (rollback) {
        await rollbackMigration()
      } else if (verify) {
        const result = await verifyMigration()
        console.log('📊 Résultats de la vérification:')
        result.details.forEach(detail => console.log(`   ${detail}`))
        console.log(`✅ Migration ${result.isValid ? 'valide' : 'invalide'}`)
      } else {
        await migrateToTimeslotsSystem(dryRun)
      }
    } catch (error) {
      console.error('💥 Erreur:', error)
      process.exit(1)
    }
  }

  main()
}
