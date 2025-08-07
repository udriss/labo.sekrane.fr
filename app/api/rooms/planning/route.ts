// app/api/rooms/planning/route.ts
// API pour récupérer les données de planning des salles

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { Room, RoomLocation, RoomEvent, RoomOccupancy } from '@/types/rooms'

// Interface pour les événements de calendrier avec timeSlots
interface CalendarEventWithTimeSlots {
  id: string
  title: string
  start_date?: string
  end_date?: string
  room?: any
  created_by?: string
  creator_name?: string
  class_data?: any
  notes?: string
  timeSlots?: Array<{
    id: string
    startDate: string
    endDate: string
    status: string
  }>
  actuelTimeSlots?: Array<{
    id: string
    startDate: string
    endDate: string
    status: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const roomId = searchParams.get('roomId')

    // Récupérer toutes les salles avec leurs localisations
    const roomsQuery = `
      SELECT 
        r.id, r.name, r.description, r.capacity, r.is_active,
        rl.id as location_id, rl.name as location_name, 
        rl.description as location_description, rl.is_active as location_active
      FROM rooms r
      LEFT JOIN room_locations rl ON r.id = rl.room_id
      WHERE r.is_active = 1
      ${roomId ? 'AND r.id = ?' : ''}
      ORDER BY r.name, rl.name
    `

    const roomsParams = roomId ? [roomId] : []
    const roomsRows = await query(roomsQuery, roomsParams) as any[]

    // Organiser les salles et leurs localisations
    const roomsMap = new Map<string, Room>()
    
    roomsRows.forEach(row => {
      if (!roomsMap.has(row.id)) {
        roomsMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          capacity: row.capacity,
          is_active: row.is_active,
          locations: []
        })
      }

      if (row.location_id) {
        const room = roomsMap.get(row.id)!
        room.locations!.push({
          id: row.location_id,
          room_id: row.id,
          name: row.location_name,
          description: row.location_description,
          is_active: row.location_active
        })
      }
    })

    const rooms = Array.from(roomsMap.values())

    // Récupérer les événements de chimie et physique
    const dateFilter = startDate && endDate 
      ? `AND ((DATE(start_date) BETWEEN ? AND ?) OR (DATE(end_date) BETWEEN ? AND ?))`
      : ''
    
    const dateParams = startDate && endDate 
      ? [startDate, endDate, startDate, endDate]
      : []

    // Événements de chimie
    const chemistryQuery = `
      SELECT 
        c.id, c.title, c.start_date, c.end_date, c.room, c.created_by, c.class_data, c.notes,
        c.timeSlots, c.actuelTimeSlots,
        u.name as creator_name
      FROM calendar_chimie c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1 ${dateFilter}
      ORDER BY c.start_date
    `
    
    // Événements de physique
    const physicsQuery = `
      SELECT 
        c.id, c.title, c.start_date, c.end_date, c.room, c.created_by, c.class_data, c.notes,
        c.timeSlots, c.actuelTimeSlots,
        u.name as creator_name
      FROM calendar_physique c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1 ${dateFilter}
      ORDER BY c.start_date
    `

    const [chemistryEvents, physicsEvents] = await Promise.all([
      query(chemistryQuery, dateParams) as Promise<CalendarEventWithTimeSlots[]>,
      query(physicsQuery, dateParams) as Promise<CalendarEventWithTimeSlots[]>
    ])

    // Traiter les événements et extraire les timeSlots
    const processEvents = (events: CalendarEventWithTimeSlots[], type: 'chemistry' | 'physics') => {
      return events.map(event => {
        let timeSlots: any[] = []
        let actuelTimeSlots: any[] = []

        // Essayer d'abord de récupérer depuis les colonnes directes
        try {
          if (event.actuelTimeSlots) {
            if (typeof event.actuelTimeSlots === 'string') {
              actuelTimeSlots = JSON.parse(event.actuelTimeSlots)
            } else {
              actuelTimeSlots = event.actuelTimeSlots
            }
          }
          
          if (event.timeSlots) {
            if (typeof event.timeSlots === 'string') {
              timeSlots = JSON.parse(event.timeSlots)
            } else {
              timeSlots = event.timeSlots
            }
          }
        } catch (error) {
          console.warn('Erreur parsing timeSlots directs pour événement', event.id, error)
        }

        // Si pas de timeSlots trouvés, essayer depuis les notes (fallback)
        if (actuelTimeSlots.length === 0 && timeSlots.length === 0 && event.notes) {
          try {
            const notesData = JSON.parse(event.notes)
            timeSlots = notesData.timeSlots || []
            actuelTimeSlots = notesData.actuelTimeSlots || []
          } catch (error) {
            console.warn('Erreur parsing timeSlots depuis notes pour événement', event.id, error)
          }
        }

        // Créer l'événement compatible avec RoomEvent
        return {
          id: event.id,
          title: event.title,
          start_time: event.start_date ? new Date(event.start_date).toTimeString().substring(0, 8) : '',
          end_time: event.end_date ? new Date(event.end_date).toTimeString().substring(0, 8) : '',
          creator_name: event.creator_name,
          creator_email: event.created_by,
          class_data: event.class_data ? (typeof event.class_data === 'string' ? JSON.parse(event.class_data) : event.class_data) : undefined,
          room: event.room,
          type,
          discipline: type === 'chemistry' ? 'chimie' as const : 'physique' as const,
          timeSlots,
          actuelTimeSlots
        }
      })
    }

    const allEvents = [
      ...processEvents(chemistryEvents, 'chemistry'),
      ...processEvents(physicsEvents, 'physics')
    ]

    // Créer la réponse avec les occupations des salles
    const roomOccupancies: RoomOccupancy[] = rooms.map(room => {
      // Filtrer les événements pour cette salle
      const roomEvents = allEvents.filter(event => {
        if (!event.room) return false
        
        // Support pour les différents formats de room
        let roomData;
        if (typeof event.room === 'string') {
          try {
            // Essayer de parser comme JSON
            roomData = JSON.parse(event.room);
          } catch {
            // Si ça échoue, c'est probablement un nom de salle
            return event.room === room.name || event.room === room.id;
          }
        } else if (typeof event.room === 'object') {
          roomData = event.room;
        } else {
          return false;
        }

        // Vérifier l'ID ou le nom de la salle
        return roomData.id === room.id || roomData.name === room.name;
      })

      // Extraire tous les timeSlots actifs des événements
      const timeSlots: any[] = []
      
      roomEvents.forEach(event => {
        // Utiliser actuelTimeSlots directement car ils contiennent les créneaux actuels validés
        const activeSlots = event.actuelTimeSlots.filter((slot: any) => slot.status === 'active')
        
        activeSlots.forEach((slot: any) => {
          timeSlots.push({
            id: slot.id,
            startDate: slot.startDate,
            endDate: slot.endDate,
            eventId: event.id,
            eventTitle: event.title,
            eventType: event.type,
            creator_name: event.creator_name,
            class_data: event.class_data,
            discipline: event.discipline
          })
        })
      })

      return {
        room,
        events: roomEvents,
        timeSlots: timeSlots.sort((a, b) => 
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        )
      }
    })

    return NextResponse.json({
      success: true,
      data: roomOccupancies,
      rooms: rooms,
      totalEvents: allEvents.length
    })

  } catch (error) {
    console.error('Erreur lors de la récupération du planning des salles:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération du planning des salles',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}
