// Script de correction des problèmes de timezone
// Fichier : scripts/fix-timeslots-timezone.ts

import db from '@/lib/db'
import { RowDataPacket } from 'mysql2'
import { dateUtils } from '@/lib/timeslots-database'

interface TimezoneFixStats {
  totalTimeslots: number
  fixedTimeslots: number
  skippedTimeslots: number
  errors: string[]
}

export async function fixTimeslotsTimezone(
  targetTimezone: string = 'Europe/Paris',
  dryRun: boolean = true
): Promise<TimezoneFixStats> {
  
  const stats: TimezoneFixStats = {
    totalTimeslots: 0,
    fixedTimeslots: 0,
    skippedTimeslots: 0,
    errors: []
  }

  const connection = await db.getConnection()

  try {
    console.log(`🕐 Début de la correction timezone ${dryRun ? '(mode test)' : '(mode réel)'}`)
    console.log(`🌍 Timezone cible: ${targetTimezone}`)

    await connection.beginTransaction()

    // Récupérer tous les créneaux
    const [timeslots]: [RowDataPacket[], any] = await connection.execute(`
      SELECT id, start_date, end_date, timeslot_date, created_at, updated_at
      FROM timeslots_data
    `)

    stats.totalTimeslots = timeslots.length
    console.log(`📊 ${timeslots.length} créneaux à vérifier`)

    for (const timeslot of timeslots) {
      try {
        const fixed = await fixTimeslotTimezone(connection, timeslot, targetTimezone, dryRun)
        if (fixed) {
          stats.fixedTimeslots++
        } else {
          stats.skippedTimeslots++
        }
      } catch (error) {
        stats.errors.push(`Erreur pour le créneau ${timeslot.id}: ${error}`)
        stats.skippedTimeslots++
      }
    }

    if (!dryRun) {
      await connection.commit()
      console.log('✅ Corrections appliquées et validées')
    } else {
      await connection.rollback()
      console.log('✅ Test terminé (aucun changement)')
    }

    console.log(`📈 Résultats:`)
    console.log(`   Total vérifié: ${stats.totalTimeslots}`)
    console.log(`   Corrigé: ${stats.fixedTimeslots}`)
    console.log(`   Ignoré: ${stats.skippedTimeslots}`)
    console.log(`   Erreurs: ${stats.errors.length}`)

    return stats

  } catch (error) {
    await connection.rollback()
    console.error('❌ Erreur lors de la correction:', error)
    throw error
  } finally {
    connection.release()
  }
}

// Corriger un créneau individuel
async function fixTimeslotTimezone(
  connection: any,
  timeslot: RowDataPacket,
  targetTimezone: string,
  dryRun: boolean
): Promise<boolean> {
  
  try {
    // Analyser les dates actuelles
    const startDate = new Date(timeslot.start_date)
    const endDate = new Date(timeslot.end_date)
    const timeslotDate = timeslot.timeslot_date

    // Vérifier si les dates sont cohérentes
    const startDateOnly = startDate.toISOString().split('T')[0]
    const isConsistent = startDateOnly === timeslotDate

    if (isConsistent) {
      // Pas besoin de correction
      return false
    }

    console.log(`🔧 Correction nécessaire pour ${timeslot.id}:`)
    console.log(`   Date créneau: ${timeslotDate}`)
    console.log(`   Date début: ${startDate.toISOString()}`)
    console.log(`   Date fin: ${endDate.toISOString()}`)

    // Calculer les nouvelles dates
    const newStartDate = fixDateToTimezone(startDate, timeslotDate, targetTimezone)
    const newEndDate = fixDateToTimezone(endDate, timeslotDate, targetTimezone)

    console.log(`   Nouvelle date début: ${newStartDate}`)
    console.log(`   Nouvelle date fin: ${newEndDate}`)

    if (dryRun) {
      return true
    }

    // Appliquer la correction
    const updateQuery = `
      UPDATE timeslots_data 
      SET 
        start_date = ?,
        end_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `

    await connection.execute(updateQuery, [
      dateUtils.isoToMysql(newStartDate),
      dateUtils.isoToMysql(newEndDate),
      timeslot.id
    ])

    // Ajouter une entrée dans l'historique
    await addTimezoneFixHistory(connection, timeslot.id, {
      old_start: startDate.toISOString(),
      new_start: newStartDate,
      old_end: endDate.toISOString(),
      new_end: newEndDate
    })

    return true

  } catch (error) {
    console.error(`❌ Erreur lors de la correction du créneau ${timeslot.id}:`, error)
    throw error
  }
}

