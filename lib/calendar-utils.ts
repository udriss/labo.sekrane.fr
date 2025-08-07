// lib/calendar-utils.ts

import pool from '@/lib/db'
import { TimeSlot } from '@/types/calendar'
import { generateTimeSlotId } from '@/lib/calendar-utils-client'
import { v4 as uuidv4 } from 'uuid'

// Types pour les événements de calendrier
export interface CalendarEvent {
  id: string
  title: string
  start_date: string
  end_date: string
  description?: string
  type: 'tp' | 'cours' | 'exam' | 'maintenance' | 'reservation' | 'other'
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  room?: string
  teacher?: string
  class_data?: {
    id: string
    name: string
    type: 'predefined' | 'custom' | 'auto'
  } | null
  participants?: string[] // Will be stored as JSON
  equipment_used?: string[] // Will be stored as JSON
  chemicals_used?: string[] // Will be stored as JSON
  notes?: string
  color?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  timeSlots?: TimeSlot[] // Array des TimeSlots proposés/modifiés
  actuelTimeSlots?: TimeSlot[] // Array des TimeSlots actuels acceptés par l'owner
}

// Fonction pour obtenir tous les événements de chimie
export async function getChemistryEvents(startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
  try {
    let query = 'SELECT * FROM calendar_chimie'
    const params: any[] = []
    
    if (startDate && endDate) {
      query += ' WHERE start_date >= ? AND end_date <= ?'
      params.push(startDate, endDate)
    } else if (startDate) {
      query += ' WHERE start_date >= ?'
      params.push(startDate)
    } else if (endDate) {
      query += ' WHERE end_date <= ?'
      params.push(endDate)
    }
    
    query += ' ORDER BY start_date ASC'
    
    const [rows] = await pool.execute(query, params)
    
    return (rows as any[]).map(row => {
      // Parser les TimeSlots depuis les notes JSON
      let timeSlots: TimeSlot[] = []
      let actuelTimeSlots: TimeSlot[] = []
      
      try {
        const parsedNotes = row.notes ? JSON.parse(row.notes) : {}
        timeSlots = parsedNotes.timeSlots || []
        actuelTimeSlots = parsedNotes.actuelTimeSlots || []
      } catch {
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
        ...row,
        state: row.state || 'PENDING', // Mappage explicite avec fallback
        participants: row.participants ? JSON.parse(row.participants) : [],
        equipment_used: row.equipment_used ? JSON.parse(row.equipment_used) : [],
        chemicals_used: row.chemicals_used ? JSON.parse(row.chemicals_used) : [],
        timeSlots,
        actuelTimeSlots
      }
    })
  } catch (error) {
    console.error('Error fetching chimie events:', error)
    throw error
  }
}

// Fonction pour obtenir tous les événements de physique
export async function getPhysicsEvents(startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
  try {
    let query = 'SELECT * FROM calendar_physique'
    const params: any[] = []
    
    if (startDate && endDate) {
      query += ' WHERE start_date >= ? AND end_date <= ?'
      params.push(startDate, endDate)
    } else if (startDate) {
      query += ' WHERE start_date >= ?'
      params.push(startDate)
    } else if (endDate) {
      query += ' WHERE end_date <= ?'
      params.push(endDate)
    }
    
    query += ' ORDER BY start_date ASC'
    
    const [rows] = await pool.execute(query, params)
    
    return (rows as any[]).map(row => {
      // Parser les TimeSlots depuis les notes JSON
      let timeSlots: TimeSlot[] = []
      let actuelTimeSlots: TimeSlot[] = []
      
      try {
        const parsedNotes = row.notes ? JSON.parse(row.notes) : {}
        timeSlots = parsedNotes.timeSlots || []
        actuelTimeSlots = parsedNotes.actuelTimeSlots || []
      } catch {
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
        ...row,
        state: row.state || 'PENDING', // Mappage explicite avec fallback
        participants: row.participants ? JSON.parse(row.participants) : [],
        equipment_used: row.equipment_used ? JSON.parse(row.equipment_used) : [],
        chemicals_used: row.chemicals_used ? JSON.parse(row.chemicals_used) : [],
        timeSlots,
        actuelTimeSlots
      }
    })
  } catch (error) {
    console.error('Error fetching physique events:', error)
    throw error
  }
}

