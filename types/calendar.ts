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
  chemicals?: Chemical[] // NOUVEAU: liste des produits chimiques associés
  consommables?: PhysicsConsumable[] // NOUVEAU: liste des consommables associés
  files?: FileInfo[]        // Nouveau champ pour la gestion multiple
  remarks?: string | null   // Nouveau champ pour les remarques avec formatage
  createdBy?: string | null 
  modifiedBy?: Array<[string, ...string[]]>
  createdAt?: string
  updatedAt?: string
}

export type ChemicalUnit = 'g' | 'kg' | 'mg' | 'L' | 'mL' | 'mol' | 'mmol' | 'pieces'

export type HazardClass = 'FLAMMABLE' | 'CORROSIVE' | 'TOXIC' | 'OXIDIZING' | 'EXPLOSIVE' | 'RADIOACTIVE' | 'BIOLOGICAL' | 'NONE'

export interface Chemical {
  id: string
  name: string
  formula?: string | null
  molfile?: string | null
  casNumber?: string | null
  barcode?: string | null
  quantity: number
  unit?: ChemicalUnit | null
  minQuantity?: number | null
  concentration?: number | null
  purity?: number | null
  purchaseDate?: string | null
  expirationDate?: string | null
  openedDate?: string | null
  storage?: string | null
  room?: string | null
  cabinet?: string | null
  shelf?: string | null
  hazardClass?: HazardClass | null
  sdsFileUrl?: string | null
  supplierId?: string | null
  batchNumber?: string | null
  orderReference?: string | null
  status?: ConsumableStatus | null
  notes?: string | null
  quantityPrevision?: number | null
  createdAt?: string | null
  updatedAt?: string | null
  requestedQuantity?: number | null
  isCustom?: boolean
}


export type ConsumableUnit = 'piece' | 'pieces' | 'kg' | 'g' | 'mg' | 'L' | 'mL' | 'm' | 'cm' | 'mm'

export type ConsumableStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRED' | 'EMPTY'

export interface PhysicsConsumable {
  id: string
  name: string
  physics_consumable_type_id?: string | null
  physics_consumable_item_id?: string | null
  barcode?: string | null
  quantity: number
  unit?: ConsumableUnit | null
  minQuantity?: number | null
  brand?: string | null
  model?: string | null
  specifications?: string | null
  purchaseDate?: string | null
  expirationDate?: string | null
  storage?: string | null
  room?: string | null
  location?: string | null
  status?: ConsumableStatus | null
  supplierId?: string | null
  batchNumber?: string | null
  orderReference?: string | null
  notes?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}