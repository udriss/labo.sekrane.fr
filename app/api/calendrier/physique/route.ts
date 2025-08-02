// app/api/calendrier/physique/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { getPhysicsEvents, createPhysicsEvent, updatePhysicsEvent, deletePhysicsEvent, getPhysicsEventById } from '@/lib/calendar-utils'
import { getActiveTimeSlots, synchronizeActuelTimeSlots } from '@/lib/calendar-slot-utils'
import { TimeSlot, CalendarEvent } from '@/types/calendar'

// GET - Récupérer les événements de physique
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const events = await getPhysicsEvents(startDate || undefined, endDate || undefined)

    // Convertir les événements DB en format CalendarEvent
    const convertedEvents = events.map(dbEvent => {
      // Parser les TimeSlots depuis les notes JSON
      let timeSlots: TimeSlot[] = []
      let actuelTimeSlots: TimeSlot[] = []
      
      try {
        const parsedNotes = JSON.parse(dbEvent.notes || '{}')
        timeSlots = parsedNotes.timeSlots || []
        actuelTimeSlots = parsedNotes.actuelTimeSlots || []
      } catch {
        // Fallback: créer des TimeSlots depuis les dates de l'événement
        const fallbackSlot: TimeSlot = {
          id: `${dbEvent.id}-legacy-slot`,
          startDate: new Date(dbEvent.start_date).toISOString(),
          endDate: new Date(dbEvent.end_date).toISOString(),
          status: 'active' as const,
          createdBy: dbEvent.created_by,
          modifiedBy: []
        }
        timeSlots = [fallbackSlot]
        actuelTimeSlots = [fallbackSlot]
      }

      // Filtrer seulement les slots actifs
      const activeTimeSlots = getActiveTimeSlots(timeSlots)
      const activeActuelTimeSlots = getActiveTimeSlots(actuelTimeSlots)

      return {
        id: dbEvent.id,
        title: dbEvent.title,
        description: dbEvent.description,
        type: dbEvent.type.toUpperCase() === 'TP' ? 'TP' : 
              dbEvent.type.toUpperCase() === 'MAINTENANCE' ? 'MAINTENANCE' :
              dbEvent.type.toUpperCase() === 'INVENTORY' ? 'INVENTORY' : 'OTHER',
        state: (dbEvent as any).state || 'PENDING', // Utiliser le vrai state de la base de données
        timeSlots: activeTimeSlots,
        actuelTimeSlots: activeActuelTimeSlots,
        class: dbEvent.class_name,
        room: dbEvent.room,
        materials: dbEvent.equipment_used?.map((id: any) => ({ id, name: id })) || [],
        chemicals: dbEvent.chemicals_used?.map((id: any) => ({ id, name: id })) || [],
        remarks: dbEvent.notes,
        createdBy: dbEvent.created_by,
        createdAt: dbEvent.created_at || new Date().toISOString(),
        updatedAt: dbEvent.updated_at || new Date().toISOString()
      }
    })

    return NextResponse.json(convertedEvents)
  } catch (error) {
    console.error('Erreur lors de la récupération des événements de physique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des événements' },
      { status: 500 }
    )
  }
}

