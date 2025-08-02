// app/api/calendrier/chimie/reject-single-timeslot/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getChemistryEventById, updateChemistryEvent } from '@/lib/calendar-utils'
import { synchronizeActuelTimeSlots } from '@/lib/calendar-slot-utils'
import type { TimeSlot, CalendarEvent } from '@/types/calendar'

// POST - Rejeter un seul TimeSlot pour un événement de chimie
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { eventId, timeSlotId, reason } = body

    if (!eventId || !timeSlotId) {
      return NextResponse.json(
        { error: 'ID de l\'événement et ID du TimeSlot requis' },
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
        { error: 'Seul le créateur de l\'événement peut rejeter les TimeSlots' },
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

    // Trouver le TimeSlot à rejeter
    const timeSlotToReject = timeSlots.find(slot => slot.id === timeSlotId)
    if (!timeSlotToReject) {
      return NextResponse.json(
        { error: 'TimeSlot non trouvé' },
        { status: 404 }
      )
    }

    // Marquer le slot comme deleted
    const rejectedSlot: TimeSlot = {
      ...timeSlotToReject,
      status: 'deleted' as const,
      modifiedBy: [
        ...(timeSlotToReject.modifiedBy || []),
        {
          userId: session.user.id,
          date: new Date().toISOString(),
          action: 'deleted' as const
        }
      ]
    }

    // Mettre à jour les timeSlots
    const updatedTimeSlots = timeSlots.map(slot => 
      slot.id === timeSlotId ? rejectedSlot : slot
    )

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
        originalRemarks: JSON.parse(existingEvent.notes || '{}').originalRemarks || '',
        rejectionReason: reason || 'Aucune raison fournie'
      })
    }

    const updatedEvent = await updateChemistryEvent(eventId, updates)

    return NextResponse.json({
      success: true,
      message: 'TimeSlot rejeté avec succès',
      rejectedTimeSlot: rejectedSlot,
      event: {
        ...updatedEvent,
        timeSlots: updatedTimeSlots,
        actuelTimeSlots: synchronizedActuelTimeSlots
      }
    })

  } catch (error) {
    console.error('Erreur lors du rejet du TimeSlot de chimie:', error)
    return NextResponse.json(
      { error: 'Erreur lors du rejet du TimeSlot' },
      { status: 500 }
    )
  }
}
