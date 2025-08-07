// Script de validation de l'intégrité du système de créneaux
// Fichier : scripts/validate-timeslots-integrity.ts

import db from '@/lib/db'
import { RowDataPacket } from 'mysql2'

interface IntegrityReport {
  isValid: boolean
  timestamp: string
  summary: {
    totalTimeslots: number
    totalHistory: number
    validTimeslots: number
    invalidTimeslots: number
  }
  checks: IntegrityCheck[]
  recommendations: string[]
}

interface IntegrityCheck {
  name: string
  status: 'pass' | 'fail' | 'warning'
  count: number
  message: string
  details?: any[]
}

export async function validateTimeslotsIntegrity(
  includeDetails: boolean = false
): Promise<IntegrityReport> {
  
  const report: IntegrityReport = {
    isValid: true,
    timestamp: new Date().toISOString(),
    summary: {
      totalTimeslots: 0,
      totalHistory: 0,
      validTimeslots: 0,
      invalidTimeslots: 0
    },
    checks: [],
    recommendations: []
  }

  const connection = await db.getConnection()

  try {
    console.log('🔍 Début de la validation de l\'intégrité...')

    // Récupérer les statistiques générales
    await gatherGeneralStatistics(connection, report)

    // Exécuter toutes les vérifications
    await checkTablesExistence(connection, report)
    await checkDataConsistency(connection, report, includeDetails)
    await checkRelationalIntegrity(connection, report, includeDetails)
    await checkBusinessRules(connection, report, includeDetails)
    await checkPerformanceMetrics(connection, report)

    // Générer les recommandations
    generateRecommendations(report)

    // Déterminer le statut global
    report.isValid = report.checks.every(check => check.status !== 'fail')

    console.log(`✅ Validation terminée - Statut: ${report.isValid ? 'VALIDE' : 'INVALIDE'}`)
    console.log(`📊 Résumé: ${report.summary.validTimeslots}/${report.summary.totalTimeslots} créneaux valides`)

    return report

  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error)
    throw error
  } finally {
    connection.release()
  }
}

// Récupérer les statistiques générales
async function gatherGeneralStatistics(connection: any, report: IntegrityReport): Promise<void> {
  const [timeslotsCount]: [RowDataPacket[], any] = await connection.execute(
    'SELECT COUNT(*) as count FROM timeslots_data'
  )

  const [historyCount]: [RowDataPacket[], any] = await connection.execute(
    'SELECT COUNT(*) as count FROM timeslot_history'
  )

  report.summary.totalTimeslots = timeslotsCount[0].count
  report.summary.totalHistory = historyCount[0].count
}

// Vérifier l'existence des tables
async function checkTablesExistence(connection: any, report: IntegrityReport): Promise<void> {
  const requiredTables = ['timeslots_data', 'timeslot_history']
  const requiredViews = ['active_timeslots', 'pending_timeslots']

  for (const table of requiredTables) {
    try {
      await connection.execute(`DESCRIBE ${table}`)
      report.checks.push({
        name: `Table ${table}`,
        status: 'pass',
        count: 1,
        message: `Table ${table} existe`
      })
    } catch (error) {
      report.checks.push({
        name: `Table ${table}`,
        status: 'fail',
        count: 0,
        message: `Table ${table} manquante`
      })
      report.isValid = false
    }
  }

  for (const view of requiredViews) {
    try {
      await connection.execute(`SELECT 1 FROM ${view} LIMIT 1`)
      report.checks.push({
        name: `Vue ${view}`,
        status: 'pass',
        count: 1,
        message: `Vue ${view} accessible`
      })
    } catch (error) {
      report.checks.push({
        name: `Vue ${view}`,
        status: 'fail',
        count: 0,
        message: `Vue ${view} inaccessible`
      })
    }
  }
}

