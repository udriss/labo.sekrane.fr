// app/api/calendrier/chimie/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { getChemistryEvents, createChemistryEvent, updateChemistryEvent, deleteChemistryEvent } from '@/lib/calendar-utils'
import { generateTimeSlotId } from '@/lib/calendar-utils-client'
import { TimeSlot, CalendarEvent } from '@/types/calendar'

// GET - Récupérer les événements de chimie
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const events = await getChemistryEvents(startDate || undefined, endDate || undefined)

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
    console.error('Erreur lors de la récupération des événements de chimie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des événements' },
      { status: 500 }
    )
  }
}

// POST - Créer un événement de chimie
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
      color: '#2196F3', // Couleur bleue pour la chimie
      created_by: session.user.id
    }

    const createdEvent = await createChemistryEvent(eventData)

    return NextResponse.json(createdEvent)
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement de chimie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'événement' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un événement de chimie
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

    // Gérer les deux formats de timeSlots si fournis
    let startDate, endDate;
    if (timeSlots && timeSlots.length > 0) {
      const timeSlot = timeSlots[0]
      startDate = timeSlot.startDate
      endDate = timeSlot.endDate
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (startDate) updateData.start_date = startDate
    if (endDate) updateData.end_date = endDate
    if (type !== undefined) updateData.type = type?.toLowerCase() || 'other'
    if (room !== undefined) updateData.room = room
    if (className !== undefined) updateData.class_name = className
    if (materials !== undefined) updateData.equipment_used = materials.map((m: any) => typeof m === 'string' ? m : m.id || m.name || '')
    if (chemicals !== undefined) updateData.chemicals_used = chemicals.map((c: any) => typeof c === 'string' ? c : c.id || c.name || '')
    if (remarks !== undefined) updateData.notes = remarks
    updateData.updated_at = new Date().toISOString()

    const updatedEvent = await updateChemistryEvent(id, updateData)

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement de chimie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'événement' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un événement de chimie
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

    const success = await deleteChemistryEvent(id)

    if (success) {
      return NextResponse.json({ message: 'Événement supprimé avec succès' })
    } else {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement de chimie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'événement' },
      { status: 500 }
    )
  }
}