// Corriger une date pour qu'elle corresponde à la timezone et à la date du créneau
function fixDateToTimezone(
  originalDate: Date, 
  targetDate: string, 
  timezone: string
): string {
  
  // Extraire l'heure de la date originale
  const originalHours = originalDate.getHours()
  const originalMinutes = originalDate.getMinutes()
  const originalSeconds = originalDate.getSeconds()

  // Créer une nouvelle date avec la date cible et l'heure originale
  const newDate = new Date(`${targetDate}T${String(originalHours).padStart(2, '0')}:${String(originalMinutes).padStart(2, '0')}:${String(originalSeconds).padStart(2, '0')}`)

  return newDate.toISOString()
}

// Ajouter une entrée d'historique pour la correction de timezone
async function addTimezoneFixHistory(
  connection: any,
  timeslotId: string,
  changes: {
    old_start: string
    new_start: string
    old_end: string
    new_end: string
  }
): Promise<void> {
  
  const historyId = `hist_tz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const query = `
    INSERT INTO timeslot_history (
      id, timeslot_id, action, user_id, reason, data_changes
    ) VALUES (?, ?, 'modify', 'system', 'Correction automatique timezone', ?)
  `

  await connection.execute(query, [
    historyId,
    timeslotId,
    JSON.stringify(changes)
  ])
}

// Détecter les problèmes de timezone
export async function detectTimezoneIssues(): Promise<{
  inconsistentDates: number
  futureTimeslots: number
  pastTimeslots: number
  invalidDates: number
  details: any[]
}> {
  
  const connection = await db.getConnection()

  try {
    console.log('🔍 Détection des problèmes de timezone...')

    // Dates incohérentes (timeslot_date != DATE(start_date))
    const [inconsistentRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT 
        id, start_date, end_date, timeslot_date,
        DATE(start_date) as calculated_date
      FROM timeslots_data 
      WHERE DATE(start_date) != timeslot_date
    `)

    // Créneaux dans le futur lointain (plus de 2 ans)
    const [futureRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT id, start_date, end_date, timeslot_date
      FROM timeslots_data 
      WHERE timeslot_date > DATE_ADD(CURDATE(), INTERVAL 2 YEAR)
    `)

    // Créneaux très anciens (plus de 5 ans)
    const [pastRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT id, start_date, end_date, timeslot_date
      FROM timeslots_data 
      WHERE timeslot_date < DATE_SUB(CURDATE(), INTERVAL 5 YEAR)
    `)

    // Dates invalides (start_date >= end_date)
    const [invalidRows]: [RowDataPacket[], any] = await connection.execute(`
      SELECT id, start_date, end_date, timeslot_date
      FROM timeslots_data 
      WHERE start_date >= end_date
    `)

    console.log(`📊 Problèmes détectés:`)
    console.log(`   Dates incohérentes: ${inconsistentRows.length}`)
    console.log(`   Créneaux futurs suspects: ${futureRows.length}`)
    console.log(`   Créneaux très anciens: ${pastRows.length}`)
    console.log(`   Dates invalides: ${invalidRows.length}`)

    return {
      inconsistentDates: inconsistentRows.length,
      futureTimeslots: futureRows.length,
      pastTimeslots: pastRows.length,
      invalidDates: invalidRows.length,
      details: [
        ...inconsistentRows.map((row: RowDataPacket) => ({ ...row, issue: 'inconsistent_date' })),
        ...futureRows.map((row: RowDataPacket) => ({ ...row, issue: 'future_date' })),
        ...pastRows.map((row: RowDataPacket) => ({ ...row, issue: 'past_date' })),
        ...invalidRows.map((row: RowDataPacket) => ({ ...row, issue: 'invalid_date' }))
      ]
    }

  } finally {
    connection.release()
  }
}

