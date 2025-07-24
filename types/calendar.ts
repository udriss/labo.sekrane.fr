// types/calendar.ts
export type EventType = 'TP' | 'MAINTENANCE' | 'INVENTORY' | 'OTHER'

export interface CalendarEvent {
  id: string
  title: string
  description?: string | null
  startDate: Date | string
  endDate: Date | string
  type: EventType
  class?: string | null
  room?: string | null
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
  fileName?: string | null
  createdAt?: string
  updatedAt?: string
}