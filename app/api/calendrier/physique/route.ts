// app/api/calendrier/physique/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { getPhysicsEvents, createPhysicsEvent, updatePhysicsEvent, deletePhysicsEvent } from '@/lib/calendar-utils'
import { generateTimeSlotId } from '@/lib/calendar-utils-client'
import { TimeSlot, CalendarEvent } from '@/types/calendar'

// GET - Récupérer les événements de physique
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const events = await getPhysicsEvents(startDate || undefined, endDate || undefined)

    // Convertir les événements DB en format CalendarEvent
    const convertedEvents = events.map(dbEvent => ({
      id: dbEvent.id,
      title: dbEvent.title,
      description: dbEvent.description,
      type: dbEvent.type.toUpperCase() === 'TP' ? 'TP' : 
            dbEvent.type.toUpperCase() === 'MAINTENANCE' ? 'MAINTENANCE' :
            dbEvent.type.toUpperCase() === 'INVENTORY' ? 'INVENTORY' : 'OTHER',
      state: 'VALIDATED',
      timeSlots: [{
        id: `${dbEvent.id}-slot-1`,
        startDate: dbEvent.start_date,
        endDate: dbEvent.end_date,
        status: 'active' as const
      }],
      actuelTimeSlots: [{
        id: `${dbEvent.id}-slot-1`,
        startDate: dbEvent.start_date,
        endDate: dbEvent.end_date,
        status: 'active' as const
      }],
      class: dbEvent.class_name,
      room: dbEvent.room,
      materials: dbEvent.equipment_used?.map(id => ({ id, name: id })) || [],
      chemicals: dbEvent.chemicals_used?.map(id => ({ id, name: id })) || [],
      remarks: dbEvent.notes,
      createdBy: dbEvent.created_by,
      createdAt: dbEvent.created_at || new Date().toISOString(),
      updatedAt: dbEvent.updated_at || new Date().toISOString()
    }))

    return NextResponse.json(convertedEvents)
  } catch (error) {
    console.error('Erreur lors de la récupération des événements de physique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des événements' },
      { status: 500 }
    )
  }
}

