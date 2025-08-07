// Script de nettoyage des créneaux obsolètes
// Fichier : scripts/cleanup-timeslots.ts

import db from '@/lib/db'
import { RowDataPacket } from 'mysql2'

interface CleanupStats {
  deletedTimeslots: number
  deletedHistory: number
  orphanedTimeslots: number
  oldTimeslots: number
  errors: string[]
}

export async function cleanupTimeslots(options: {
  removeDeleted?: boolean
  removeOrphaned?: boolean
  removeOlderThan?: number // jours
  dryRun?: boolean
} = {}): Promise<CleanupStats> {
  
  const {
    removeDeleted = true,
    removeOrphaned = true,
    removeOlderThan = 90,
    dryRun = true
  } = options

  const stats: CleanupStats = {
    deletedTimeslots: 0,
    deletedHistory: 0,
    orphanedTimeslots: 0,
    oldTimeslots: 0,
    errors: []
  }

  const connection = await db.getConnection()

  try {
    console.log(`🧹 Début du nettoyage ${dryRun ? '(mode test)' : '(mode réel)'}`)

    await connection.beginTransaction()

    // 1. Nettoyer les créneaux supprimés anciens
    if (removeDeleted) {
      const deletedCount = await cleanupDeletedTimeslots(connection, removeOlderThan, dryRun)
      stats.deletedTimeslots = deletedCount
      console.log(`🗑️ Créneaux supprimés nettoyés: ${deletedCount}`)
    }

    // 2. Nettoyer les créneaux orphelins
    if (removeOrphaned) {
      const orphanedCount = await cleanupOrphanedTimeslots(connection, dryRun)
      stats.orphanedTimeslots = orphanedCount
      console.log(`👻 Créneaux orphelins nettoyés: ${orphanedCount}`)
    }

    // 3. Nettoyer l'historique ancien
    const historyCount = await cleanupOldHistory(connection, removeOlderThan * 2, dryRun)
    stats.deletedHistory = historyCount
    console.log(`📚 Entrées d'historique nettoyées: ${historyCount}`)

    // 4. Nettoyer les créneaux très anciens
    const oldCount = await cleanupVeryOldTimeslots(connection, removeOlderThan * 3, dryRun)
    stats.oldTimeslots = oldCount
    console.log(`⏰ Créneaux très anciens nettoyés: ${oldCount}`)

    if (!dryRun) {
      await connection.commit()
      console.log('✅ Nettoyage terminé et validé')
    } else {
      await connection.rollback()
      console.log('✅ Test de nettoyage terminé (aucun changement)')
    }

    return stats

  } catch (error) {
    await connection.rollback()
    console.error('❌ Erreur lors du nettoyage:', error)
    stats.errors.push(`Erreur: ${error}`)
    throw error
  } finally {
    connection.release()
  }
}

// Nettoyer les créneaux marqués comme supprimés
async function cleanupDeletedTimeslots(
  connection: any, 
  olderThanDays: number, 
  dryRun: boolean
): Promise<number> {
  
  const query = `
    SELECT id FROM timeslots_data 
    WHERE state = 'deleted' 
    AND updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)
  `

  const [rows]: [RowDataPacket[], any] = await connection.execute(query, [olderThanDays])
  
  if (rows.length === 0 || dryRun) {
    return rows.length
  }

  // Supprimer l'historique associé
  for (const row of rows) {
    await connection.execute(
      'DELETE FROM timeslot_history WHERE timeslot_id = ?',
      [row.id]
    )
  }

  // Supprimer les créneaux
  const deleteQuery = `
    DELETE FROM timeslots_data 
    WHERE state = 'deleted' 
    AND updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)
  `

  const [result] = await connection.execute(deleteQuery, [olderThanDays])
  return result.affectedRows || 0
}

// Nettoyer les créneaux orphelins
async function cleanupOrphanedTimeslots(
  connection: any, 
  dryRun: boolean
): Promise<number> {
  
  const query = `
    SELECT t.id 
    FROM timeslots_data t
    WHERE NOT EXISTS (
      SELECT 1 FROM calendar_events_chemistry c WHERE c.id = t.event_id
      UNION ALL
      SELECT 1 FROM calendar_events_physics p WHERE p.id = t.event_id
    )
  `

  const [rows]: [RowDataPacket[], any] = await connection.execute(query)
  
  if (rows.length === 0 || dryRun) {
    return rows.length
  }

  // Supprimer l'historique associé
  for (const row of rows) {
    await connection.execute(
      'DELETE FROM timeslot_history WHERE timeslot_id = ?',
      [row.id]
    )
  }

  // Supprimer les créneaux orphelins
  const deleteQuery = `
    DELETE t FROM timeslots_data t
    WHERE NOT EXISTS (
      SELECT 1 FROM calendar_events_chemistry c WHERE c.id = t.event_id
      UNION ALL
      SELECT 1 FROM calendar_events_physics p WHERE p.id = t.event_id
    )
  `

  const [result] = await connection.execute(deleteQuery)
  return result.affectedRows || 0
}

// Nettoyer l'historique ancien
async function cleanupOldHistory(
  connection: any, 
  olderThanDays: number, 
  dryRun: boolean
): Promise<number> {
  
  const query = `
    SELECT COUNT(*) as count FROM timeslot_history 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
  `

  const [rows]: [RowDataPacket[], any] = await connection.execute(query, [olderThanDays])
  const count = rows[0].count
  
  if (count === 0 || dryRun) {
    return count
  }

  const deleteQuery = `
    DELETE FROM timeslot_history 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
  `

  const [result] = await connection.execute(deleteQuery, [olderThanDays])
  return result.affectedRows || 0
}

