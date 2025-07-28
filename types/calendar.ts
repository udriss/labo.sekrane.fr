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
  status?: 'active' | 'deleted' | 'modified';
  createdBy?: string;  // Ajout du créateur
  modifiedBy?: Array<{
    userId: string;
    date: string;
    action: 'created' | 'modified' | 'deleted';
  }>;  // Ajout de l'historique des modifications
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
  eventModifying?: EventModification[] // Nouveau champ pour les modifications en attente
  createdBy?: string | null 
  modifiedBy?: Array<[string, ...string[]]>
  createdAt?: string
  updatedAt?: string
}