// Couche base de données pour la gestion des créneaux
// Fichier : lib/timeslots-database.ts

import db from '@/lib/db'
import { TimeslotData, TimeslotState, TimeslotProposal, Discipline, TimeslotHistoryEntry } from '@/types/timeslots'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

// Utilitaires de conversion de dates
export const dateUtils = {
  // Convertir ISO vers MySQL sans décalage timezone
  isoToMysql: (isoDate: string): string => {
    const date = new Date(isoDate)
    return date.toISOString().slice(0, 19).replace('T', ' ')
  },
  
  // Convertir MySQL vers ISO
  mysqlToIso: (mysqlDate: string): string => {
    return new Date(mysqlDate).toISOString()
  },
  
  // Obtenir la date/heure MySQL actuelle
  getCurrentMysqlDateTime: (): string => {
    return new Date().toISOString().slice(0, 19).replace('T', ' ')
  },
  
  // Obtenir la date MySQL actuelle
  getCurrentMysqlDate: (): string => {
    return new Date().toISOString().slice(0, 10)
  },
  
  // Valider une plage de dates
  validateDateRange: (start: string, end: string): boolean => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return startDate < endDate
  }
}

// Générer un ID unique pour les créneaux
export function generateTimeslotId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substr(2, 9)
  return `ts_${timestamp}_${randomStr}`
}

// Créer un nouveau créneau
export async function createTimeslot(
  eventId: string,
  discipline: Discipline,
  userId: string,
  eventOwner: string,
  startDate: string,
  endDate: string,
  notes?: string,
  timeslotParent?: string
): Promise<TimeslotData> {
  const connection = await db.getConnection()
  
  try {
    const id = generateTimeslotId()
    const mysqlStartDate = dateUtils.isoToMysql(startDate)
    const mysqlEndDate = dateUtils.isoToMysql(endDate)
    const timeslotDate = startDate.split('T')[0] // Extract date part
    
    // Valider les dates
    if (!dateUtils.validateDateRange(startDate, endDate)) {
      throw new Error('Date de fin doit être après la date de début')
    }
    
    const query = `
      INSERT INTO timeslots_data (
        id, event_id, discipline, user_id, event_owner, 
        timeslot_parent, state, start_date, end_date, 
        timeslot_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 'created', ?, ?, ?, ?)
    `
    
    await connection.execute(query, [
      id, eventId, discipline, userId, eventOwner,
      timeslotParent ?? null, mysqlStartDate, mysqlEndDate,
      timeslotDate, notes ?? null
    ])
    
    // Récupérer le créneau créé
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM timeslots_data WHERE id = ?',
      [id]
    )
    
    if (rows.length === 0) {
      throw new Error('Erreur lors de la création du créneau')
    }
    
    return convertDbRowToTimeslotData(rows[0])
    
  } finally {
    connection.release()
  }
}

