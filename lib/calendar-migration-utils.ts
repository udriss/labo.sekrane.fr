// lib/calendar-migration-utils.ts
// Utilitaires pour la migration du système complexe vers le système simple

import { CalendarEvent, TimeSlot, EventState } from '@/types/calendar'

export interface OperatorAction {
  action: 'VALIDATE' | 'CANCEL' | 'MOVE'
  eventId: string
  reason?: string
  proposedTimeSlots?: Array<{
    startDate: string
    endDate: string
  }>
}

/**
 * Extrait les créneaux affichables d'un événement
 * Version simplifiée qui utilise une logique claire
 */
export function getDisplayTimeSlots(event: CalendarEvent): TimeSlot[] {
  if (!event.timeSlots || event.timeSlots.length === 0) {
    return []
  }

  // Si l'événement est validé et a des actuelTimeSlots, les utiliser
  if (event.state === 'VALIDATED' && event.actuelTimeSlots && event.actuelTimeSlots.length > 0) {
    return event.actuelTimeSlots.filter(slot => slot.status === 'active')
  }

  // Pour les événements annulés, afficher tous les créneaux (même ceux supprimés/deleted)
  if (event.state === 'CANCELLED') {
    return event.actuelTimeSlots || []
  }

  // Sinon, utiliser les timeSlots actifs
  return event.timeSlots.filter(slot => slot.status === 'active')
}

/**
 * Applique une action d'opérateur sur un événement
 * Retourne l'événement mis à jour
 */
export function applyOperatorAction(event: CalendarEvent, action: OperatorAction): CalendarEvent {
  const updatedEvent = { ...event }
  const now = new Date().toISOString()

  switch (action.action) {
    case 'VALIDATE':
      // Valider l'événement : utiliser les timeSlots proposés comme actuelTimeSlots
      updatedEvent.state = 'VALIDATED'
      updatedEvent.actuelTimeSlots = [...(event.timeSlots || [])]
      break

    case 'CANCEL':
      // Annuler l'événement
      updatedEvent.state = 'CANCELLED'
      // Marquer tous les créneaux comme 'deleted'
      if (updatedEvent.timeSlots) {
        updatedEvent.timeSlots = updatedEvent.timeSlots.map(slot => ({
          ...slot,
          status: 'deleted' as const
        }))
      }
      if (updatedEvent.actuelTimeSlots) {
        updatedEvent.actuelTimeSlots = updatedEvent.actuelTimeSlots.map(slot => ({
          ...slot,
          status: 'deleted' as const
        }))
      }
      break

    case 'MOVE':
      if (!action.proposedTimeSlots || action.proposedTimeSlots.length === 0) {
        throw new Error('Des créneaux proposés sont requis pour déplacer un événement')
      }

      // Déplacer l'événement : garder les timeSlots originaux et créer de nouveaux actuelTimeSlots
      updatedEvent.state = 'MOVED'
      
      // Créer les nouveaux créneaux
      const newTimeSlots: TimeSlot[] = action.proposedTimeSlots.map((slot, index) => ({
        id: `moved-${Date.now()}-${index}`,
        startDate: slot.startDate,
        endDate: slot.endDate,
        status: 'active' as const,
        createdBy: 'operator',
        modifiedBy: [{
          userId: 'operator',
          date: now,
          action: 'created' as const,
          note: action.reason || 'Événement déplacé par l\'opérateur'
        }]
      }))

      updatedEvent.actuelTimeSlots = newTimeSlots
      break

    default:
      throw new Error(`Action non supportée: ${action.action}`)
  }

  // Ajouter l'historique des changements d'état
  if (!updatedEvent.stateChanger) {
    updatedEvent.stateChanger = []
  }

  updatedEvent.stateChanger.push({
    userId: 'operator',
    date: now,
    fromState: event.state || 'PENDING',
    toState: updatedEvent.state || 'PENDING',
    reason: action.reason
  })

  updatedEvent.updatedAt = now

  return updatedEvent
}

/**
 * Valide qu'une action d'opérateur peut être appliquée
 */
export function validateOperatorAction(event: CalendarEvent, action: OperatorAction): boolean {
  switch (action.action) {
    case 'VALIDATE':
      // Peut valider si l'événement est en attente ou déplacé
      return (event.state || 'PENDING') === 'PENDING' || (event.state || 'PENDING') === 'MOVED'

    case 'CANCEL':
      // Peut annuler si l'événement n'est pas déjà annulé
      return (event.state || 'PENDING') !== 'CANCELLED'

    case 'MOVE':
      // Peut déplacer si l'événement n'est pas annulé et qu'il y a des créneaux proposés
      return (event.state || 'PENDING') !== 'CANCELLED' && 
             !!action.proposedTimeSlots && 
             action.proposedTimeSlots.length > 0

    default:
      return false
  }
}

/**
 * Crée une action d'opérateur à partir des paramètres
 */
export function createOperatorAction(
  eventId: string,
  action: 'VALIDATE' | 'CANCEL' | 'MOVE',
  reason?: string,
  proposedTimeSlots?: Array<{ startDate: string; endDate: string }>
): OperatorAction {
  const operatorAction: OperatorAction = {
    action,
    eventId,
    reason
  }

  if (proposedTimeSlots && proposedTimeSlots.length > 0) {
    operatorAction.proposedTimeSlots = proposedTimeSlots
  }

  return operatorAction
}

/**
 * Convertit les créneaux d'un formulaire vers le format TimeSlot
 */
export function convertFormSlotsToTimeSlots(formSlots: Array<{
  date: string
  startTime: string
  endTime: string
}>): Array<{ startDate: string; endDate: string }> {
  return formSlots
    .filter(slot => slot.date && slot.startTime && slot.endTime)
    .map(slot => ({
      startDate: `${slot.date}T${slot.startTime}:00.000Z`,
      endDate: `${slot.date}T${slot.endTime}:00.000Z`
    }))
}

/**
 * Formate l'affichage d'un créneau horaire
 */
export function formatTimeSlot(slot: TimeSlot): string {
  const start = new Date(slot.startDate)
  const end = new Date(slot.endDate)
  
  const startTime = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const endTime = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  
  return `${startTime} - ${endTime}`
}

/**
 * Formate l'affichage d'une date avec les créneaux
 */
export function formatDateWithSlots(date: Date, slots: TimeSlot[]): string {
  const dateStr = date.toLocaleDateString('fr-FR')
  const slotsStr = slots.map(formatTimeSlot).join(', ')
  return `${dateStr}: ${slotsStr}`
}

/**
 * Groupe les créneaux par date
 */
export function groupSlotsByDate(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const grouped = new Map<string, TimeSlot[]>()
  
  slots.forEach(slot => {
    const date = new Date(slot.startDate).toDateString()
    if (!grouped.has(date)) {
      grouped.set(date, [])
    }
    grouped.get(date)!.push(slot)
  })
  
  return grouped
}

/**
 * Vérifie si un événement nécessite une action d'opérateur
 */
export function needsOperatorAction(event: CalendarEvent): boolean {
  const state = event.state || 'PENDING'
  return state === 'PENDING' || state === 'MOVED'
}

/**
 * Récupère le statut d'action pour un événement
 */
export function getActionStatus(event: CalendarEvent): {
  canValidate: boolean
  canCancel: boolean
  canMove: boolean
  needsAction: boolean
} {
  const state = event.state || 'PENDING'
  return {
    canValidate: state === 'PENDING' || state === 'MOVED',
    canCancel: state !== 'CANCELLED',
    canMove: state !== 'CANCELLED',
    needsAction: needsOperatorAction(event)
  }
}
