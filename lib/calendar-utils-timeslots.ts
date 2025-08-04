
// lib/calendar-utils-timeslots.ts
// Nouvelles fonctions utilisant le système TimeSlots avec gestion d'état centralisée

import pool from '@/lib/db'
import { TimeSlot, CalendarEvent, EventState } from '@/types/calendar'
import { generateTimeSlotId } from '@/lib/calendar-utils-client'
import { v4 as uuidv4 } from 'uuid'
import { toZonedTime, format as formatTz } from 'date-fns-tz'

// Types pour les salles en tant qu'objets JSON
export interface RoomData {
  id: string
  name: string
  capacity?: number
  description?: string
}

// Fonction pour normaliser les données de salle (string ou objet)
export function normalizeRoomData(room: string | RoomData | null | undefined): RoomData | null {
  if (!room) return null
  
  if (typeof room === 'string') {
    // Si c'est une chaîne, essayer de parser comme JSON
    if (room.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(room)
        return {
          id: parsed.id || parsed.name || room,
          name: parsed.name || room,
          capacity: parsed.capacity,
          description: parsed.description
        }
      } catch {
        // Si le parsing échoue, traiter comme nom simple
        return {
          id: room,
          name: room
        }
      }
    } else {
      // Nom simple de salle
      return {
        id: room,
        name: room
      }
    }
  }
  
  // Si c'est déjà un objet
  return {
    id: room.id || room.name || 'unknown',
    name: room.name || room.id || 'Salle inconnue',
    capacity: room.capacity,
    description: room.description
  }
}

// Fonction pour obtenir le nom d'affichage d'une salle
export function getRoomDisplayName(room: string | RoomData | null | undefined): string {
  if (!room) return ''
  
  if (typeof room === 'string') {
    return room
  }
  
  return room.name || room.id || 'Salle inconnue'
}

// Fonction pour comparer deux room data
export function compareRoomData(room1: string | RoomData | null | undefined, room2: string | RoomData | null | undefined): boolean {
  if (!room1 && !room2) return true
  if (!room1 || !room2) return false
  
  const normalized1 = normalizeRoomData(room1)
  const normalized2 = normalizeRoomData(room2)
  
  if (!normalized1 || !normalized2) return false
  
  return normalized1.id === normalized2.id
}

// Fonction pour convertir un objet room en JSON string pour la base de données
export function serializeRoomData(room: RoomData | null): string | null {
  if (!room) return null
  return JSON.stringify(room)
}

// Fonction sécurisée pour sérialiser n'importe quel objet JSON pour MySQL
export function safeJsonStringify(value: any): string | null {
  if (value === null || value === undefined) {
    return null
  }
  
  if (typeof value === 'string' && value.trim() === '') {
    return null
  }
  
  try {
    const result = JSON.stringify(value)
    // Éviter les chaînes vides ou les objets vides qui causent des erreurs MySQL
    if (result === '""' || result === '{}' || result === 'null') {
      return null
    }
    return result
  } catch (error) {
    console.error('Erreur de sérialisation JSON:', error)
    return null
  }
}

