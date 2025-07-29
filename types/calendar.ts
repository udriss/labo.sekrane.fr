// types/calendar.ts
export type EventType = 'TP' | 'MAINTENANCE' | 'INVENTORY' | 'OTHER'

export type EventState = 'PENDING' | 'VALIDATED' | 'CANCELLED' | 'MOVED' | 'IN_PROGRESS'

export interface StateChange {
  userId: string
  date: string
  fromState: EventState
  toState: EventState
  reason?: string
}

export interface TimeSlot {
  id: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'deleted' | 'invalid';
  createdBy?: string;  // Ajout du créateur
  modifiedBy?: Array<{
    userId: string;
    date: string;
    action: 'created' | 'modified' | 'deleted' | 'invalidated';
  }>;  // Ajout de l'historique des modifications
  referentActuelTimeID?: string; // NOUVEAU: ID du créneau actuel référent pour les modifications
}


export interface EventModification {
  requestDate: string
  newDate?: string
  userId: string
  action: 'MOVE' | 'CANCEL'
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED'
  timeSlots?: Array<{
    date: string
    startTime: string
    endTime: string
  }>
  reason?: string
}


export interface FileInfo {
  fileName: string
  fileUrl: string
  fileSize?: number
  fileType?: string
  uploadedAt?: string
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string | null
  timeSlots: TimeSlot[]
  actuelTimeSlots?: TimeSlot[] // NOUVEAU: créneaux actuellement retenus après validation
  type: EventType
  state?: EventState
  stateChanger?: StateChange[]
  class?: string | null
  room?: string | null
  location?: string | null
  materials?: (string | {
    id?: string
    name?: string
    itemName?: string
    volume?: string
    quantity?: number
    unit?: string
    isCustom?: boolean
  })[]
  chemicals?: (string | {
    id?: string
    name?: string
    formula?: string
    quantity?: number
    unit?: string
    quantityPrevision?: number
    requestedQuantity?: number
    isCustom?: boolean
  })[]
  files?: FileInfo[]        // Nouveau champ pour la gestion multiple
  remarks?: string | null   // Nouveau champ pour les remarques avec formatage
  createdBy?: string | null 
  modifiedBy?: Array<[string, ...string[]]>
  createdAt?: string
  updatedAt?: string
}