// Mettre à jour un créneau existant avec state='modified'
export async function updateExistingTimeslot(
  timeslotId: string,
  userId: string,
  updates: Partial<Pick<TimeslotData, 'start_date' | 'end_date' | 'notes'>>
): Promise<TimeslotData> {
  const connection = await db.getConnection()
  
  try {
    // Vérifier que le créneau existe
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM timeslots_data WHERE id = ?',
      [timeslotId]
    )
    
    if (existing.length === 0) {
      throw new Error('Créneau non trouvé')
    }
    
    const currentTimeslot = existing[0]
    
    // Préparer les mises à jour
    const updateFields: string[] = []
    const updateValues: any[] = []
    
    if (updates.start_date) {
      updateFields.push('start_date = ?')
      updateValues.push(dateUtils.isoToMysql(updates.start_date))
      
      // Mettre à jour aussi timeslot_date si start_date change
      updateFields.push('timeslot_date = ?')
      updateValues.push(updates.start_date.split('T')[0])
    }
    
    if (updates.end_date) {
      updateFields.push('end_date = ?')
      updateValues.push(dateUtils.isoToMysql(updates.end_date))
    }
    
    if (updates.notes !== undefined) {
      updateFields.push('notes = ?')
      updateValues.push(updates.notes)
    }
    
    // Toujours marquer comme modifié
    updateFields.push('state = ?', 'user_id = ?')
    updateValues.push('modified', userId)
    
    updateValues.push(timeslotId)
    
    const query = `
      UPDATE timeslots_data 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    
    await connection.execute(query, updateValues)
    
    // Récupérer le créneau mis à jour
    const [updated] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM timeslots_data WHERE id = ?',
      [timeslotId]
    )
    
    return convertDbRowToTimeslotData(updated[0])
    
  } finally {
    connection.release()
  }
}

// Récupérer les créneaux actifs via la vue active_timeslots
export async function getActiveTimeslots(
  eventId?: string,
  discipline?: Discipline,
  userId?: string
): Promise<TimeslotData[]> {
  const connection = await db.getConnection()
  
  try {
    let query = 'SELECT * FROM active_timeslots WHERE 1=1'
    const params: any[] = []
    
    if (eventId) {
      query += ' AND event_id = ?'
      params.push(eventId)
    }
    
    if (discipline) {
      query += ' AND discipline = ?'
      params.push(discipline)
    }
    
    if (userId) {
      query += ' AND user_id = ?'
      params.push(userId)
    }
    
    query += ' ORDER BY timeslot_date ASC, start_date ASC'
    
    const [rows] = await connection.execute<RowDataPacket[]>(query, params)
    
    return rows.map(convertDbRowToTimeslotData)
    
  } finally {
    connection.release()
  }
}

// Récupérer tous les créneaux d'un événement
export async function getTimeslotsByEventId(
  eventId: string,
  discipline: Discipline,
  states?: TimeslotState[]
): Promise<TimeslotData[]> {
  const connection = await db.getConnection()
  
  try {
    let query = 'SELECT * FROM timeslots_data WHERE event_id = ? AND discipline = ?'
    const params: any[] = [eventId, discipline]
    
    if (states && states.length > 0) {
      const placeholders = states.map(() => '?').join(',')
      query += ` AND state IN (${placeholders})`
      params.push(...states)
    }
    
    query += ' ORDER BY timeslot_date ASC, start_date ASC'
    
    const [rows] = await connection.execute<RowDataPacket[]>(query, params)
    
    return rows.map(convertDbRowToTimeslotData)
    
  } finally {
    connection.release()
  }
}

// Proposer de nouveaux créneaux sans cleanup automatique
export async function proposeNewTimeslots(
  eventId: string,
  discipline: Discipline,
  userId: string,
  eventOwner: string,
  proposals: TimeslotProposal[]
): Promise<TimeslotData[]> {
  const connection = await db.getConnection()
  
  try {
    await connection.beginTransaction()
    
    const createdTimeslots: TimeslotData[] = []
    
    for (const proposal of proposals) {
      let timeslot: TimeslotData
      
      if (proposal.action === 'create') {
        // Créer un nouveau créneau
        timeslot = await createTimeslot(
          eventId,
          discipline,
          userId,
          eventOwner,
          proposal.start_date,
          proposal.end_date,
          proposal.notes,
          proposal.timeslot_parent
        )
      } else if (proposal.action === 'modify' && proposal.id) {
        // Modifier un créneau existant
        timeslot = await updateExistingTimeslot(
          proposal.id,
          userId,
          {
            start_date: proposal.start_date,
            end_date: proposal.end_date,
            notes: proposal.notes
          }
        )
      } else if (proposal.action === 'delete' && proposal.id) {
        // Marquer comme supprimé
        timeslot = await markTimeslotAsDeleted(proposal.id, userId, 'Suppression via proposition')
      } else {
        continue // Ignorer les actions non supportées
      }
      
      createdTimeslots.push(timeslot)
    }
    
    await connection.commit()
    
    return createdTimeslots
    
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// Marquer un créneau comme supprimé (suppression logique)
export async function markTimeslotAsDeleted(
  timeslotId: string,
  userId: string,
  reason?: string
): Promise<TimeslotData> {
  const connection = await db.getConnection()
  
  try {
    const query = `
      UPDATE timeslots_data 
      SET state = 'deleted', user_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    
    await connection.execute(query, [userId, timeslotId])
    
    // Ajouter une entrée dans l'historique
    if (reason) {
      await addHistoryEntry(timeslotId, 'delete', userId, reason)
    }
    
    // Récupérer le créneau mis à jour
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM timeslots_data WHERE id = ?',
      [timeslotId]
    )
    
    return convertDbRowToTimeslotData(rows[0])
    
  } finally {
    connection.release()
  }
}

// Approuver un créneau
export async function approveTimeslot(
  timeslotId: string,
  userId: string,
  reason?: string
): Promise<TimeslotData> {
  const connection = await db.getConnection()
  
  try {
    const query = `
      UPDATE timeslots_data 
      SET state = 'approved', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND state IN ('created', 'modified')
    `
    
    const [result] = await connection.execute<ResultSetHeader>(query, [timeslotId])
    
    if (result.affectedRows === 0) {
      throw new Error('Créneau non trouvé ou déjà traité')
    }
    
    // Ajouter une entrée dans l'historique
    await addHistoryEntry(timeslotId, 'approve', userId, reason || 'Créneau approuvé')
    
    // Récupérer le créneau mis à jour
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM timeslots_data WHERE id = ?',
      [timeslotId]
    )
    
    return convertDbRowToTimeslotData(rows[0])
    
  } finally {
    connection.release()
  }
}