// Fonction utilitaire pour convertir une date ISO en format MySQL DATETIME avec timezone Paris
function formatDateForMySQL(isoDateString: string): string {
  try {
    const date = new Date(isoDateString)
    if (isNaN(date.getTime())) {
      throw new Error('Date invalide')
    }
    
    // Convertir vers le timezone Paris (Europe/Paris)
    const parisTimeZone = 'Europe/Paris'
    const parisDate = toZonedTime(date, parisTimeZone)
    
    // Format MySQL DATETIME: YYYY-MM-DD HH:MM:SS
    return formatTz(parisDate, 'yyyy-MM-dd HH:mm:ss', { timeZone: parisTimeZone })
  } catch (error) {
    console.error('Erreur lors du formatage de la date pour MySQL:', error, 'Date:', isoDateString)
    // Retourner une date par défaut en cas d'erreur avec timezone Paris
    const fallbackDate = toZonedTime(new Date(), 'Europe/Paris')
    return formatTz(fallbackDate, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Europe/Paris' })
  }
}

// Fonction utilitaire pour parser le JSON de manière sécurisée
function parseJsonSafe<T>(jsonString: string | null | undefined | any, defaultValue: T): T {
  try {
    if (!jsonString || jsonString === 'null' || jsonString === 'undefined') {
      return defaultValue
    }
    
    // Si c'est déjà un objet (pas une chaîne), le retourner directement
    if (typeof jsonString === 'object') {
      return jsonString as T
    }
    
    // Vérifier si c'est "[object Object]" - corruption courante
    if (jsonString === '[object Object]' || jsonString.includes('[object Object]')) {
      console.warn('Detected corrupted JSON string "[object Object]", using default value')
      return defaultValue
    }
    
    // Si la chaîne commence par "[object Object]" ou contient cette chaîne, essayer de la nettoyer
    if (typeof jsonString === 'string' && jsonString.includes('[object Object]')) {
      console.warn('Detected corrupted JSON with [object Object], using default value')
      return defaultValue
    }
    
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.warn('Erreur lors du parsing JSON:', error, 'String:', jsonString)
    return defaultValue
  }
}

// Fonction utilitaire pour transformer les matériaux/équipements
function transformMaterials(rawData: any[]): any[] {
  return rawData.map((item: any) => {
    if (typeof item === 'string') {
      return { id: item, name: item };
    }
    return {
      id: item.id || item,
      name: item.name || item.itemName || (typeof item === 'string' ? item : 'Matériel'),
      itemName: item.itemName || item.name,
      quantity: item.quantity || 1,
      volume: item.volume,
      isCustom: item.isCustom || false
    };
  });
}

// Fonction utilitaire pour transformer les produits chimiques/consommables
function transformChemicals(rawData: any[], discipline = 'chimie'): any[] {
  return rawData.map((item: any) => {
    if (typeof item === 'string') {
      return { id: item, name: item };
    }
    return {
      id: item.id || item,
      name: item.name || (typeof item === 'string' ? item : (discipline === 'physique' ? 'Consommable' : 'Réactif')),
      requestedQuantity: item.requestedQuantity || 1,
      quantity: item.quantity,
      unit: item.unit,
      isCustom: item.isCustom || false,
      ...(discipline === 'chimie' ? { formula: item.formula } : {})
    };
  });
}

// Types pour les événements de calendrier avec le nouveau système TimeSlots
export interface CalendarEventWithTimeSlots {
  id: string
  title: string
  start_date: string
  end_date: string
  description?: string
  type: 'tp' | 'cours' | 'exam' | 'maintenance' | 'reservation' | 'other'
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  state?: 'PENDING' | 'VALIDATED' | 'CANCELLED' | 'MOVED' | 'IN_PROGRESS'
  room?: RoomData | null // Support pour string legacy et nouveau format objet
  teacher?: string
  class_data?: {
    id: string
    name: string
    type: 'predefined' | 'custom' | 'auto'
  } | null
  participants?: string[] // Will be stored as JSON
  equipment_used?: string[] // Will be stored as JSON
  chemicals_used?: string[] // Will be stored as JSON
  consommables_used?: string[] // Will be stored as JSON
  notes?: string
  color?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  timeSlots?: TimeSlot[] // Array des TimeSlots proposés/modifiés
  actuelTimeSlots?: TimeSlot[] // Array des TimeSlots actuels acceptés par l'owner
  stateChangeReason?: string
  lastStateChange?: {
    from: string
    to: string
    date: string
    userId: string
    reason?: string
  } | null
  validationState?: 'noPending' | 'ownerPending' | 'operatorPending'
}

// Fonction pour obtenir tous les événements de chimie avec les nouveaux champs
export async function getChemistryEventsWithTimeSlots(startDate?: string, endDate?: string): Promise<CalendarEventWithTimeSlots[]> {
  try {
    let query = `
      SELECT 
        c.*,
        u.name as creator_name,
        u.email as creator_email
      FROM calendar_chimie c
      LEFT JOIN users u ON c.created_by = u.id
    `
    const params: any[] = []
    
    if (startDate && endDate) {
      query += ' WHERE c.start_date >= ? AND c.end_date <= ?'
      params.push(startDate, endDate)
    } else if (startDate) {
      query += ' WHERE c.start_date >= ?'
      params.push(startDate)
    } else if (endDate) {
      query += ' WHERE c.end_date <= ?'
      params.push(endDate)
    }
    
    query += ' ORDER BY c.start_date ASC'
    
    const [rows] = await pool.execute(query, params)
    
    return (rows as any[]).map(row => {
      // Parser les TimeSlots depuis les nouveaux champs JSON
      let timeSlots: TimeSlot[] = []
      let actuelTimeSlots: TimeSlot[] = []
      let lastStateChange = null
      
      try {
        // Utiliser les nouveaux champs timeSlots et actuelTimeSlots avec parsing sécurisé
        timeSlots = parseJsonSafe(row.timeSlots, [])
        actuelTimeSlots = parseJsonSafe(row.actuelTimeSlots, [])
        lastStateChange = parseJsonSafe(row.lastStateChange, null)
        
        // Fallback vers l'ancien système si les nouveaux champs sont vides
        if (timeSlots.length === 0 && actuelTimeSlots.length === 0 && row.notes) {
          try {
            const parsedNotes = parseJsonSafe(row.notes, {} as any)
            if (parsedNotes.timeSlots) {
              timeSlots = parsedNotes.timeSlots || []
              actuelTimeSlots = parsedNotes.actuelTimeSlots || []
            }
          } catch (noteError) {
            // Ignore l'erreur de parsing des notes
          }
        }
        
        // Si toujours vides, créer des timeSlots à partir de start_date/end_date
        if (timeSlots.length === 0 && actuelTimeSlots.length === 0) {
          const defaultSlot: TimeSlot = {
            id: `${row.id}-default`,
            startDate: row.start_date,
            endDate: row.end_date,
            status: 'active',
            createdBy: row.created_by
          }
          timeSlots = [defaultSlot]
          actuelTimeSlots = [defaultSlot]
        }
      } catch (error) {
        console.error('Erreur parsing TimeSlots:', error)
        // Fallback: créer des TimeSlots depuis les dates de l'événement si le JSON est invalide
        const fallbackSlot: TimeSlot = {
          id: generateTimeSlotId(),
          startDate: new Date(row.start_date).toISOString(),
          endDate: new Date(row.end_date).toISOString(),
          status: 'active' as const,
          createdBy: row.created_by || 'system',
          modifiedBy: [{
            userId: row.created_by || 'system',
            date: row.created_at || new Date().toISOString(),
            action: 'created' as const
          }]
        }
        timeSlots = [fallbackSlot]
        actuelTimeSlots = [fallbackSlot]
      }

      return {
        id: row.id,
        title: row.title,
        start_date: row.start_date,
        end_date: row.end_date,
        description: row.description,
        type: row.type,
        status: row.status,
        state: row.state || 'VALIDATED',
        room: normalizeRoomData(row.room), // Normaliser les données de salle
        teacher: row.teacher,
        class_data: parseJsonSafe(row.class_data, null), // Nouveau champ
        participants: parseJsonSafe(row.participants, []),
        equipment_used: transformMaterials(parseJsonSafe(row.equipment_used, [])),
        chemicals_used: transformChemicals(parseJsonSafe(row.chemicals_used, []), 'chimie'),
        notes: row.notes,
        color: row.color,
        created_by: row.created_by,
        creator_name: row.creator_name, // Nouveau champ depuis le JOIN
        creator_email: row.creator_email, // Nouveau champ depuis le JOIN
        created_at: row.created_at,
        updated_at: row.updated_at,
        timeSlots,
        actuelTimeSlots,
        stateChangeReason: row.stateChangeReason,
        lastStateChange,
        validationState: row.validationState
      }
    })
    
  } catch (error) {
    console.error('Erreur lors de la récupération des événements de chimie:', error)
    throw error
  }
}

// Fonction pour créer un événement de chimie avec les nouveaux champs
export async function createChemistryEventWithTimeSlots(eventData: Partial<CalendarEventWithTimeSlots>): Promise<CalendarEventWithTimeSlots> {
  try {
    const id = uuidv4()
    
    const query = `
      INSERT INTO calendar_chimie (
        id, title, start_date, end_date, description, type, status, state,
        room, teacher, class_data, participants, equipment_used, chemicals_used,
        notes, color, created_by, timeSlots, actuelTimeSlots, lastStateChange,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `
    
    const params = [
      id,
      eventData.title || '',
      eventData.start_date ? formatDateForMySQL(eventData.start_date) : '',
      eventData.end_date ? formatDateForMySQL(eventData.end_date) : '',
      eventData.description || '',
      eventData.type || 'other',
      eventData.status || 'scheduled',
      eventData.state || 'VALIDATED',
      safeJsonStringify(normalizeRoomData(eventData.room)), // Sérialisation sécurisée des données de salle
      eventData.teacher || '',
      safeJsonStringify(eventData.class_data),
      safeJsonStringify(eventData.participants || []),
      safeJsonStringify(eventData.equipment_used || []),
      safeJsonStringify(eventData.chemicals_used || []),
      eventData.notes || '',
      eventData.color || '#2196f3',
      eventData.created_by || '',
      safeJsonStringify(eventData.timeSlots || []),
      safeJsonStringify(eventData.actuelTimeSlots || []),
      safeJsonStringify(eventData.lastStateChange)
    ]
    
    await pool.execute(query, params)
    
    // Retourner l'événement créé
    const [rows] = await pool.execute('SELECT * FROM calendar_chimie WHERE id = ?', [id])
    const createdEvent = (rows as any[])[0]
    
    return {
      ...createdEvent,
      timeSlots: parseJsonSafe(createdEvent.timeSlots, []),
      actuelTimeSlots: parseJsonSafe(createdEvent.actuelTimeSlots, []),
      lastStateChange: parseJsonSafe(createdEvent.lastStateChange, null)
    }
    
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement de chimie:', error)
    throw error
  }
}

// Fonction pour mettre à jour un événement de chimie avec les nouveaux champs
export async function updateChemistryEventWithTimeSlots(
  id: string, 
  eventData: Partial<CalendarEventWithTimeSlots>
): Promise<CalendarEventWithTimeSlots> {
  try {
    // Convertir 'class' vers 'class_data' si nécessaire
    const processedEventData = { ...eventData } as any
    if ((eventData as any).class && Array.isArray((eventData as any).class) && (eventData as any).class.length > 0) {
      processedEventData.class_data = (eventData as any).class[0] // Prendre le premier élément du tableau
      delete processedEventData.class // Supprimer l'ancien champ
    }
    
    const updates: string[] = []
    const params: any[] = []
    
    // Construire la requête de mise à jour dynamiquement
    Object.entries(processedEventData).forEach(([key, value]) => {
      if (key === 'id') return // Skip ID
      
      if (key === 'timeSlots' || key === 'actuelTimeSlots' || key === 'lastStateChange') {
        // Champs JSON - traiter comme des objets
        updates.push(`${key} = ?`)
        params.push(JSON.stringify(value))
      } else if (key === 'participants' || key === 'equipment_used' || key === 'chemicals_used') {
        // Champs JSON
        updates.push(`${key} = ?`)
        params.push(JSON.stringify(value))
      } else if (key === 'start_date' || key === 'end_date') {
        // Formater les dates pour MySQL (exclure updated_at car traité séparément)
        updates.push(`${key} = ?`)
        params.push(value ? formatDateForMySQL(value as string) : value)
      } else if (key === 'updated_at') {
        // Traiter updated_at séparément
        updates.push(`${key} = ?`)
        params.push(value ? formatDateForMySQL(value as string) : value)
      } else if (key === 'room') {
        // Traiter les données de salle spécialement
        updates.push(`${key} = ?`)
        params.push(safeJsonStringify(normalizeRoomData(value as string | RoomData)))
      } else if (key === 'validationState') {
        // Champ enum pour le statut de validation
        updates.push(`${key} = ?`)
        params.push(value)
      } else {
        // Autres champs texte/nombre (y compris class_data et autres JSON)
        updates.push(`${key} = ?`)
        if (['class_data', 'equipment_used', 'chemicals_used', 'timeSlots', 'actuelTimeSlots', 'lastStateChange', 'participants'].includes(key)) {
          params.push(safeJsonStringify(value))
        } else {
          params.push(value)
        }
      }
    })
    
    if (updates.length === 0) {
      throw new Error('Aucune mise à jour spécifiée')
    }
    
    // Ajouter updated_at = NOW() seulement si pas déjà fourni dans processedEventData
    if (!processedEventData.hasOwnProperty('updated_at')) {
      updates.push('updated_at = NOW()')
    }
    
    params.push(id)
    
    const query = `UPDATE calendar_chimie SET ${updates.join(', ')} WHERE id = ?`
    
    await pool.execute(query, params)
    
    // Retourner l'événement mis à jour
    const [rows] = await pool.execute('SELECT * FROM calendar_chimie WHERE id = ?', [id])
    const updatedEvent = (rows as any[])[0]
    
    if (!updatedEvent) {
      throw new Error('Événement non trouvé après mise à jour')
    }
    
    return {
      ...updatedEvent,
      timeSlots: parseJsonSafe(updatedEvent.timeSlots, []),
      actuelTimeSlots: parseJsonSafe(updatedEvent.actuelTimeSlots, []),
      lastStateChange: parseJsonSafe(updatedEvent.lastStateChange, null)
    }
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement de chimie:', error)
    throw error
  }
}

// Fonction pour obtenir un événement de chimie par ID avec les nouveaux champs
export async function getChemistryEventByIdWithTimeSlots(id: string): Promise<CalendarEventWithTimeSlots | null> {
  try {
    const [rows] = await pool.execute('SELECT * FROM calendar_chimie WHERE id = ?', [id])
    const events = rows as any[]
    
    if (events.length === 0) {
      return null
    }
    
    const row = events[0]
    
    return {
      ...row,
      timeSlots: parseJsonSafe(row.timeSlots, []),
      actuelTimeSlots: parseJsonSafe(row.actuelTimeSlots, []),
      lastStateChange: parseJsonSafe(row.lastStateChange, null),
      participants: parseJsonSafe(row.participants, []),
      equipment_used: transformMaterials(parseJsonSafe(row.equipment_used, [])),
      chemicals_used: transformChemicals(parseJsonSafe(row.chemicals_used, []), 'chimie')
    }
    
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement de chimie:', error)
    throw error
  }
}

// ============================================================================
// FONCTIONS PHYSIQUE - Équivalentes aux fonctions chimie pour table calendar_physique
// ============================================================================

// Fonction pour obtenir tous les événements de physique avec les nouveaux champs
export async function getPhysicsEventsWithTimeSlots(startDate?: string, endDate?: string): Promise<CalendarEventWithTimeSlots[]> {
  try {
    let query = `
      SELECT 
        p.*,
        u.name as creator_name,
        u.email as creator_email
      FROM calendar_physique p
      LEFT JOIN users u ON p.created_by = u.id
    `
    const params: any[] = []
    
    if (startDate && endDate) {
      query += ' WHERE p.start_date >= ? AND p.end_date <= ?'
      params.push(startDate, endDate)
    }
    
    query += ' ORDER BY p.start_date ASC'
    
    const [rows] = await pool.execute(query, params)
    
    return (rows as any[]).map(row => ({
      id: row.id,
      title: row.title,
      start_date: row.start_date,
      end_date: row.end_date,
      description: row.description,
      type: row.type,
      status: row.status,
      state: row.state,
      room: normalizeRoomData(row.room), // Normaliser les données de salle
      teacher: row.teacher,
      class_data: row.class_data,
      notes: row.notes,
      color: row.color,
      created_by: row.created_by,
      creator_name: row.creator_name, // Nouveau champ depuis le JOIN
      creator_email: row.creator_email, // Nouveau champ depuis le JOIN
      created_at: row.created_at,
      updated_at: row.updated_at,
      stateChangeReason: row.stateChangeReason,
      
      // Parser les champs JSON en toute sécurité
      timeSlots: parseJsonSafe(row.timeSlots, []),
      actuelTimeSlots: parseJsonSafe(row.actuelTimeSlots, []),
      lastStateChange: parseJsonSafe(row.lastStateChange, null),
      participants: parseJsonSafe(row.participants, []),
      equipment_used: transformMaterials(parseJsonSafe(row.equipment_used, [])),
      consommables_used: transformChemicals(parseJsonSafe(row.consommables_used, []), 'physique')
    }))
    
  } catch (error) {
    console.error('Erreur lors de la récupération des événements de physique avec TimeSlots:', error)
    throw error
  }
}

// Fonction pour créer un événement de physique avec le système TimeSlots
export async function createPhysicsEventWithTimeSlots(eventData: Partial<CalendarEventWithTimeSlots>): Promise<CalendarEventWithTimeSlots> {
  try {
    // Générer un ID unique pour l'événement
    const eventId = uuidv4()
    
    // Préparer les données avec les valeurs par défaut
    const finalEventData = {
      id: eventId,
      title: eventData.title || '',
      start_date: eventData.start_date ? formatDateForMySQL(eventData.start_date) : formatDateForMySQL(new Date().toISOString()),
      end_date: eventData.end_date ? formatDateForMySQL(eventData.end_date) : formatDateForMySQL(new Date().toISOString()),
      description: eventData.description || '',
      type: eventData.type || 'other',
      status: eventData.status || 'scheduled',
      state: eventData.state || 'VALIDATED',
      room: safeJsonStringify(normalizeRoomData(eventData.room)), // Sérialisation sécurisée
      teacher: eventData.teacher || '',
      class_data: safeJsonStringify(eventData.class_data),
      notes: eventData.notes || '',
      color: eventData.color || '#2196f3',
      created_by: eventData.created_by || '',
      stateChangeReason: eventData.stateChangeReason || '',
      
      // Sérialiser les champs JSON
      participants: safeJsonStringify(eventData.participants || []),
      equipment_used: safeJsonStringify(eventData.equipment_used || []),
      consommables_used: safeJsonStringify(eventData.consommables_used || []),
      timeSlots: safeJsonStringify(eventData.timeSlots || []),
      actuelTimeSlots: safeJsonStringify(eventData.actuelTimeSlots || []),
      lastStateChange: safeJsonStringify(eventData.lastStateChange)
    }
    
    // Construire la requête d'insertion
    const fields = Object.keys(finalEventData)
    const placeholders = fields.map(() => '?').join(', ')
    const query = `
      INSERT INTO calendar_physique (${fields.join(', ')})
      VALUES (${placeholders})
    `
    
    const values = Object.values(finalEventData)
    
    await pool.execute(query, values)
    
    // Retourner l'événement créé avec les données parsées
    return {
      ...finalEventData,
      room: normalizeRoomData(eventData.room), // Retourner l'objet room normalisé
      class_data: eventData.class_data || null, // Retourner les données class originales
      participants: eventData.participants || [],
      equipment_used: eventData.equipment_used || [],
      consommables_used: eventData.consommables_used || [],
      timeSlots: eventData.timeSlots || [],
      actuelTimeSlots: eventData.actuelTimeSlots || [],
      lastStateChange: eventData.lastStateChange || undefined
    }
    
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement de physique avec TimeSlots:', error)
    throw error
  }
}

// Fonction pour mettre à jour un événement de physique avec le système TimeSlots
export async function updatePhysicsEventWithTimeSlots(id: string, updateData: Partial<CalendarEventWithTimeSlots>): Promise<CalendarEventWithTimeSlots> {
  try {
    // Convertir 'class' vers 'class_data' si nécessaire
    const processedUpdateData = { ...updateData } as any
    if ((updateData as any).class && Array.isArray((updateData as any).class) && (updateData as any).class.length > 0) {
      processedUpdateData.class_data = (updateData as any).class[0] // Prendre le premier élément du tableau
      delete processedUpdateData.class // Supprimer l'ancien champ
    }
    
    // Préparer les données de mise à jour
    const updateFields: string[] = []
    const updateValues: any[] = []
    
    // Champs simples
    const simpleFields = ['title', 'start_date', 'end_date', 'description', 'type', 'status', 'state', 'room', 'teacher', 'class_data', 'notes', 'color', 'stateChangeReason', 'validationState']
    
    simpleFields.forEach(field => {
      if (processedUpdateData[field as keyof CalendarEventWithTimeSlots] !== undefined) {
        updateFields.push(`${field} = ?`)
        
        // Formater les dates pour MySQL
        if (field === 'start_date' || field === 'end_date') {
          const dateValue = processedUpdateData[field as keyof CalendarEventWithTimeSlots] as string
          updateValues.push(dateValue ? formatDateForMySQL(dateValue) : dateValue)
        } else if (field === 'room') {
          // Traiter les données de salle spécialement
          const roomValue = processedUpdateData[field as keyof CalendarEventWithTimeSlots] as string | RoomData
          updateValues.push(safeJsonStringify(normalizeRoomData(roomValue)))
        } else if (['class_data'].includes(field)) {
          // Traiter les champs JSON simples
          updateValues.push(safeJsonStringify(processedUpdateData[field]))
        } else {
          updateValues.push(processedUpdateData[field as keyof CalendarEventWithTimeSlots])
        }
      }
    })
    
    // Gérer updated_at séparément s'il est fourni
    if (processedUpdateData.updated_at !== undefined) {
      updateFields.push('updated_at = ?')
      updateValues.push(formatDateForMySQL(processedUpdateData.updated_at as string))
    }
    
    // Champs JSON
    const jsonFields = ['participants', 'equipment_used', 'consommables_used', 'timeSlots', 'actuelTimeSlots', 'lastStateChange']
    
    jsonFields.forEach(field => {
      if (processedUpdateData[field as keyof CalendarEventWithTimeSlots] !== undefined) {
        updateFields.push(`${field} = ?`)
        updateValues.push(JSON.stringify(processedUpdateData[field as keyof CalendarEventWithTimeSlots]))
      }
    })
    
    // Ajouter updated_at = NOW() seulement si pas déjà fourni
    if (processedUpdateData.updated_at === undefined) {
      updateFields.push('updated_at = NOW()')
    }
    
    if (updateFields.length === 0) {
      throw new Error('Aucune donnée à mettre à jour')
    }
    
    // Construire et exécuter la requête de mise à jour
    const query = `
      UPDATE calendar_physique 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `
    
    updateValues.push(id)
    
    await pool.execute(query, updateValues)
    
    // Récupérer et retourner l'événement mis à jour
    return await getPhysicsEventByIdWithTimeSlots(id)
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement de physique avec TimeSlots:', error)
    throw error
  }
}

// Fonction pour récupérer un événement de physique par ID avec le système TimeSlots
export async function getPhysicsEventByIdWithTimeSlots(id: string): Promise<CalendarEventWithTimeSlots> {
  try {
    const query = 'SELECT * FROM calendar_physique WHERE id = ?'
    const [rows] = await pool.execute(query, [id])
    
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Événement de physique non trouvé')
    }
    
    const row = (rows as any[])[0]
    
    return {
      id: row.id,
      title: row.title,
      start_date: row.start_date,
      end_date: row.end_date,
      description: row.description,
      type: row.type,
      status: row.status,
      state: row.state,
      room: row.room,
      teacher: row.teacher,
      class_data: parseJsonSafe(row.class_data, null), // Nouveau champ
      notes: row.notes,
      color: row.color,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      stateChangeReason: row.stateChangeReason,
      
      // Parser les champs JSON en toute sécurité
      timeSlots: parseJsonSafe(row.timeSlots, []),
      actuelTimeSlots: parseJsonSafe(row.actuelTimeSlots, []),
      lastStateChange: parseJsonSafe(row.lastStateChange, null),
      participants: parseJsonSafe(row.participants, []),
      equipment_used: transformMaterials(parseJsonSafe(row.equipment_used, [])),
      consommables_used: transformChemicals(parseJsonSafe(row.consommables_used, []), 'physique')
    }
    
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement de physique:', error)
    throw error
  }
}

