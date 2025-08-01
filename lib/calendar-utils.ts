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
  class_name?: string
  participants?: string[] // Will be stored as JSON
  equipment_used?: string[] // Will be stored as JSON
  chemicals_used?: string[] // Will be stored as JSON
  notes?: string
  color?: string
  created_by?: string
  created_at?: string
  updated_at?: string
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
    
    return (rows as any[]).map(row => ({
      ...row,
      participants: row.participants ? JSON.parse(row.participants) : [],
      equipment_used: row.equipment_used ? JSON.parse(row.equipment_used) : [],
      chemicals_used: row.chemicals_used ? JSON.parse(row.chemicals_used) : []
    }))
  } catch (error) {
    console.error('Error fetching chemistry events:', error)
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
    
    return (rows as any[]).map(row => ({
      ...row,
      participants: row.participants ? JSON.parse(row.participants) : [],
      equipment_used: row.equipment_used ? JSON.parse(row.equipment_used) : [],
      chemicals_used: row.chemicals_used ? JSON.parse(row.chemicals_used) : []
    }))
  } catch (error) {
    console.error('Error fetching physics events:', error)
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
      participants: JSON.stringify(event.participants || []),
      equipment_used: JSON.stringify(event.equipment_used || []),
      chemicals_used: JSON.stringify(event.chemicals_used || [])
    }
    
    const query = `
      INSERT INTO calendar_chimie 
      (id, title, start_date, end_date, description, type, status, room, teacher, class_name, 
       participants, equipment_used, chemicals_used, notes, color, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    await pool.execute(query, [
      eventData.id, eventData.title, eventData.start_date, eventData.end_date,
      eventData.description, eventData.type, eventData.status, eventData.room,
      eventData.teacher, eventData.class_name, eventData.participants,
      eventData.equipment_used, eventData.chemicals_used, eventData.notes,
      eventData.color, eventData.created_by
    ])
    
    // Récupérer l'événement créé
    const [rows] = await pool.execute('SELECT * FROM calendar_chimie WHERE id = ?', [id])
    const createdEvent = (rows as any[])[0]
    
    return {
      ...createdEvent,
      participants: createdEvent.participants ? JSON.parse(createdEvent.participants) : [],
      equipment_used: createdEvent.equipment_used ? JSON.parse(createdEvent.equipment_used) : [],
      chemicals_used: createdEvent.chemicals_used ? JSON.parse(createdEvent.chemicals_used) : []
    }
  } catch (error) {
    console.error('Error creating chemistry event:', error)
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
      participants: JSON.stringify(event.participants || []),
      equipment_used: JSON.stringify(event.equipment_used || []),
      chemicals_used: JSON.stringify(event.chemicals_used || [])
    }
    
    const query = `
      INSERT INTO calendar_physique 
      (id, title, start_date, end_date, description, type, status, room, teacher, class_name, 
       participants, equipment_used, chemicals_used, notes, color, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    await pool.execute(query, [
      eventData.id, eventData.title, eventData.start_date, eventData.end_date,
      eventData.description, eventData.type, eventData.status, eventData.room,
      eventData.teacher, eventData.class_name, eventData.participants,
      eventData.equipment_used, eventData.chemicals_used, eventData.notes,
      eventData.color, eventData.created_by
    ])
    
    // Récupérer l'événement créé
    const [rows] = await pool.execute('SELECT * FROM calendar_physique WHERE id = ?', [id])
    const createdEvent = (rows as any[])[0]
    
    return {
      ...createdEvent,
      participants: createdEvent.participants ? JSON.parse(createdEvent.participants) : [],
      equipment_used: createdEvent.equipment_used ? JSON.parse(createdEvent.equipment_used) : [],
      chemicals_used: createdEvent.chemicals_used ? JSON.parse(createdEvent.chemicals_used) : []
    }
  } catch (error) {
    console.error('Error creating physics event:', error)
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
    
    // Construire la requête de mise à jour dynamiquement
    const fields = Object.keys(updateData).filter(key => updateData[key as keyof typeof updateData] !== undefined)
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
    console.error('Error updating chemistry event:', error)
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
    
    // Construire la requête de mise à jour dynamiquement
    const fields = Object.keys(updateData).filter(key => updateData[key as keyof typeof updateData] !== undefined)
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
    console.error('Error updating physics event:', error)
    throw error
  }
}