// Nettoyer les créneaux très anciens (approuvés mais très vieux)
async function cleanupVeryOldTimeslots(
  connection: any, 
  olderThanDays: number, 
  dryRun: boolean
): Promise<number> {
  
  const query = `
    SELECT id FROM timeslots_data 
    WHERE state IN ('approved', 'rejected') 
    AND timeslot_date < DATE_SUB(CURDATE(), INTERVAL ? DAY)
  `

  const [rows]: [RowDataPacket[], any] = await connection.execute(query, [olderThanDays])
  
  if (rows.length === 0 || dryRun) {
    return rows.length
  }

  // Supprimer l'historique associé
  for (const row of rows) {
    await connection.execute(
      'DELETE FROM timeslot_history WHERE timeslot_id = ?',
      [row.id]
    )
  }

  // Supprimer les créneaux très anciens
  const deleteQuery = `
    DELETE FROM timeslots_data 
    WHERE state IN ('approved', 'rejected') 
    AND timeslot_date < DATE_SUB(CURDATE(), INTERVAL ? DAY)
  `

  const [result] = await connection.execute(deleteQuery, [olderThanDays])
  return result.affectedRows || 0
}

// Optimiser les tables après nettoyage
export async function optimizeTimeslotsTables(): Promise<void> {
  const connection = await db.getConnection()

  try {
    console.log('⚡ Optimisation des tables...')

    await connection.execute('OPTIMIZE TABLE timeslots_data')
    await connection.execute('OPTIMIZE TABLE timeslot_history')

    // Analyser les tables pour mettre à jour les statistiques
    await connection.execute('ANALYZE TABLE timeslots_data')
    await connection.execute('ANALYZE TABLE timeslot_history')

    console.log('✅ Optimisation terminée')

  } catch (error) {
    console.error('❌ Erreur lors de l\'optimisation:', error)
    throw error
  } finally {
    connection.release()
  }
}

// Obtenir des statistiques sur les créneaux
export async function getTimeslotsStatistics(): Promise<{
  total: number
  byState: Record<string, number>
  byDiscipline: Record<string, number>
  oldestDate: string | null
  newestDate: string | null
  orphanedCount: number
}> {
  const connection = await db.getConnection()

  try {
    // Total des créneaux
    const [totalRows]: [RowDataPacket[], any] = await connection.execute(
      'SELECT COUNT(*) as count FROM timeslots_data'
    )

    // Par état
    const [stateRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT state, COUNT(*) as count 
      FROM timeslots_data 
      GROUP BY state
    `)

    // Par discipline
    const [disciplineRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT discipline, COUNT(*) as count 
      FROM timeslots_data 
      GROUP BY discipline
    `)

    // Dates extrêmes
    const [dateRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT 
        MIN(timeslot_date) as oldest_date,
        MAX(timeslot_date) as newest_date
      FROM timeslots_data
    `)

    // Créneaux orphelins
    const [orphanRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM timeslots_data t
      WHERE NOT EXISTS (
        SELECT 1 FROM calendar_events_chemistry c WHERE c.id = t.event_id
        UNION ALL
        SELECT 1 FROM calendar_events_physics p WHERE p.id = t.event_id
      )
    `)

    return {
      total: totalRows[0].count,
      byState: stateRows.reduce((acc: Record<string, number>, row: RowDataPacket) => {
        acc[row.state] = row.count
        return acc
      }, {}),
      byDiscipline: disciplineRows.reduce((acc: Record<string, number>, row: RowDataPacket) => {
        acc[row.discipline] = row.count
        return acc
      }, {}),
      oldestDate: dateRows[0].oldest_date,
      newestDate: dateRows[0].newest_date,
      orphanedCount: orphanRows[0].count
    }

  } finally {
    connection.release()
  }
}

// Script principal
if (require.main === module) {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--real')
  const optimize = args.includes('--optimize')
  const stats = args.includes('--stats')

  async function main() {
    try {
      if (stats) {
        const statistics = await getTimeslotsStatistics()
        console.log('📊 Statistiques des créneaux:')
        console.log(`   Total: ${statistics.total}`)
        console.log(`   Par état:`, statistics.byState)
        console.log(`   Par discipline:`, statistics.byDiscipline)
        console.log(`   Plus ancien: ${statistics.oldestDate}`)
        console.log(`   Plus récent: ${statistics.newestDate}`)
        console.log(`   Orphelins: ${statistics.orphanedCount}`)
      } else if (optimize) {
        await optimizeTimeslotsTables()
      } else {
        const result = await cleanupTimeslots({
          dryRun,
          removeDeleted: true,
          removeOrphaned: true,
          removeOlderThan: 90
        })
        
        console.log('📈 Résultats du nettoyage:')
        console.log(`   Créneaux supprimés: ${result.deletedTimeslots}`)
        console.log(`   Créneaux orphelins: ${result.orphanedTimeslots}`)
        console.log(`   Historique nettoyé: ${result.deletedHistory}`)
        console.log(`   Créneaux anciens: ${result.oldTimeslots}`)
        
        if (result.errors.length > 0) {
          console.log(`❌ Erreurs:`)
          result.errors.forEach(error => console.log(`   ${error}`))
        }
      }
    } catch (error) {
      console.error('💥 Erreur:', error)
      process.exit(1)
    }
  }

  main()
}