// Fonction utilitaire pour comparer deux TimeSlots et déterminer s'ils ont été modifiés
export function hasTimeSlotChanged(originalSlot: any, newSlot: any): boolean {
  if (!originalSlot || !newSlot) return true
  
  // Comparer les propriétés importantes (exclure id et modifiedBy)
  const fieldsToCompare = ['startDate', 'endDate', 'status', 'room', 'notes']
  
  for (const field of fieldsToCompare) {
    if (originalSlot[field] !== newSlot[field]) {
      return true
    }
  }
  
  return false
}

// Fonction utilitaire pour traiter les TimeSlots en évitant les entrées modifiedBy inutiles
export function processTimeSlots(newTimeSlots: any[], originalTimeSlots: any[], userId: string): any[] {
  return newTimeSlots.map((slot: any) => {
    // Trouver le slot original correspondant (par ID)
    const originalSlot = originalTimeSlots.find((orig: any) => orig.id === slot.id)
    
    // Si c'est un nouveau slot (pas dans les originaux), ne pas ajouter d'entrée "modified"
    if (!originalSlot) {
      return {
        ...slot,
        id: slot.id || generateTimeSlotId()
        // Pas d'entrée modifiedBy pour les nouveaux slots - ils auront "created" par ailleurs
      }
    }
    
    // Vérifier si le slot a réellement changé
    const hasChanged = hasTimeSlotChanged(originalSlot, slot)
    
    if (hasChanged) {
      // Seulement si modifié, ajouter l'entrée modifiedBy
      return {
        ...slot,
        id: slot.id || generateTimeSlotId(),
        modifiedBy: [
          ...(slot.modifiedBy || []),
          {
            userId,
            date: new Date().toISOString(),
            action: 'modified' as const
          }
        ]
      }
    } else {
      // Si pas modifié, retourner le slot tel quel (sans ajouter d'entrée modifiedBy)
      return {
        ...slot,
        id: slot.id || generateTimeSlotId()
      }
    }
  })
}