// Vérifier la cohérence des données
async function checkDataConsistency(
  connection: any, 
  report: IntegrityReport, 
  includeDetails: boolean
): Promise<void> {
  
  // 1. Dates cohérentes (timeslot_date = DATE(start_date))
  const [inconsistentDates]: [RowDataPacket[], any] = await connection.execute(`
    SELECT id, start_date, end_date, timeslot_date
    FROM timeslots_data 
    WHERE DATE(start_date) != timeslot_date
  `)

  report.checks.push({
    name: 'Cohérence des dates',
    status: inconsistentDates.length === 0 ? 'pass' : 'fail',
    count: inconsistentDates.length,
    message: `${inconsistentDates.length} créneaux avec dates incohérentes`,
    details: includeDetails ? inconsistentDates : undefined
  })

  // 2. Dates valides (start_date < end_date)
  const [invalidDateRanges]: [RowDataPacket[], any] = await connection.execute(`
    SELECT id, start_date, end_date
    FROM timeslots_data 
    WHERE start_date >= end_date
  `)

  report.checks.push({
    name: 'Plages de dates valides',
    status: invalidDateRanges.length === 0 ? 'pass' : 'fail',
    count: invalidDateRanges.length,
    message: `${invalidDateRanges.length} créneaux avec plages de dates invalides`,
    details: includeDetails ? invalidDateRanges : undefined
  })

  // 3. États valides
  const [invalidStates]: [RowDataPacket[], any] = await connection.execute(`
    SELECT id, state
    FROM timeslots_data 
    WHERE state NOT IN ('created', 'modified', 'deleted', 'invalidated', 'approved', 'rejected', 'restored')
  `)

  report.checks.push({
    name: 'États valides',
    status: invalidStates.length === 0 ? 'pass' : 'fail',
    count: invalidStates.length,
    message: `${invalidStates.length} créneaux avec états invalides`,
    details: includeDetails ? invalidStates : undefined
  })

  // 4. Disciplines valides
  const [invalidDisciplines]: [RowDataPacket[], any] = await connection.execute(`
    SELECT id, discipline
    FROM timeslots_data 
    WHERE discipline NOT IN ('chimie', 'physique')
  `)

  report.checks.push({
    name: 'Disciplines valides',
    status: invalidDisciplines.length === 0 ? 'pass' : 'fail',
    count: invalidDisciplines.length,
    message: `${invalidDisciplines.length} créneaux avec disciplines invalides`,
    details: includeDetails ? invalidDisciplines : undefined
  })

  // Mettre à jour le compteur de créneaux valides
  report.summary.invalidTimeslots = inconsistentDates.length + invalidDateRanges.length + invalidStates.length + invalidDisciplines.length
  report.summary.validTimeslots = report.summary.totalTimeslots - report.summary.invalidTimeslots
}

// Vérifier l'intégrité relationnelle
async function checkRelationalIntegrity(
  connection: any, 
  report: IntegrityReport, 
  includeDetails: boolean
): Promise<void> {
  
  // 1. Créneaux orphelins (event_id inexistant)
  const [orphanedTimeslots]: [RowDataPacket[], any] = await connection.execute(`
    SELECT t.id, t.event_id, t.discipline
    FROM timeslots_data t
    WHERE NOT EXISTS (
      SELECT 1 FROM calendar_events_chemistry c WHERE c.id = t.event_id
      UNION ALL
      SELECT 1 FROM calendar_events_physics p WHERE p.id = t.event_id
    )
  `)

  report.checks.push({
    name: 'Créneaux orphelins',
    status: orphanedTimeslots.length === 0 ? 'pass' : 'warning',
    count: orphanedTimeslots.length,
    message: `${orphanedTimeslots.length} créneaux sans événement parent`,
    details: includeDetails ? orphanedTimeslots : undefined
  })

  // 2. Historique orphelin (timeslot_id inexistant)
  const [orphanedHistory]: [RowDataPacket[], any] = await connection.execute(`
    SELECT h.id, h.timeslot_id
    FROM timeslot_history h
    WHERE NOT EXISTS (
      SELECT 1 FROM timeslots_data t WHERE t.id = h.timeslot_id
    )
  `)

  report.checks.push({
    name: 'Historique orphelin',
    status: orphanedHistory.length === 0 ? 'pass' : 'warning',
    count: orphanedHistory.length,
    message: `${orphanedHistory.length} entrées d'historique sans créneau`,
    details: includeDetails ? orphanedHistory : undefined
  })

  // 3. Références circulaires dans timeslot_parent
  const [circularRefs]: [RowDataPacket[], any] = await connection.execute(`
    WITH RECURSIVE circular_check AS (
      SELECT id, timeslot_parent, 0 as depth
      FROM timeslots_data
      WHERE timeslot_parent IS NOT NULL
      
      UNION ALL
      
      SELECT t.id, t.timeslot_parent, c.depth + 1
      FROM timeslots_data t
      JOIN circular_check c ON t.id = c.timeslot_parent
      WHERE c.depth < 10
    )
    SELECT DISTINCT id
    FROM circular_check
    WHERE depth >= 10
  `)

  report.checks.push({
    name: 'Références circulaires',
    status: circularRefs.length === 0 ? 'pass' : 'fail',
    count: circularRefs.length,
    message: `${circularRefs.length} créneaux avec références circulaires`,
    details: includeDetails ? circularRefs : undefined
  })
}