// Fonction pour créer un événement de chimie
export async function createChemistryEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> {
  try {
    const id = uuidv4()
    const eventData = {
      id,
      ...event,
      state: 'PENDING', // État initial pour tous les nouveaux événements
      participants: JSON.stringify(event.participants || []),
      equipment_used: JSON.stringify(event.equipment_used || []),
      chemicals_used: JSON.stringify(event.chemicals_used || [])
    }
    
    const query = `
      INSERT INTO calendar_chimie 
      (id, title, start_date, end_date, description, type, status, state, room, teacher, class_data, 
       participants, equipment_used, chemicals_used, notes, color, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    await pool.execute(query, [
      eventData.id, eventData.title, eventData.start_date, eventData.end_date,
      eventData.description, eventData.type, eventData.status, eventData.state, eventData.room,
      eventData.teacher, eventData.class_data, eventData.participants,
      eventData.equipment_used, eventData.chemicals_used, eventData.notes,
      eventData.color, eventData.created_by
    ])
    
    // Récupérer l'événement créé
    const [rows] = await pool.execute('SELECT * FROM calendar_chimie WHERE id = ?', [id])
    const createdEvent = (rows as any[])[0]
    
    return {
      ...createdEvent,
      state: createdEvent.state || 'PENDING', // Mappage explicite du state
      participants: createdEvent.participants ? JSON.parse(createdEvent.participants) : [],
      equipment_used: createdEvent.equipment_used ? JSON.parse(createdEvent.equipment_used) : [],
      chemicals_used: createdEvent.chemicals_used ? JSON.parse(createdEvent.chemicals_used) : []
    }
  } catch (error) {
    console.error('Error creating chimie event:', error)
    throw error
  }
}

// Fonction pour créer un événement de physique
export async function createPhysicsEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> {
  try {
    const id = uuidv4()
    const eventData = {
      id,
      ...event,
      state: 'PENDING', // État initial pour tous les nouveaux événements
      participants: JSON.stringify(event.participants || []),
      equipment_used: JSON.stringify(event.equipment_used || []),
      chemicals_used: JSON.stringify(event.chemicals_used || [])
    }
    
    const query = `
      INSERT INTO calendar_physique 
      (id, title, start_date, end_date, description, type, status, state, room, teacher, class_data, 
       participants, equipment_used, chemicals_used, notes, color, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    await pool.execute(query, [
      eventData.id, eventData.title, eventData.start_date, eventData.end_date,
      eventData.description, eventData.type, eventData.status, eventData.state, eventData.room,
      eventData.teacher, eventData.class_data, eventData.participants,
      eventData.equipment_used, eventData.chemicals_used, eventData.notes,
      eventData.color, eventData.created_by
    ])
    
    // Récupérer l'événement créé
    const [rows] = await pool.execute('SELECT * FROM calendar_physique WHERE id = ?', [id])
    const createdEvent = (rows as any[])[0]
    
    return {
      ...createdEvent,
      state: createdEvent.state || 'PENDING', // Mappage explicite du state
      participants: createdEvent.participants ? JSON.parse(createdEvent.participants) : [],
      equipment_used: createdEvent.equipment_used ? JSON.parse(createdEvent.equipment_used) : [],
      chemicals_used: createdEvent.chemicals_used ? JSON.parse(createdEvent.chemicals_used) : []
    }
  } catch (error) {
    console.error('Error creating physique event:', error)
    throw error
  }
}

// Fonction pour mettre à jour un événement de chimie
export async function updateChemistryEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
  try {
    const updateData = {
      ...updates,
      participants: updates.participants ? JSON.stringify(updates.participants) : undefined,
      equipment_used: updates.equipment_used ? JSON.stringify(updates.equipment_used) : undefined,
      chemicals_used: updates.chemicals_used ? JSON.stringify(updates.chemicals_used) : undefined
    }
    
    // Convertir les dates ISO en format MySQL
    if (updateData.updated_at && typeof updateData.updated_at === 'string') {
      updateData.updated_at = new Date(updateData.updated_at).toISOString().slice(0, 19).replace('T', ' ')
    }
    if (updateData.created_at && typeof updateData.created_at === 'string') {
      updateData.created_at = new Date(updateData.created_at).toISOString().slice(0, 19).replace('T', ' ')
    }
    if (updateData.start_date && typeof updateData.start_date === 'string') {
      updateData.start_date = new Date(updateData.start_date).toISOString().slice(0, 19).replace('T', ' ')
    }
    if (updateData.end_date && typeof updateData.end_date === 'string') {
      updateData.end_date = new Date(updateData.end_date).toISOString().slice(0, 19).replace('T', ' ')
    }
    
    // Construire la requête de mise à jour dynamiquement
    // Exclure les champs qui ne sont pas des colonnes de base de données
    const excludedFields = ['timeSlots', 'actuelTimeSlots'];
    const fields = Object.keys(updateData).filter(key => 
      updateData[key as keyof typeof updateData] !== undefined && 
      !excludedFields.includes(key)
    )
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updateData[field as keyof typeof updateData])
    
    const query = `UPDATE calendar_chimie SET ${setClause} WHERE id = ?`
    await pool.execute(query, [...values, id])
    
    // Récupérer l'événement mis à jour
    const [rows] = await pool.execute('SELECT * FROM calendar_chimie WHERE id = ?', [id])
    const updatedEvent = (rows as any[])[0]
    
    return {
      ...updatedEvent,
      participants: updatedEvent.participants ? JSON.parse(updatedEvent.participants) : [],
      equipment_used: updatedEvent.equipment_used ? JSON.parse(updatedEvent.equipment_used) : [],
      chemicals_used: updatedEvent.chemicals_used ? JSON.parse(updatedEvent.chemicals_used) : []
    }
  } catch (error) {
    console.error('Error updating chimie event:', error)
    throw error
  }
}