// POST - Créer un événement de physique
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { 
      title, 
      description, 
      date,
      timeSlots, 
      type, 
      room, 
      class: className,
      classes,
      materials, 
      chemicals, 
      remarks,
      equipment
    } = body

    if (!title || (!timeSlots || timeSlots.length === 0)) {
      return NextResponse.json(
        { error: 'Titre et créneaux horaires requis' },
        { status: 400 }
      )
    }

    // Gérer les deux formats de timeSlots
    let startDate, endDate;
    const timeSlot = timeSlots[0]
    
    if (timeSlot.startDate && timeSlot.endDate) {
      // Format: { startDate: "ISO", endDate: "ISO" }
      startDate = timeSlot.startDate
      endDate = timeSlot.endDate
    } else if (date && timeSlot.startTime && timeSlot.endTime) {
      // Format: date + { startTime: "HH:mm", endTime: "HH:mm" }
      const startDateTime = new Date(`${date}T${timeSlot.startTime}`)
      const endDateTime = new Date(`${date}T${timeSlot.endTime}`)
      startDate = startDateTime.toISOString()
      endDate = endDateTime.toISOString()
    } else {
      return NextResponse.json(
        { error: 'Format de créneaux horaires invalide' },
        { status: 400 }
      )
    }

    const eventData = {
      title,
      start_date: startDate,
      end_date: endDate,
      description: description || '',
      type: type?.toLowerCase() || 'other',
      status: 'scheduled' as const,
      room: room || '',
      teacher: session.user.name || '',
      class_name: className || classes?.[0] || '',
      participants: [],
      equipment_used: (materials || equipment)?.map((m: any) => typeof m === 'string' ? m : m.id || m.name || '') || [],
      chemicals_used: chemicals?.map((c: any) => typeof c === 'string' ? c : c.id || c.name || '') || [],
      notes: remarks || '',
      color: '#9c27b0', // Couleur violette pour la physique
      created_by: session.user.id
    }

    const createdEvent = await createPhysicsEvent(eventData)

    // Convertir en format CalendarEvent pour la réponse
    const responseEvent = {
      id: createdEvent.id,
      title: createdEvent.title,
      description: createdEvent.description,
      type: createdEvent.type.toUpperCase() === 'TP' ? 'TP' : 
            createdEvent.type.toUpperCase() === 'MAINTENANCE' ? 'MAINTENANCE' :
            createdEvent.type.toUpperCase() === 'INVENTORY' ? 'INVENTORY' : 'OTHER',
      state: 'VALIDATED',
      timeSlots: [{
        id: `${createdEvent.id}-slot-1`,
        startDate: createdEvent.start_date,
        endDate: createdEvent.end_date,
        status: 'active' as const
      }],
      actuelTimeSlots: [{
        id: `${createdEvent.id}-slot-1`,
        startDate: createdEvent.start_date,
        endDate: createdEvent.end_date,
        status: 'active' as const
      }],
      class: createdEvent.class_name,
      room: createdEvent.room,
      materials: createdEvent.equipment_used?.map(id => ({ id, name: id })) || [],
      chemicals: createdEvent.chemicals_used?.map(id => ({ id, name: id })) || [],
      remarks: createdEvent.notes,
      createdBy: createdEvent.created_by,
      createdAt: createdEvent.created_at,
      updatedAt: createdEvent.updated_at
    }

    return NextResponse.json(responseEvent)
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement de physique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'événement' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un événement de physique
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, title, description, timeSlots, type, room, class: className, materials, chemicals, remarks } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      )
    }

    const timeSlot = timeSlots?.[0]
    const updates: any = {}
    
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (timeSlot) {
      updates.start_date = timeSlot.startDate
      updates.end_date = timeSlot.endDate
    }
    if (type !== undefined) updates.type = type.toLowerCase()
    if (room !== undefined) updates.room = room
    if (className !== undefined) updates.class_name = className
    if (materials !== undefined) {
      updates.equipment_used = materials.map((m: any) => typeof m === 'string' ? m : m.id || m.name || '')
    }
    if (chemicals !== undefined) {
      updates.chemicals_used = chemicals.map((c: any) => typeof c === 'string' ? c : c.id || c.name || '')
    }
    if (remarks !== undefined) updates.notes = remarks

    const updatedEvent = await updatePhysicsEvent(id, updates)

    // Convertir en format CalendarEvent pour la réponse
    const responseEvent = {
      id: updatedEvent.id,
      title: updatedEvent.title,
      description: updatedEvent.description,
      type: updatedEvent.type.toUpperCase() === 'TP' ? 'TP' : 
            updatedEvent.type.toUpperCase() === 'MAINTENANCE' ? 'MAINTENANCE' :
            updatedEvent.type.toUpperCase() === 'INVENTORY' ? 'INVENTORY' : 'OTHER',
      state: 'VALIDATED',
      timeSlots: [{
        id: `${updatedEvent.id}-slot-1`,
        startDate: updatedEvent.start_date,
        endDate: updatedEvent.end_date,
        status: 'active' as const
      }],
      actuelTimeSlots: [{
        id: `${updatedEvent.id}-slot-1`,
        startDate: updatedEvent.start_date,
        endDate: updatedEvent.end_date,
        status: 'active' as const
      }],
      class: updatedEvent.class_name,
      room: updatedEvent.room,
      materials: updatedEvent.equipment_used?.map(id => ({ id, name: id })) || [],
      chemicals: updatedEvent.chemicals_used?.map(id => ({ id, name: id })) || [],
      remarks: updatedEvent.notes,
      createdBy: updatedEvent.created_by,
      createdAt: updatedEvent.created_at,
      updatedAt: updatedEvent.updated_at
    }

    return NextResponse.json(responseEvent)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement de physique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'événement' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un événement de physique
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      )
    }

    const success = await deletePhysicsEvent(id)

    if (!success) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement de physique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'événement' },
      { status: 500 }
    )
  }
}