// Vérifier les règles métier
async function checkBusinessRules(
  connection: any, 
  report: IntegrityReport, 
  includeDetails: boolean
): Promise<void> {
  
  // 1. Chevauchements de créneaux actifs pour le même événement
  const [overlappingSlots]: [RowDataPacket[], any] = await connection.execute(`
    SELECT t1.id as id1, t2.id as id2, t1.event_id, t1.start_date, t1.end_date
    FROM timeslots_data t1
    JOIN timeslots_data t2 ON t1.event_id = t2.event_id 
      AND t1.id < t2.id
      AND t1.timeslot_date = t2.timeslot_date
    WHERE t1.state IN ('created', 'approved', 'modified')
      AND t2.state IN ('created', 'approved', 'modified')
      AND t1.start_date < t2.end_date
      AND t2.start_date < t1.end_date
  `)

  report.checks.push({
    name: 'Chevauchements de créneaux',
    status: overlappingSlots.length === 0 ? 'pass' : 'warning',
    count: overlappingSlots.length,
    message: `${overlappingSlots.length} paires de créneaux en chevauchement`,
    details: includeDetails ? overlappingSlots : undefined
  })

  // 2. Créneaux dans le passé lointain
  const [veryOldSlots]: [RowDataPacket[], any] = await connection.execute(`
    SELECT id, timeslot_date, state
    FROM timeslots_data
    WHERE timeslot_date < DATE_SUB(CURDATE(), INTERVAL 2 YEAR)
      AND state IN ('created', 'modified')
  `)

  report.checks.push({
    name: 'Créneaux anciens en attente',
    status: veryOldSlots.length === 0 ? 'pass' : 'warning',
    count: veryOldSlots.length,
    message: `${veryOldSlots.length} créneaux anciens encore en attente`,
    details: includeDetails ? veryOldSlots : undefined
  })

  // 3. Créneaux avec durée anormale (< 30 min ou > 8h)
  const [abnormalDuration]: [RowDataPacket[], any] = await connection.execute(`
    SELECT id, start_date, end_date, 
           TIMESTAMPDIFF(MINUTE, start_date, end_date) as duration_minutes
    FROM timeslots_data
    WHERE TIMESTAMPDIFF(MINUTE, start_date, end_date) < 30
       OR TIMESTAMPDIFF(MINUTE, start_date, end_date) > 480
  `)

  report.checks.push({
    name: 'Durées anormales',
    status: abnormalDuration.length === 0 ? 'pass' : 'warning',
    count: abnormalDuration.length,
    message: `${abnormalDuration.length} créneaux avec durées anormales`,
    details: includeDetails ? abnormalDuration : undefined
  })
}

// Vérifier les métriques de performance
async function checkPerformanceMetrics(connection: any, report: IntegrityReport): Promise<void> {
  
  // 1. Vérifier les index
  const [indexInfo]: [RowDataPacket[], any] = await connection.execute(`
    SHOW INDEX FROM timeslots_data
  `)

  const expectedIndexes = ['event_id', 'state', 'timeslot_date', 'user_id']
  const existingIndexes = indexInfo.map((row: RowDataPacket) => row.Column_name)
  const missingIndexes = expectedIndexes.filter(idx => !existingIndexes.includes(idx))

  report.checks.push({
    name: 'Index de performance',
    status: missingIndexes.length === 0 ? 'pass' : 'warning',
    count: existingIndexes.length,
    message: `${existingIndexes.length} index présents, ${missingIndexes.length} manquants`,
    details: missingIndexes.length > 0 ? missingIndexes : undefined
  })

  // 2. Fragmentation des tables
  const [tableInfo]: [RowDataPacket[], any] = await connection.execute(`
    SELECT 
      table_name,
      data_length,
      index_length,
      data_free
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN ('timeslots_data', 'timeslot_history')
  `)

  const fragmentationIssues = tableInfo.filter((row: RowDataPacket) => 
    row.data_free > (row.data_length * 0.1)
  )

  report.checks.push({
    name: 'Fragmentation des tables',
    status: fragmentationIssues.length === 0 ? 'pass' : 'warning',
    count: fragmentationIssues.length,
    message: `${fragmentationIssues.length} tables fragmentées`,
    details: fragmentationIssues
  })
}