// Fonction pour mettre à jour un événement de physique
export async function updatePhysicsEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
  try {
    const updateData = {
      ...updates,
      participants: updates.participants ? JSON.stringify(updates.participants) : undefined,
      equipment_used: updates.equipment_used ? JSON.stringify(updates.equipment_used) : undefined,
      chemicals_used: updates.chemicals_used ? JSON.stringify(updates.chemicals_used) : undefined
    }
    
    // Convertir les dates ISO en format MySQL
    if (updateData.updated_at && typeof updateData.updated_at === 'string') {
      updateData.updated_at = new Date(updateData.updated_at).toISOString().slice(0, 19).replace('T', ' ')
    }
    if (updateData.created_at && typeof updateData.created_at === 'string') {
      updateData.created_at = new Date(updateData.created_at).toISOString().slice(0, 19).replace('T', ' ')
    }
    if (updateData.start_date && typeof updateData.start_date === 'string') {
      updateData.start_date = new Date(updateData.start_date).toISOString().slice(0, 19).replace('T', ' ')
    }
    if (updateData.end_date && typeof updateData.end_date === 'string') {
      updateData.end_date = new Date(updateData.end_date).toISOString().slice(0, 19).replace('T', ' ')
    }
    
    // Construire la requête de mise à jour dynamiquement
    // Exclure les champs qui ne sont pas des colonnes de base de données
    const excludedFields = ['timeSlots', 'actuelTimeSlots'];
    const fields = Object.keys(updateData).filter(key => 
      updateData[key as keyof typeof updateData] !== undefined && 
      !excludedFields.includes(key)
    )
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updateData[field as keyof typeof updateData])
    
    const query = `UPDATE calendar_physique SET ${setClause} WHERE id = ?`
    await pool.execute(query, [...values, id])
    
    // Récupérer l'événement mis à jour
    const [rows] = await pool.execute('SELECT * FROM calendar_physique WHERE id = ?', [id])
    const updatedEvent = (rows as any[])[0]
    
    return {
      ...updatedEvent,
      participants: updatedEvent.participants ? JSON.parse(updatedEvent.participants) : [],
      equipment_used: updatedEvent.equipment_used ? JSON.parse(updatedEvent.equipment_used) : [],
      chemicals_used: updatedEvent.chemicals_used ? JSON.parse(updatedEvent.chemicals_used) : []
    }
  } catch (error) {
    console.error('Error updating physique event:', error)
    throw error
  }
}

