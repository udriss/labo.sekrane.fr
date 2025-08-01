// app/api/calendrier/chimie/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { getChemistryEvents, createChemistryEvent, updateChemistryEvent, deleteChemistryEvent } from '@/lib/calendar-utils'
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
      materials: dbEvent.equipment_used?.map((id: any) => ({ id, name: id })) || [],
      chemicals: dbEvent.chemicals_used?.map((id: any) => ({ id, name: id })) || [],
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

// POST - Créer un événement de chimie avec support multi-créneaux
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

    // Créer plusieurs événements pour chaque créneau
    const createdEvents: any[] = []
    
    for (let i = 0; i < timeSlots.length; i++) {
      const timeSlot = timeSlots[i]
      let startDate, endDate;
      
      if (timeSlot.startDate && timeSlot.endDate) {
        // Format: { startDate: "ISO", endDate: "ISO" }
        // Convertir en format MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
        const startDateObj = new Date(timeSlot.startDate)
        const endDateObj = new Date(timeSlot.endDate)
        startDate = startDateObj.toISOString().slice(0, 19).replace('T', ' ')
        endDate = endDateObj.toISOString().slice(0, 19).replace('T', ' ')
      } else if (timeSlot.date && timeSlot.startTime && timeSlot.endTime) {
        // Format: { date: "YYYY-MM-DD", startTime: "HH:mm", endTime: "HH:mm" }
        startDate = `${timeSlot.date} ${timeSlot.startTime}:00`
        endDate = `${timeSlot.date} ${timeSlot.endTime}:00`
      } else if (date && timeSlot.startTime && timeSlot.endTime) {
        // Format: date + { startTime: "HH:mm", endTime: "HH:mm" }
        const startDateTime = new Date(`${date}T${timeSlot.startTime}`)
        const endDateTime = new Date(`${date}T${timeSlot.endTime}`)
        startDate = startDateTime.toISOString().slice(0, 19).replace('T', ' ')
        endDate = endDateTime.toISOString().slice(0, 19).replace('T', ' ')
      } else {
        return NextResponse.json(
          { error: 'Format de créneau horaire invalide' },
          { status: 400 }
        )
      }

      const eventData = {
        title: timeSlots.length > 1 ? `${title} (${i + 1}/${timeSlots.length})` : title,
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
        color: '#2196f3', // Couleur bleue pour la chimie
        created_by: session.user.id
      }

      const createdEvent = await createChemistryEvent(eventData)
      createdEvents.push(createdEvent)
    }

    // Retourner le format attendu avec tous les créneaux
    const responseEvents = createdEvents.map((createdEvent, index) => ({
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
      materials: createdEvent.equipment_used?.map((id: any) => ({ id, name: id })) || [],
      chemicals: createdEvent.chemicals_used?.map((id: any) => ({ id, name: id })) || [],
      remarks: createdEvent.notes,
      createdBy: createdEvent.created_by,
      createdAt: createdEvent.created_at,
      updatedAt: createdEvent.updated_at
    }))

    // Si un seul créneau, retourner l'événement directement, sinon retourner un tableau
    return NextResponse.json(responseEvents.length === 1 ? responseEvents[0] : responseEvents)
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement de chimie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'événement' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un événement de chimie avec support multi-créneaux
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

    // Pour PUT, gérer seulement un créneau (le premier) pour la compatibilité
    const timeSlot = timeSlots?.[0]
    const updates: any = {}
    
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (timeSlot) {
      if (timeSlot.startDate && timeSlot.endDate) {
        // Format ISO
        const startDateObj = new Date(timeSlot.startDate)
        const endDateObj = new Date(timeSlot.endDate)
        updates.start_date = startDateObj.toISOString().slice(0, 19).replace('T', ' ')
        updates.end_date = endDateObj.toISOString().slice(0, 19).replace('T', ' ')
      } else if (timeSlot.date && timeSlot.startTime && timeSlot.endTime) {
        // Format séparé
        updates.start_date = `${timeSlot.date} ${timeSlot.startTime}:00`
        updates.end_date = `${timeSlot.date} ${timeSlot.endTime}:00`
      }
    }
    if (type !== undefined) updates.type = type.toLowerCase()
    if (room !== undefined) updates.room = room
    if (className !== undefined) updates.class_name = className
    if (materials !== undefined) {
      updates.equipment_used = JSON.stringify(materials.map((m: any) => typeof m === 'string' ? m : m.id || m.name || ''))
    }
    if (chemicals !== undefined) {
      updates.chemicals_used = JSON.stringify(chemicals.map((c: any) => typeof c === 'string' ? c : c.id || c.name || ''))
    }
    if (remarks !== undefined) updates.notes = remarks

    const updatedEvent = await updateChemistryEvent(id, updates)

    // Convertir en format CalendarEvent pour la réponse
    const responseEvent = {
      id: updatedEvent.id,
      title: updatedEvent.title,
      description: updatedEvent.description,
      type: updatedEvent.type.toUpperCase() === 'TP' ? 'TP' : 
            updatedEvent.type.toUpperCase() === 'MAINTENANCE' ? 'MAINTENANCE' :
            (updatedEvent.type.toUpperCase() === 'INVENTORY' ? 'INVENTORY' : 'OTHER'),
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
      materials: updatedEvent.equipment_used?.map((id: any) => ({ id, name: id })) || [],
      chemicals: updatedEvent.chemicals_used?.map((id: any) => ({ id, name: id })) || [],
      remarks: updatedEvent.notes,
      createdBy: updatedEvent.created_by,
      createdAt: updatedEvent.created_at,
      updatedAt: updatedEvent.updated_at
    }

    return NextResponse.json(responseEvent)
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

    await deleteChemistryEvent(id)

    return NextResponse.json({ message: 'Événement supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement de chimie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'événement' },
      { status: 500 }
    )
  }
}