// Générer les recommandations
function generateRecommendations(report: IntegrityReport): void {
  const failedChecks = report.checks.filter(check => check.status === 'fail')
  const warningChecks = report.checks.filter(check => check.status === 'warning')

  if (failedChecks.length > 0) {
    report.recommendations.push('🔴 Actions urgentes requises :')
    failedChecks.forEach(check => {
      if (check.name === 'Cohérence des dates') {
        report.recommendations.push('  - Exécuter le script fix-timeslots-timezone.ts pour corriger les dates')
      } else if (check.name === 'Plages de dates valides') {
        report.recommendations.push('  - Vérifier et corriger manuellement les créneaux avec dates invalides')
      } else if (check.name === 'États valides') {
        report.recommendations.push('  - Mettre à jour les créneaux avec des états non reconnus')
      }
    })
  }

  if (warningChecks.length > 0) {
    report.recommendations.push('🟡 Améliorations recommandées :')
    warningChecks.forEach(check => {
      if (check.name === 'Créneaux orphelins') {
        report.recommendations.push('  - Exécuter le script cleanup-timeslots.ts pour nettoyer les créneaux orphelins')
      } else if (check.name === 'Chevauchements de créneaux') {
        report.recommendations.push('  - Réviser les créneaux en chevauchement pour éviter les conflits')
      } else if (check.name === 'Index de performance') {
        report.recommendations.push('  - Ajouter les index manquants pour améliorer les performances')
      } else if (check.name === 'Fragmentation des tables') {
        report.recommendations.push('  - Optimiser les tables fragmentées avec OPTIMIZE TABLE')
      }
    })
  }

  if (report.summary.totalTimeslots > 10000) {
    report.recommendations.push('📊 Maintenance recommandée :')
    report.recommendations.push('  - Archiver les anciens créneaux pour améliorer les performances')
    report.recommendations.push('  - Planifier un nettoyage régulier des données obsolètes')
  }
}

// Générer un rapport détaillé
export function generateDetailedReport(report: IntegrityReport): string {
  const lines: string[] = []
  
  lines.push('=' .repeat(60))
  lines.push('RAPPORT D\'INTÉGRITÉ DU SYSTÈME DE CRÉNEAUX')
  lines.push('=' .repeat(60))
  lines.push(`Date: ${new Date(report.timestamp).toLocaleString('fr-FR')}`)
  lines.push(`Statut global: ${report.isValid ? '✅ VALIDE' : '❌ INVALIDE'}`)
  lines.push('')

  lines.push('RÉSUMÉ')
  lines.push('-'.repeat(20))
  lines.push(`Total créneaux: ${report.summary.totalTimeslots}`)
  lines.push(`Créneaux valides: ${report.summary.validTimeslots}`)
  lines.push(`Créneaux invalides: ${report.summary.invalidTimeslots}`)
  lines.push(`Entrées d'historique: ${report.summary.totalHistory}`)
  lines.push('')

  lines.push('VÉRIFICATIONS DÉTAILLÉES')
  lines.push('-'.repeat(30))
  
  report.checks.forEach(check => {
    const statusIcon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'
    lines.push(`${statusIcon} ${check.name}: ${check.message}`)
  })
  lines.push('')

  if (report.recommendations.length > 0) {
    lines.push('RECOMMANDATIONS')
    lines.push('-'.repeat(20))
    report.recommendations.forEach(rec => lines.push(rec))
    lines.push('')
  }

  lines.push('=' .repeat(60))
  
  return lines.join('\n')
}

// Script principal
if (require.main === module) {
  const args = process.argv.slice(2)
  const includeDetails = args.includes('--details')
  const saveReport = args.includes('--save')

  async function main() {
    try {
      const report = await validateTimeslotsIntegrity(includeDetails)
      
      const detailedReport = generateDetailedReport(report)
      console.log(detailedReport)

      if (saveReport) {
        const fs = require('fs')
        const filename = `timeslots-integrity-report-${new Date().toISOString().slice(0, 10)}.txt`
        fs.writeFileSync(filename, detailedReport)
        console.log(`📄 Rapport sauvegardé dans ${filename}`)
      }

      process.exit(report.isValid ? 0 : 1)
      
    } catch (error) {
      console.error('💥 Erreur:', error)
      process.exit(1)
    }
  }

  main()
}
