// app/api/calendrier/chimie/reject-timeslots/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getChemistryEventById, updateChemistryEvent } from '@/lib/calendar-utils'
import { synchronizeActuelTimeSlots } from '@/lib/calendar-slot-utils'
import type { TimeSlot, CalendarEvent } from '@/types/calendar'

// POST - Rejeter plusieurs TimeSlots pour un événement de chimie
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { eventId, timeSlotIds, reason } = body

    if (!eventId || !timeSlotIds || !Array.isArray(timeSlotIds)) {
      return NextResponse.json(
        { error: 'ID de l\'événement et array d\'IDs de TimeSlots requis' },
        { status: 400 }
      )
    }

    const existingEvent = await getChemistryEventById(eventId)
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    if (existingEvent.created_by !== session.user.id) {
      return NextResponse.json(
        { error: 'Seul le créateur de l\'événement peut rejeter les TimeSlots' },
        { status: 403 }
      )
    }

    let timeSlots: TimeSlot[] = []
    let actuelTimeSlots: TimeSlot[] = []
    
    try {
      const parsedNotes = JSON.parse(existingEvent.notes || '{}')
      timeSlots = parsedNotes.timeSlots || []
      actuelTimeSlots = parsedNotes.actuelTimeSlots || []
    } catch {
      return NextResponse.json(
        { error: 'Structure TimeSlots invalide dans les notes' },
        { status: 400 }
      )
    }

    const timeSlotsToReject = timeSlots.filter(slot => timeSlotIds.includes(slot.id))
    if (timeSlotsToReject.length === 0) {
      return NextResponse.json(
        { error: 'Aucun TimeSlot trouvé pour les IDs fournis' },
        { status: 404 }
      )
    }

    const changeDate = new Date().toISOString()

    const updatedTimeSlots = timeSlots.map(slot => {
      if (timeSlotIds.includes(slot.id)) {
        return {
          ...slot,
          status: 'deleted' as const,
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: session.user.id,
              date: changeDate,
              action: 'deleted' as const
            }
          ]
        }
      }
      return slot
    })

    const synchronizedActuelTimeSlots = synchronizeActuelTimeSlots(
      { timeSlots: updatedTimeSlots } as CalendarEvent,
      updatedTimeSlots
    )

    const updates = {
      notes: JSON.stringify({
        timeSlots: updatedTimeSlots,
        actuelTimeSlots: synchronizedActuelTimeSlots,
        originalRemarks: JSON.parse(existingEvent.notes || '{}').originalRemarks || '',
        rejectionReason: reason || 'Aucune raison fournie'
      })
    }

    const updatedEvent = await updateChemistryEvent(eventId, updates)

    const rejectedSlots = timeSlotsToReject.map(slot => ({
      ...slot,
      status: 'deleted' as const,
      modifiedBy: [
        ...(slot.modifiedBy || []),
        {
          userId: session.user.id,
          date: changeDate,
          action: 'deleted' as const
        }
      ]
    }))

    return NextResponse.json({
      success: true,
      message: `${timeSlotIds.length} TimeSlot(s) rejeté(s) avec succès`,
      rejectedTimeSlots: rejectedSlots,
      event: {
        ...updatedEvent,
        timeSlots: updatedTimeSlots,
        actuelTimeSlots: synchronizedActuelTimeSlots
      }
    })

  } catch (error) {
    console.error('Erreur lors du rejet des TimeSlots de chimie:', error)
    return NextResponse.json(
      { error: 'Erreur lors du rejet des TimeSlots' },
      { status: 500 }
    )
  }
}
