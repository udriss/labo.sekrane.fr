// lib/calendar-utils-client.ts
// Utilitaires calendar côté client (sans dépendances serveur)

export interface RoomData {
  id: string
  name: string
  capacity?: number | null
  description?: string | null
}

// Fonction pour obtenir le nom d'affichage d'une salle
export function getRoomDisplayName(room: string | RoomData | null | undefined): string {
  if (!room) return ''
  
  if (typeof room === 'string') {
    return room
  }
  
  return room.name || room.id || 'Salle inconnue'
}

// Fonction pour normaliser les données room côté client
export function normalizeRoomData(room: string | RoomData | null | undefined): RoomData | null {
  if (!room) return null
  
  if (typeof room === 'string') {
    return {
      id: room,
      name: room
    }
  }
  
  return {
    id: room.id || room.name || 'unknown',
    name: room.name || room.id || 'Salle inconnue',
    capacity: room.capacity,
    description: room.description
  }
}

// Fonction pour comparer deux room data côté client
export function compareRoomData(room1: string | RoomData | null | undefined, room2: string | RoomData | null | undefined): boolean {
  if (!room1 && !room2) return true
  if (!room1 || !room2) return false
  
  const normalized1 = normalizeRoomData(room1)
  const normalized2 = normalizeRoomData(room2)
  
  if (!normalized1 || !normalized2) return false
  
  return normalized1.id === normalized2.id
}

// Fonction pour sérialiser room data pour l'API
export function serializeRoomData(room: string | RoomData | null | undefined): string | null {
  if (!room) return null
  
  if (typeof room === 'string') {
    return room
  }
  
  // Pour les objets room, on sérialise en JSON
  return JSON.stringify({
    id: room.id || room.name || 'unknown',
    name: room.name || room.id || 'Salle inconnue',
    capacity: room.capacity || null,
    description: room.description || null
  })
}
