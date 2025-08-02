// app/api/calendrier/chimie/approve-timeslots/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getChemistryEventById, updateChemistryEvent } from '@/lib/calendar-utils'
import { synchronizeActuelTimeSlots } from '@/lib/calendar-slot-utils'
import type { TimeSlot, CalendarEvent } from '@/types/calendar'

// POST - Approuver plusieurs TimeSlots pour un événement de chimie
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

    // Récupérer l'événement existant
    const existingEvent = await getChemistryEventById(eventId)
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur est le créateur de l'événement (owner)
    if (existingEvent.created_by !== session.user.id) {
      return NextResponse.json(
        { error: 'Seul le créateur de l\'événement peut approuver les TimeSlots' },
        { status: 403 }
      )
    }

    // Parser les TimeSlots existants
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

    // Trouver les TimeSlots à approuver
    const timeSlotsToApprove = timeSlots.filter(slot => timeSlotIds.includes(slot.id))
    if (timeSlotsToApprove.length === 0) {
      return NextResponse.json(
        { error: 'Aucun TimeSlot trouvé pour les IDs fournis' },
        { status: 404 }
      )
    }

    const changeDate = new Date().toISOString()

    // Marquer tous les autres slots comme invalid s'ils ne sont pas dans la liste approuvée
    const updatedTimeSlots = timeSlots.map(slot => {
      if (timeSlotIds.includes(slot.id)) {
        // Approuver le slot
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
        // Marquer les autres comme invalid
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

    // Créer les nouveaux actuelTimeSlots avec les slots approuvés
    const approvedSlots = timeSlotsToApprove.map(slot => ({
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
    }))

    // Synchroniser les actuelTimeSlots
    const synchronizedActuelTimeSlots = synchronizeActuelTimeSlots(
      { timeSlots: updatedTimeSlots } as CalendarEvent,
      updatedTimeSlots
    )

    // Mettre à jour l'événement avec les nouveaux TimeSlots
    const updates = {
      notes: JSON.stringify({
        timeSlots: updatedTimeSlots,
        actuelTimeSlots: synchronizedActuelTimeSlots,
        originalRemarks: JSON.parse(existingEvent.notes || '{}').originalRemarks || ''
      })
    }

    const updatedEvent = await updateChemistryEvent(eventId, updates)

    return NextResponse.json({
      success: true,
      message: `${timeSlotIds.length} TimeSlot(s) approuvé(s) avec succès`,
      approvedTimeSlots: approvedSlots,
      event: {
        ...updatedEvent,
        timeSlots: updatedTimeSlots,
        actuelTimeSlots: synchronizedActuelTimeSlots
      }
    })

  } catch (error) {
    console.error('Erreur lors de l\'approbation des TimeSlots de chimie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'approbation des TimeSlots' },
      { status: 500 }
    )
  }
}
