// types/calendar.ts
export type EventType = 'TP' | 'MAINTENANCE' | 'INVENTORY' | 'OTHER'

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
  startDate: Date | string
  endDate: Date | string
  type: EventType
  class?: string | null
  room?: string | null
  location?: string | null
  materials?: (string | {
    id?: string
    name?: string
    itemName?: string
    volume?: string
    quantity?: number
  })[]
  chemicals?: (string | {
    id?: string
    name?: string
    formula?: string
    quantity?: number
    unit?: string
  })[]
  fileName?: string | null  // Garder pour la rétrocompatibilité
  fileUrl?: string | null   // Ajouter pour la rétrocompatibilité
  files?: FileInfo[]        // Nouveau champ pour la gestion multiple
  remarks?: string | null   // Nouveau champ pour les remarques avec formatage
  createdBy?: string | null 
  modifiedBy?: Array<[string, ...string[]]>
  createdAt?: string
  updatedAt?: string
}