// Fonction pour supprimer un événement de chimie
export async function deleteChemistryEvent(id: string): Promise<boolean> {
  try {
    const [result] = await pool.execute('DELETE FROM calendar_chimie WHERE id = ?', [id])
    return (result as any).affectedRows > 0
  } catch (error) {
    console.error('Error deleting chimie event:', error)
    throw error
  }
}

// Fonction pour supprimer un événement de physique
export async function deletePhysicsEvent(id: string): Promise<boolean> {
  try {
    const [result] = await pool.execute('DELETE FROM calendar_physique WHERE id = ?', [id])
    return (result as any).affectedRows > 0
  } catch (error) {
    console.error('Error deleting physique event:', error)
    throw error
  }
}

// Fonction pour obtenir un événement de chimie par ID
export async function getChemistryEventById(id: string): Promise<CalendarEvent | null> {
  try {
    const [rows] = await pool.execute('SELECT * FROM calendar_chimie WHERE id = ?', [id])
    const events = rows as any[]
    
    if (events.length === 0) {
      return null
    }
    
    const event = events[0]
    return {
      ...event,
      participants: event.participants ? JSON.parse(event.participants) : [],
      equipment_used: event.equipment_used ? JSON.parse(event.equipment_used) : [],
      chemicals_used: event.chemicals_used ? JSON.parse(event.chemicals_used) : []
    }
  } catch (error) {
    console.error('Error fetching chimie event by ID:', error)
    throw error
  }
}

// Fonction pour obtenir un événement de physique par ID
export async function getPhysicsEventById(id: string): Promise<CalendarEvent | null> {
  try {
    const [rows] = await pool.execute('SELECT * FROM calendar_physique WHERE id = ?', [id])
    const events = rows as any[]
    
    if (events.length === 0) {
      return null
    }
    
    const event = events[0]
    return {
      ...event,
      participants: event.participants ? JSON.parse(event.participants) : [],
      equipment_used: event.equipment_used ? JSON.parse(event.equipment_used) : [],
      chemicals_used: event.chemicals_used ? JSON.parse(event.chemicals_used) : []
    }
  } catch (error) {
    console.error('Error fetching physique event by ID:', error)
    throw error
  }
}

