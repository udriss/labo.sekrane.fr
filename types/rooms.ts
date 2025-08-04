// types/rooms.ts
// Types pour le système de gestion des salles et localisations

export interface RoomLocation {
  id: string
  room_id: string
  name: string
  description?: string
  is_active: boolean
}

export interface Room {
  id: string
  name: string
  description?: string
  capacity?: number
  is_active: boolean
  locations?: RoomLocation[]
}

export interface RoomEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  creator_name?: string
  creator_email?: string
  class_data?: {
    id: string
    name: string
    type: string
  }
  room: Room | string // Support pour string legacy et nouveau format objet
  type: 'chemistry' | 'physics'
  discipline: 'chimie' | 'physique'
}

export interface RoomOccupancy {
  room: Room
  events: RoomEvent[]
  timeSlots: Array<{
    id: string
    startDate: string
    endDate: string
    eventId: string
    eventTitle: string
    eventType: 'chemistry' | 'physics'
  }>
}