// Rejeter un créneau
export async function rejectTimeslot(
  timeslotId: string,
  userId: string,
  reason?: string
): Promise<TimeslotData> {
  const connection = await db.getConnection()
  
  try {
    const query = `
      UPDATE timeslots_data 
      SET state = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND state IN ('created', 'modified')
    `
    
    const [result] = await connection.execute<ResultSetHeader>(query, [timeslotId])
    
    if (result.affectedRows === 0) {
      throw new Error('Créneau non trouvé ou déjà traité')
    }
    
    // Ajouter une entrée dans l'historique
    await addHistoryEntry(timeslotId, 'reject', userId, reason || 'Créneau rejeté')
    
    // Récupérer le créneau mis à jour
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM timeslots_data WHERE id = ?',
      [timeslotId]
    )
    
    return convertDbRowToTimeslotData(rows[0])
    
  } finally {
    connection.release()
  }
}

// Ajouter une entrée dans l'historique
export async function addHistoryEntry(
  timeslotId: string,
  action: string,
  userId: string,
  reason?: string,
  dataChanges?: Record<string, any>
): Promise<void> {
  const connection = await db.getConnection()
  
  try {
    const historyId = `hist_${generateTimeslotId()}`
    
    const query = `
      INSERT INTO timeslot_history (
        id, timeslot_id, action, user_id, reason, data_changes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
    
    await connection.execute(query, [
      historyId,
      timeslotId,
      action,
      userId,
      reason || null,
      dataChanges ? JSON.stringify(dataChanges) : null
    ])
    
  } finally {
    connection.release()
  }
}

// Récupérer l'historique d'un créneau
export async function getTimeslotHistory(timeslotId: string): Promise<TimeslotHistoryEntry[]> {
  const connection = await db.getConnection()
  
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM timeslot_history WHERE timeslot_id = ? ORDER BY created_at DESC',
      [timeslotId]
    )
    
    return rows.map((row: RowDataPacket) => ({
      id: row.id,
      timeslot_id: row.timeslot_id,
      action: row.action,
      previous_state: row.previous_state,
      new_state: row.new_state,
      user_id: row.user_id,
      reason: row.reason,
      created_at: row.created_at,
      data_changes: row.data_changes ? JSON.parse(row.data_changes) : undefined
    }))
    
  } finally {
    connection.release()
  }
}

// Obtenir les statistiques des créneaux
export async function getTimeslotStats(eventId: string, discipline: Discipline) {
  const connection = await db.getConnection()
  
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'CALL get_timeslot_stats(?, ?)',
      [eventId, discipline]
    )
    
    return rows[0] || {
      total: 0,
      active: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      deleted: 0
    }
    
  } finally {
    connection.release()
  }
}

// Convertir une ligne de base de données en TimeslotData
function convertDbRowToTimeslotData(row: RowDataPacket): TimeslotData {
  // Fonction helper pour s'assurer que les dates sont des strings
  const ensureString = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (value instanceof Date) return value.toISOString()
    return String(value)
  }
  
  try {
    const result = {
      id: String(row.id || ''),
      event_id: String(row.event_id || ''),
      discipline: row.discipline as Discipline,
      user_id: String(row.user_id || ''),
      event_owner: String(row.event_owner || ''),
      timeslot_parent: row.timeslot_parent ? String(row.timeslot_parent) : undefined,
      state: row.state,
      start_date: ensureString(dateUtils.mysqlToIso(row.start_date)),
      end_date: ensureString(dateUtils.mysqlToIso(row.end_date)),
      timeslot_date: ensureString(row.timeslot_date),
      notes: row.notes ? String(row.notes) : undefined,
      created_at: ensureString(dateUtils.mysqlToIso(row.created_at)),
      updated_at: ensureString(dateUtils.mysqlToIso(row.updated_at))
    }
    
    // Vérifier que l'objet est sérialisable
    JSON.stringify(result)
    
    return result
  } catch (error) {
    console.error('❌ [convertDbRowToTimeslotData] Erreur de conversion:', error, 'Row:', row)
    throw new Error(`Erreur de conversion des données de créneau: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