// POST - Créer un événement de physique avec support multi-créneaux
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
      consommables, 
      remarks,
      equipment
    } = body

    if (!title || (!timeSlots || timeSlots.length === 0)) {
      return NextResponse.json(
        { error: 'Titre et créneaux horaires requis' },
        { status: 400 }
      )
    }

    // Générer les TimeSlots avec des IDs uniques
    const generatedTimeSlots: TimeSlot[] = []
    let firstSlotStartDate = ''
    let firstSlotEndDate = ''
    
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

      // Premier créneau pour l'événement principal
      if (i === 0) {
        firstSlotStartDate = startDate
        firstSlotEndDate = endDate
      }

      // Créer le TimeSlot avec un ID unique
      const timeSlotWithId: TimeSlot = {
        id: `${Date.now()}-${i}`,
        startDate: startDate.replace(' ', 'T') + 'Z', // Reconvertir en ISO
        endDate: endDate.replace(' ', 'T') + 'Z', // Reconvertir en ISO
        status: 'active' as const,
        createdBy: session.user.id,
        modifiedBy: [{
          userId: session.user.id,
          date: new Date().toISOString(),
          action: 'created' as const
        }]
      }

      generatedTimeSlots.push(timeSlotWithId)
    }

    // Créer les données d'événement pour la DB avec le premier créneau
    const eventData = {
      title: title,
      start_date: firstSlotStartDate,
      end_date: firstSlotEndDate,
      description: description || '',
      type: type?.toLowerCase() || 'other',
      status: 'scheduled' as const,
      room: room || '',
      teacher: session.user.name || '',
      class_name: className || classes?.[0] || '',
      participants: [],
      equipment_used: (materials || equipment)?.map((m: any) => typeof m === 'string' ? m : m.id || m.name || '') || [],
      chemicals_used: consommables?.map((c: any) => typeof c === 'string' ? c : c.id || c.name || '') || [],
      notes: JSON.stringify({
        timeSlots: generatedTimeSlots,
        actuelTimeSlots: synchronizeActuelTimeSlots({ timeSlots: generatedTimeSlots } as CalendarEvent, generatedTimeSlots)
      }),
      color: '#9c27b0', // Couleur violette pour la physique
      created_by: session.user.id
    }

    const createdEvent = await createPhysicsEvent(eventData)

    // Retourner le format attendu
    const responseEvent = {
      id: createdEvent.id,
      title: createdEvent.title,
      description: createdEvent.description,
      type: createdEvent.type.toUpperCase() === 'TP' ? 'TP' : 
            createdEvent.type.toUpperCase() === 'MAINTENANCE' ? 'MAINTENANCE' :
            createdEvent.type.toUpperCase() === 'INVENTORY' ? 'INVENTORY' : 'OTHER',
      state: 'VALIDATED',
      timeSlots: generatedTimeSlots,
      actuelTimeSlots: synchronizeActuelTimeSlots({ timeSlots: generatedTimeSlots } as CalendarEvent, generatedTimeSlots),
      class: createdEvent.class_name,
      room: createdEvent.room,
      materials: createdEvent.equipment_used?.map((id: any) => ({ id, name: id })) || [],
      chemicals: createdEvent.chemicals_used?.map((id: any) => ({ id, name: id })) || [],
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

// PUT - Mettre à jour un événement de physique avec support multi-créneaux
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, title, description, timeSlots, type, room, class: className, materials, consommables, remarks } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      )
    }

    // Récupérer l'événement existant pour récupérer les TimeSlots actuels
    const existingEvent = await getPhysicsEventById(id)
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Parser les TimeSlots existants depuis les notes
    let existingTimeSlots: TimeSlot[] = []
    try {
      const parsedNotes = JSON.parse(existingEvent.notes || '{}')
      existingTimeSlots = parsedNotes.timeSlots || []
    } catch {
      // Si les notes ne contiennent pas de TimeSlots valides, créer depuis les dates de l'événement
      existingTimeSlots = [{
        id: `${existingEvent.id}-legacy-slot`,
        startDate: new Date(existingEvent.start_date).toISOString(),
        endDate: new Date(existingEvent.end_date).toISOString(),
        status: 'active' as const,
        createdBy: existingEvent.created_by,
        modifiedBy: []
      }]
    }

    // Générer les nouveaux TimeSlots si fournis
    let updatedTimeSlots: TimeSlot[] = existingTimeSlots
    if (timeSlots && timeSlots.length > 0) {
      updatedTimeSlots = timeSlots.map((timeSlot: any, index: number) => {
        let startDate, endDate;
        
        if (timeSlot.startDate && timeSlot.endDate) {
          startDate = timeSlot.startDate
          endDate = timeSlot.endDate
        } else if (timeSlot.date && timeSlot.startTime && timeSlot.endTime) {
          const startDateTime = new Date(`${timeSlot.date}T${timeSlot.startTime}`)
          const endDateTime = new Date(`${timeSlot.date}T${timeSlot.endTime}`)
          startDate = startDateTime.toISOString()
          endDate = endDateTime.toISOString()
        } else {
          return null
        }

        // Conserver l'ID existant si possible, sinon générer un nouveau
        const existingSlot = existingTimeSlots[index]
        return {
          id: existingSlot?.id || `${Date.now()}-${index}`,
          startDate,
          endDate,
          status: timeSlot.status || 'active' as const,
          createdBy: existingSlot?.createdBy || session.user.id,
          modifiedBy: [
            ...(existingSlot?.modifiedBy || []),
            {
              userId: session.user.id,
              date: new Date().toISOString(),
              action: 'modified' as const
            }
          ]
        }
      }).filter(Boolean) as TimeSlot[]
    }

    // Calculer les actuelTimeSlots synchronisés
    const actuelTimeSlots = synchronizeActuelTimeSlots(
      { timeSlots: updatedTimeSlots } as CalendarEvent,
      updatedTimeSlots
    )

    // Préparer les mises à jour de l'événement avec le premier créneau
    const firstSlot = updatedTimeSlots[0]
    const updates: any = {}
    
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (firstSlot) {
      const startDateObj = new Date(firstSlot.startDate)
      const endDateObj = new Date(firstSlot.endDate)
      updates.start_date = startDateObj.toISOString().slice(0, 19).replace('T', ' ')
      updates.end_date = endDateObj.toISOString().slice(0, 19).replace('T', ' ')
    }
    if (type !== undefined) updates.type = type.toLowerCase()
    if (room !== undefined) updates.room = room
    if (className !== undefined) updates.class_name = className
    if (materials !== undefined) {
      updates.equipment_used = JSON.stringify(materials.map((m: any) => typeof m === 'string' ? m : m.id || m.name || ''))
    }
    if (consommables !== undefined) {
      updates.chemicals_used = JSON.stringify(consommables.map((c: any) => typeof c === 'string' ? c : c.id || c.name || ''))
    }
    
    // Mettre à jour les notes avec les TimeSlots synchronisés
    updates.notes = JSON.stringify({
      timeSlots: updatedTimeSlots,
      actuelTimeSlots: actuelTimeSlots,
      originalRemarks: remarks
    })

    const updatedEvent = await updatePhysicsEvent(id, updates)

    // Convertir en format CalendarEvent pour la réponse
    const responseEvent = {
      id: updatedEvent.id,
      title: updatedEvent.title,
      description: updatedEvent.description,
      type: updatedEvent.type.toUpperCase() === 'TP' ? 'TP' : 
            updatedEvent.type.toUpperCase() === 'MAINTENANCE' ? 'MAINTENANCE' :
            (updatedEvent.type.toUpperCase() === 'INVENTORY' ? 'INVENTORY' : 'OTHER'),
      state: 'VALIDATED',
      timeSlots: updatedTimeSlots,
      actuelTimeSlots: actuelTimeSlots,
      class: updatedEvent.class_name,
      room: updatedEvent.room,
      materials: updatedEvent.equipment_used?.map((id: any) => ({ id, name: id })) || [],
      chemicals: updatedEvent.chemicals_used?.map((id: any) => ({ id, name: id })) || [],
      remarks: remarks || '',
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

    await deletePhysicsEvent(id)

    return NextResponse.json({ message: 'Événement supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement de physique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'événement' },
      { status: 500 }
    )
  }
}