// Fonctions pour gérer les créneaux horaires (timeSlots) dans les notes JSON
export async function addTimeSlotToEvent(eventId: string, timeSlot: TimeSlot, discipline: 'chimie' | 'physique'): Promise<void> {
  try {
    const getEventById = discipline === 'chimie' ? getChemistryEventById : getPhysicsEventById
    const updateEvent = discipline === 'chimie' ? updateChemistryEvent : updatePhysicsEvent

    const event = await getEventById(eventId)
    if (!event) {
      throw new Error('Événement non trouvé')
    }

    // Récupérer les timeSlots existants depuis les notes
    let eventData: { timeSlots: TimeSlot[], actuelTimeSlots: TimeSlot[] } = { timeSlots: [], actuelTimeSlots: [] }
    if (event.notes) {
      try {
        eventData = JSON.parse(event.notes)
        // S'assurer que les propriétés existent
        eventData.timeSlots = eventData.timeSlots || []
        eventData.actuelTimeSlots = eventData.actuelTimeSlots || []
      } catch {
        eventData = { timeSlots: [], actuelTimeSlots: [] }
      }
    }

    // Ajouter le nouveau timeSlot
    eventData.timeSlots.push(timeSlot)

    // Mettre à jour l'événement
    await updateEvent(eventId, {
      notes: JSON.stringify(eventData),
      updated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error adding timeSlot to event:', error)
    throw error
  }
}

export async function updateTimeSlotInEvent(eventId: string, timeSlotId: string, updates: Partial<TimeSlot>, discipline: 'chimie' | 'physique'): Promise<void> {
  try {
    const getEventById = discipline === 'chimie' ? getChemistryEventById : getPhysicsEventById
    const updateEvent = discipline === 'chimie' ? updateChemistryEvent : updatePhysicsEvent
    
    const event = await getEventById(eventId)
    if (!event) {
      throw new Error('Événement non trouvé')
    }

    // Récupérer les timeSlots existants depuis les notes
    let eventData: { timeSlots: TimeSlot[], actuelTimeSlots: TimeSlot[] } = { timeSlots: [], actuelTimeSlots: [] }
    if (event.notes) {
      try {
        eventData = JSON.parse(event.notes)
        // S'assurer que les propriétés existent
        eventData.timeSlots = eventData.timeSlots || []
        eventData.actuelTimeSlots = eventData.actuelTimeSlots || []
      } catch {
        eventData = { timeSlots: [], actuelTimeSlots: [] }
      }
    }

    // Mettre à jour le timeSlot
    const timeSlotIndex = eventData.timeSlots.findIndex((slot: TimeSlot) => slot.id === timeSlotId)
    if (timeSlotIndex !== -1) {
      eventData.timeSlots[timeSlotIndex] = { ...eventData.timeSlots[timeSlotIndex], ...updates }
    }

    // Mettre à jour aussi dans actuelTimeSlots si présent
    const actuelIndex = eventData.actuelTimeSlots.findIndex((slot: TimeSlot) => slot.id === timeSlotId)
    if (actuelIndex !== -1) {
      eventData.actuelTimeSlots[actuelIndex] = { ...eventData.actuelTimeSlots[actuelIndex], ...updates }
    }

    // Mettre à jour l'événement
    await updateEvent(eventId, {
      notes: JSON.stringify(eventData),
      updated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating timeSlot in event:', error)
    throw error
  }
}

export async function updateEventTimeSlots(eventId: string, timeSlots: TimeSlot[], actuelTimeSlots: TimeSlot[], discipline: 'chimie' | 'physique'): Promise<void> {
  try {
    const getEventById = discipline === 'chimie' ? getChemistryEventById : getPhysicsEventById
    const updateEvent = discipline === 'chimie' ? updateChemistryEvent : updatePhysicsEvent
    
    const event = await getEventById(eventId)
    if (!event) {
      throw new Error('Événement non trouvé')
    }

    // Mettre à jour les notes avec les nouveaux timeSlots
    const eventData = { timeSlots, actuelTimeSlots }
    
    await updateEvent(eventId, {
      notes: JSON.stringify(eventData),
      updated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating event timeSlots:', error)
    throw error
  }
}

export async function getEventTimeSlots(eventId: string, discipline: 'chimie' | 'physique'): Promise<{ timeSlots: TimeSlot[], actuelTimeSlots: TimeSlot[] }> {
  try {
    const getEventById = discipline === 'chimie' ? getChemistryEventById : getPhysicsEventById
    
    const event = await getEventById(eventId)
    if (!event) {
      throw new Error('Événement non trouvé')
    }

    // Récupérer les timeSlots depuis les notes
    if (event.notes) {
      try {
        const eventData = JSON.parse(event.notes)
        return {
          timeSlots: eventData.timeSlots || [],
          actuelTimeSlots: eventData.actuelTimeSlots || []
        }
      } catch {
        return { timeSlots: [], actuelTimeSlots: [] }
      }
    }

    return { timeSlots: [], actuelTimeSlots: [] }
  } catch (error) {
    console.error('Error getting timeSlots from event:', error)
    throw error
  }
}