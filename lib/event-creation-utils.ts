// Utilitaires pour la création d'événements avec créneaux centralisés
// Fichier : lib/event-creation-utils.ts

import { CalendarEvent } from '@/types/calendar'
import { TimeslotData, TimeslotProposal, Discipline } from '@/types/timeslots'

export interface TimeSlotInput {
  date: string
  startTime: string
  endTime: string
}

export interface EventCreationResult {
  event: CalendarEvent
  timeslots: TimeslotData[]
  success: boolean
  message?: string
}

/**
 * Créer un événement simple sans créneaux multiples (pour événements laborantin, maintenance, etc.)
 */
export async function createSimpleEvent(
  eventData: Partial<CalendarEvent>,
  discipline: Discipline,
  options?: { allowPastDates?: boolean }
): Promise<CalendarEvent> {
  try {
    // Utiliser la nouvelle API centralisée /api/events
    const eventResponse = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discipline,
        ...eventData
      })
    })

    if (!eventResponse.ok) {
      const errorData = await eventResponse.json()
      throw new Error(errorData.error || 'Erreur lors de la création de l\'événement')
    }

    return await eventResponse.json()
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement simple:', error)
    throw error
  }
}

/**
 * Créer un événement complet avec ses créneaux via l'API centralisée
 */
export async function createEventWithTimeslots(
  eventData: Partial<CalendarEvent>,
  timeSlots: TimeSlotInput[],
  discipline: Discipline
): Promise<EventCreationResult> {
  try {
    // Utiliser la nouvelle API centralisée /api/events avec les timeSlots inclus
    const eventResponse = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discipline,
        ...eventData,
        timeSlots // Inclure les créneaux dans les données
      })
    })

    if (!eventResponse.ok) {
      const errorData = await eventResponse.json()
      throw new Error(errorData.error || 'Erreur lors de la création de l\'événement')
    }

    const createdEvent = await eventResponse.json()
    
    return {
      event: createdEvent,
      timeslots: createdEvent.timeSlots || [],
      success: true,
      message: 'Événement et créneaux créés avec succès via l\'API centralisée'
    }

  } catch (error) {
    console.error('Erreur lors de la création de l\'événement avec créneaux:', error)
    
    return {
      event: {} as CalendarEvent,
      timeslots: [],
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Mettre à jour un événement existant avec nouveaux créneaux via l'API centralisée
 */
export async function updateEventWithTimeslots(
  eventId: string,
  eventData: Partial<CalendarEvent>,
  timeSlots: TimeSlotInput[],
  discipline: Discipline
): Promise<EventCreationResult> {
  try {
    // Utiliser la nouvelle API centralisée /api/events
    const response = await fetch('/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: eventId,
        discipline,
        ...eventData,
        timeSlots // Inclure les créneaux dans les données
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Erreur lors de la mise à jour via l\'API centralisée')
    }

    const updatedEvent = await response.json()
    
    return {
      event: updatedEvent,
      timeslots: updatedEvent.timeSlots || [],
      success: true,
      message: 'Événement mis à jour avec succès via l\'API centralisée'
    }

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement avec créneaux:', error)
    
    return {
      event: {} as CalendarEvent,
      timeslots: [],
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}