// Fonction pour supprimer un événement de chimie
export async function deleteChemistryEvent(id: string): Promise<boolean> {
  try {
    const [result] = await pool.execute('DELETE FROM calendar_chimie WHERE id = ?', [id])
    return (result as any).affectedRows > 0
  } catch (error) {
    console.error('Error deleting chemistry event:', error)
    throw error
  }
}

// Fonction pour supprimer un événement de physique
export async function deletePhysicsEvent(id: string): Promise<boolean> {
  try {
    const [result] = await pool.execute('DELETE FROM calendar_physique WHERE id = ?', [id])
    return (result as any).affectedRows > 0
  } catch (error) {
    console.error('Error deleting physics event:', error)
    throw error
  }
}

// Fonction legacy pour maintenir la compatibilité avec l'ancien système de fichiers
export async function migrateEventToNewFormat(event: any): Promise<any> {
  // Si l'événement a déjà des timeSlots, vérifier les nouveaux champs
  if (event.timeSlots && Array.isArray(event.timeSlots)) {
    // S'assurer que actuelTimeSlots est présent
    const migratedEvent = {
      ...event,
      actuelTimeSlots: event.actuelTimeSlots || event.timeSlots.filter((slot: any) => slot.status === 'active')
    };
    // Supprimer eventModifying s'il existe (n'est plus utilisé)
    delete migratedEvent.eventModifying;
    return migratedEvent;
  }

  // Créer un timeSlot à partir des anciennes données startDate/endDate
  const timeSlot: TimeSlot = {
    id: generateTimeSlotId(),
    startDate: event.startDate,
    endDate: event.endDate,
    status: 'active'
  };

  // Retourner l'événement avec le nouveau format complet
  const { startDate, endDate, parentEventId, eventModifying, ...restEvent } = event;
  return {
    ...restEvent,
    timeSlots: [timeSlot],
    actuelTimeSlots: [timeSlot] // NOUVEAU: créneaux actuellement retenus
  };
}

// Fonctions legacy pour maintenir la compatibilité avec l'ancien système de fichiers
import { promises as fs } from 'fs'
import path from 'path'

const CALENDAR_FILE = path.join(process.cwd(), 'data', 'calendar.json')

// Fonction pour écrire dans le fichier calendrier (legacy)
export async function writeCalendarFile(data: any) {
  try {
    await fs.writeFile(CALENDAR_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Erreur écriture fichier calendar:', error)
    throw error
  }
}

// Fonction pour lire le fichier calendrier (legacy)
export async function readCalendarFile() {
  try {
    const data = await fs.readFile(CALENDAR_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Erreur lecture fichier calendar:', error)
    return { events: [] }
  }
}

export async function migrateCalendarData() {
  try {
    const calendarData = await readCalendarFile();
    let needsMigration = false;

    // Migrer tous les événements vers le nouveau format
    const migratedEvents = await Promise.all(calendarData.events.map(async (event: any) => {
      // Si l'événement a déjà des timeSlots, pas besoin de migration
      if (event.timeSlots && Array.isArray(event.timeSlots)) {
        return event;
      }

      needsMigration = true;

      // Créer un timeSlot à partir des anciennes données startDate/endDate
      const timeSlot: TimeSlot = {
        id: generateTimeSlotId(),
        startDate: event.startDate,
        endDate: event.endDate,
        status: 'active'
      };

      // Retourner l'événement avec le nouveau format
      const { startDate, endDate, parentEventId, ...restEvent } = event;
      return {
        ...restEvent,
        timeSlots: [timeSlot]
      };
    }));

    if (needsMigration) {
      
      calendarData.events = migratedEvents;
      await writeCalendarFile(calendarData);
      
    }

    return calendarData;
  } catch (error) {
    console.error('Erreur lors de la migration des données:', error);
    throw error;
  }
}