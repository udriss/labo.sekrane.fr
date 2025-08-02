// app/api/calendrier/physique/approve-timeslots/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPhysicsEventById, updatePhysicsEvent } from '@/lib/calendar-utils'
import { synchronizeActuelTimeSlots } from '@/lib/calendar-slot-utils'
import type { TimeSlot, CalendarEvent } from '@/types/calendar'

// POST - Approuver plusieurs TimeSlots pour un événement de physique
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { eventId, timeSlotIds } = body

    if (!eventId || !timeSlotIds || !Array.isArray(timeSlotIds)) {
      return NextResponse.json(
        { error: 'ID de l\'événement et array d\'IDs de TimeSlots requis' },
        { status: 400 }
      )
    }

    const existingEvent = await getPhysicsEventById(eventId)
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    if (existingEvent.created_by !== session.user.id) {
      return NextResponse.json(
        { error: 'Seul le créateur de l\'événement peut approuver les TimeSlots' },
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

    const timeSlotsToApprove = timeSlots.filter(slot => timeSlotIds.includes(slot.id))
    if (timeSlotsToApprove.length === 0) {
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
          status: 'active' as const,
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: session.user.id,
              date: changeDate,
              action: 'modified' as const
            }
          ]
        }
      } else {
        return {
          ...slot,
          status: 'invalid' as const,
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: session.user.id,
              date: changeDate,
              action: 'invalidated' as const
            }
          ]
        }
      }
    })

    const synchronizedActuelTimeSlots = synchronizeActuelTimeSlots(
      { timeSlots: updatedTimeSlots } as CalendarEvent,
      updatedTimeSlots
    )

    const updates = {
      notes: JSON.stringify({
        timeSlots: updatedTimeSlots,
        actuelTimeSlots: synchronizedActuelTimeSlots,
        originalRemarks: JSON.parse(existingEvent.notes || '{}').originalRemarks || ''
      })
    }

    const updatedEvent = await updatePhysicsEvent(eventId, updates)

    return NextResponse.json({
      success: true,
      message: `${timeSlotIds.length} TimeSlot(s) approuvé(s) avec succès`,
      event: {
        ...updatedEvent,
        timeSlots: updatedTimeSlots,
        actuelTimeSlots: synchronizedActuelTimeSlots
      }
    })

  } catch (error) {
    console.error('Erreur lors de l\'approbation des TimeSlots de physique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'approbation des TimeSlots' },
      { status: 500 }
    )
  }
}