// ================================
// FONCTIONS UTILITAIRES POUR LES SALLES
// ================================

interface Room {
  id: string
  name: string
  description?: string
  is_active: boolean
  capacity: number
  locations?: RoomLocation[]
}

interface RoomLocation {
  id: string
  room_id: string
  name: string
  description?: string
  is_active: boolean
}

// Fonction pour obtenir toutes les salles
export async function getAllRooms(): Promise<Room[]> {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_active,
        r.capacity
      FROM rooms r
      WHERE r.is_active = TRUE
      ORDER BY r.name ASC
    `)
    
    const rooms = rows as any[]
    
    // Pour chaque salle, récupérer ses localisations
    const roomsWithLocations = await Promise.all(
      rooms.map(async (room) => {
        const [locationRows] = await pool.execute(`
          SELECT 
            id,
            room_id,
            name,
            description,
            is_active
          FROM room_locations
          WHERE room_id = ? AND is_active = TRUE
        `, [room.id])
        
        return {
          id: String(room.id),
          name: room.name,
          description: room.description,
          is_active: room.is_active,
          capacity: room.capacity,
          locations: (locationRows as any[]).map(loc => ({
            id: String(loc.id),
            room_id: String(loc.room_id),
            name: loc.name,
            description: loc.description,
            is_active: loc.is_active
          }))
        }
      })
    )
    
    return roomsWithLocations
  } catch (error) {
    console.error('Erreur lors de la récupération des salles:', error)
    throw error
  }
}

// Fonction pour obtenir les salles par localisation
export async function getRoomsByLocation(locationId: number): Promise<Room[]> {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        r.*,
        l.name as location_name,
        l.description as location_description
      FROM rooms r
      INNER JOIN room_locations l ON r.id = l.room_id
      WHERE l.id = ? AND r.is_active = TRUE AND l.is_active = TRUE
      ORDER BY r.name ASC
    `, [locationId])
    
    return (rows as any[]).map(row => ({
      id: String(row.id),
      name: row.name,
      description: row.description,
      is_active: row.is_active,
      capacity: row.capacity,
      locations: [{
        id: String(locationId),
        room_id: String(row.id),
        name: row.location_name,
        description: row.location_description,
        is_active: true
      }]
    }))
  } catch (error) {
    console.error('Erreur lors de la récupération des salles par localisation:', error)
    throw error
  }
}

// Fonction pour obtenir les événements associés à une salle
export async function getEventsForRoom(roomName: string, startDate?: string, endDate?: string): Promise<CalendarEventWithTimeSlots[]> {
  try {
    // Récupérer les événements de chimie et physique pour cette salle
    const [chemistryEvents, physicsEvents] = await Promise.all([
      getChemistryEventsWithTimeSlots(startDate, endDate),
      getPhysicsEventsWithTimeSlots(startDate, endDate)
    ])
    
    // Filtrer par salle et fusionner les résultats
    const filteredChemistry = chemistryEvents.filter(event => {
      const roomData = normalizeRoomData(event.room)
      return roomData && (roomData.name === roomName || roomData.id === roomName)
    })
    
    const filteredPhysics = physicsEvents.filter(event => {
      const roomData = normalizeRoomData(event.room)
      return roomData && (roomData.name === roomName || roomData.id === roomName)
    })
    
    return [...filteredChemistry, ...filteredPhysics].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )
  } catch (error) {
    console.error('Erreur lors de la récupération des événements pour la salle:', error)
    throw error
  }
}

export type { Room, RoomLocation };