// Valider la cohérence des dates après correction
export async function validateTimeslotsConsistency(): Promise<{
  isValid: boolean
  issues: string[]
  statistics: {
    totalTimeslots: number
    validTimeslots: number
    invalidTimeslots: number
  }
}> {
  
  const connection = await db.getConnection()
  const issues: string[] = []

  try {
    console.log('✅ Validation de la cohérence des créneaux...')

    // Total des créneaux
    const [totalRows]: [RowDataPacket[], any] = await connection.execute(
      'SELECT COUNT(*) as count FROM timeslots_data'
    )
    const totalTimeslots = totalRows[0].count

    // Vérification 1: Cohérence des dates
    const [dateIssues]: [RowDataPacket[], any] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM timeslots_data 
      WHERE DATE(start_date) != timeslot_date
    `)
    
    if (dateIssues[0].count > 0) {
      issues.push(`${dateIssues[0].count} créneaux avec dates incohérentes`)
    }

    // Vérification 2: Dates invalides
    const [invalidDates]: [RowDataPacket[], any] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM timeslots_data 
      WHERE start_date >= end_date
    `)
    
    if (invalidDates[0].count > 0) {
      issues.push(`${invalidDates[0].count} créneaux avec dates invalides`)
    }

    // Vérification 3: Créneaux orphelins
    const [orphans]: [RowDataPacket[], any] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM timeslots_data t
      WHERE NOT EXISTS (
        SELECT 1 FROM calendar_events_chemistry c WHERE c.id = t.event_id
        UNION ALL
        SELECT 1 FROM calendar_events_physics p WHERE p.id = t.event_id
      )
    `)
    
    if (orphans[0].count > 0) {
      issues.push(`${orphans[0].count} créneaux orphelins`)
    }

    // Vérification 4: Doublons potentiels
    const [duplicates]: [RowDataPacket[], any] = await connection.execute(`
      SELECT event_id, start_date, end_date, COUNT(*) as count
      FROM timeslots_data 
      WHERE state IN ('created', 'approved', 'modified')
      GROUP BY event_id, start_date, end_date
      HAVING count > 1
    `)
    
    if (duplicates.length > 0) {
      issues.push(`${duplicates.length} groupes de créneaux potentiellement dupliqués`)
    }

    const invalidTimeslots = dateIssues[0].count + invalidDates[0].count
    const validTimeslots = totalTimeslots - invalidTimeslots

    console.log(`📊 Résultats de la validation:`)
    console.log(`   Total: ${totalTimeslots}`)
    console.log(`   Valides: ${validTimeslots}`)
    console.log(`   Invalides: ${invalidTimeslots}`)
    console.log(`   Problèmes: ${issues.length}`)

    return {
      isValid: issues.length === 0,
      issues,
      statistics: {
        totalTimeslots,
        validTimeslots,
        invalidTimeslots
      }
    }

  } finally {
    connection.release()
  }
}

// Script principal
if (require.main === module) {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--real')
  const detect = args.includes('--detect')
  const validate = args.includes('--validate')
  const timezone = args.find(arg => arg.startsWith('--timezone='))?.split('=')[1] || 'Europe/Paris'

  async function main() {
    try {
      if (detect) {
        const issues = await detectTimezoneIssues()
        console.log('🔍 Détails des problèmes détectés:')
        issues.details.forEach((detail: any) => {
          console.log(`   ${detail.id}: ${detail.issue} - ${detail.timeslot_date} vs ${detail.calculated_date || 'N/A'}`)
        })
      } else if (validate) {
        const result = await validateTimeslotsConsistency()
        console.log(`✅ Validation ${result.isValid ? 'réussie' : 'échouée'}`)
        if (!result.isValid) {
          result.issues.forEach(issue => console.log(`   ❌ ${issue}`))
        }
      } else {
        const result = await fixTimeslotsTimezone(timezone, dryRun)
        console.log('📈 Résultats de la correction:')
        console.log(`   Total vérifié: ${result.totalTimeslots}`)
        console.log(`   Corrigé: ${result.fixedTimeslots}`)
        console.log(`   Ignoré: ${result.skippedTimeslots}`)
        
        if (result.errors.length > 0) {
          console.log('❌ Erreurs:')
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
