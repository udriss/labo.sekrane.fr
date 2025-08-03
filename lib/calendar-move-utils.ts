// lib/calendar-move-utils.ts
// Utilitaires pour gérer les propositions de déplacement d'événements

import { CalendarEvent, TimeSlot } from '@/types/calendar'

/**
 * Propose de nouveaux créneaux pour un événement
 */
export async function proposeEventMove(
  eventId: string,
  discipline: 'chimie' | 'physique',
  newTimeSlots: Array<{
    date: string
    startTime: string
    endTime: string
  }>,
  reason?: string
): Promise<{
  success: boolean
  event?: CalendarEvent
  isOwner?: boolean
  message?: string
  error?: string
}> {
  try {
    const response = await fetch('/api/calendrier/move-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventId,
        discipline,
        newTimeSlots,
        reason
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erreur lors de la proposition de déplacement'
      }
    }

    return {
      success: true,
      event: data.event,
      isOwner: data.isOwner,
      message: data.message
    }
  } catch (error) {
    console.error('Erreur lors de la proposition de déplacement:', error)
    return {
      success: false,
      error: 'Erreur réseau lors de la proposition de déplacement'
    }
  }
}

/**
 * Approuver ou rejeter des créneaux proposés (réservé au propriétaire)
 */
export async function handleTimeSlotProposal(
  eventId: string,
  discipline: 'chimie' | 'physique',
  action: 'approve' | 'reject',
  reason?: string
): Promise<{
  success: boolean
  event?: CalendarEvent
  message?: string
  error?: string
}> {
  try {
    const response = await fetch('/api/calendrier/move-event', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventId,
        discipline,
        action,
        reason
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erreur lors du traitement de la proposition'
      }
    }

    return {
      success: true,
      event: data.event,
      message: data.message
    }
  } catch (error) {
    console.error('Erreur lors du traitement de la proposition:', error)
    return {
      success: false,
      error: 'Erreur réseau lors du traitement de la proposition'
    }
  }
}

/**
 * Vérifier si un utilisateur est le propriétaire d'un événement
 */
export function isEventOwner(event: CalendarEvent, userId?: string, userEmail?: string): boolean {
  if (!userId && !userEmail) return false
  return event.createdBy === userId || event.createdBy === userEmail
}

/**
 * Vérifier si un événement a des propositions de créneaux en attente
 */
export function hasPendingTimeSlotProposals(event: CalendarEvent): boolean {
  if (!event.timeSlots || !event.actuelTimeSlots) return false

  // Comparer les créneaux actifs avec les créneaux actuels
  const activeTimeSlots = event.timeSlots.filter(slot => slot.status === 'active')
  const actualTimeSlots = event.actuelTimeSlots

  // S'il n'y a pas de créneaux actuels, pas de proposition en attente
  if (actualTimeSlots.length === 0) return false

  // S'il y a des différences, il y a des propositions en attente
  if (activeTimeSlots.length !== actualTimeSlots.length) return true

  // Vérifier les dates/heures
  for (let i = 0; i < activeTimeSlots.length; i++) {
    const activeSlot = activeTimeSlots[i]
    const actualSlot = actualTimeSlots[i]
    
    if (activeSlot.startDate !== actualSlot.startDate || 
        activeSlot.endDate !== actualSlot.endDate) {
      return true
    }
  }

  return false
}

/**
 * Obtenir la liste des créneaux proposés qui diffèrent des créneaux actuels
 */
export function getPendingTimeSlotProposals(event: CalendarEvent): TimeSlot[] {
  if (!event.timeSlots || !event.actuelTimeSlots) return []

  const activeTimeSlots = event.timeSlots.filter(slot => slot.status === 'active')
  const actualTimeSlots = event.actuelTimeSlots

  // Filtrer les créneaux actifs qui ne correspondent pas aux créneaux actuels
  return activeTimeSlots.filter(activeSlot => {
    return !actualTimeSlots.some(actualSlot => 
      activeSlot.startDate === actualSlot.startDate && 
      activeSlot.endDate === actualSlot.endDate
    )
  })
}

/**
 * Obtenir un résumé des différences entre créneaux proposés et actuels
 */
export function getTimeSlotProposalSummary(event: CalendarEvent): {
  hasPending: boolean
  pendingCount: number
  currentCount: number
  proposedSlots: TimeSlot[]
  currentSlots: TimeSlot[]
} {
  const currentSlots = event.actuelTimeSlots || []
  const proposedSlots = getPendingTimeSlotProposals(event)
  
  return {
    hasPending: proposedSlots.length > 0,
    pendingCount: proposedSlots.length,
    currentCount: currentSlots.length,
    proposedSlots,
    currentSlots
  }
}

/**
 * Formater les créneaux pour l'affichage
 */
export function formatTimeSlotForDisplay(slot: TimeSlot): {
  date: string
  startTime: string
  endTime: string
  dateFormatted: string
  timeRange: string
} {
  const startDate = new Date(slot.startDate)
  const endDate = new Date(slot.endDate)
  
  const date = startDate.toISOString().split('T')[0]
  const startTime = startDate.toTimeString().substring(0, 5)
  const endTime = endDate.toTimeString().substring(0, 5)
  
  const dateFormatted = startDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const timeRange = `${startTime} - ${endTime}`
  
  return {
    date,
    startTime,
    endTime,
    dateFormatted,
    timeRange
  }
}
