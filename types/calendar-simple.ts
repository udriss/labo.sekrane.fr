// types/calendar-simple.ts
// Nouvelle structure simplifiée pour les événements de calendrier

export type EventState = 'PENDING' | 'VALIDATED' | 'CANCELLED' | 'MOVED'
export type EventType = 'TP' | 'MAINTENANCE' | 'INVENTORY' | 'OTHER'
export type OperatorActionType = 'VALIDATE' | 'CANCEL' | 'MOVE'

export interface SimpleTimeSlot {
  id: string
  startDate: string // ISO date
  endDate: string   // ISO date
  createdBy: string
  createdAt: string
}

export interface OperatorAction {
  type: OperatorActionType
  operatorId: string
  operatorName: string
  date: string
  reason?: string
  proposedTimeSlots?: SimpleTimeSlot[] // Seulement pour type 'MOVE'
}

export interface SimpleCalendarEvent {
  id: string
  title: string
  description?: string
  type: EventType
  state: EventState
  class?: string
  room?: string
  
  // Créneaux originaux de l'utilisateur (jamais modifiés)
  userTimeSlots: SimpleTimeSlot[]
  
  // Action actuelle de l'opérateur (remplace les précédentes)
  operatorAction?: OperatorAction
  
  // Ressources
  materials?: string[]
  chemicals?: string[]
  files?: Array<{
    fileName: string
    fileUrl: string
  }>
  
  // Métadonnées
  createdBy: string
  createdAt: string
  updatedAt: string
  remarks?: string
}

// Fonction utilitaire pour obtenir les créneaux à afficher
export function getDisplayTimeSlots(event: SimpleCalendarEvent): SimpleTimeSlot[] {
  switch (event.state) {
    case 'VALIDATED':
    case 'PENDING':
    case 'CANCELLED':
      return event.userTimeSlots
    case 'MOVED':
      return event.operatorAction?.proposedTimeSlots || event.userTimeSlots
    default:
      return event.userTimeSlots
  }
}

// Fonction pour obtenir le label d'état
export function getStateLabel(state: EventState): string {
  switch (state) {
    case 'PENDING':
      return 'En attente'
    case 'VALIDATED':
      return 'Validé'
    case 'CANCELLED':
      return 'Annulé'
    case 'MOVED':
      return 'Déplacé'
    default:
      return 'Inconnu'
  }
}

// Interface pour les actions d'opérateur
export interface OperatorActionRequest {
  eventId: string
  action: OperatorActionType
  reason?: string
  proposedTimeSlots?: Omit<SimpleTimeSlot, 'id' | 'createdBy' | 'createdAt'>[]
}
