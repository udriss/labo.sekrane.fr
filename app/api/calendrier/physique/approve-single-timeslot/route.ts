// app/api/calendrier/physique/approve-single-timeslot/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPhysicsEventById, updatePhysicsEvent } from '@/lib/calendar-utils'
import { synchronizeActuelTimeSlots } from '@/lib/calendar-slot-utils'
import type { TimeSlot, CalendarEvent } from '@/types/calendar'

// POST - Approuver un seul TimeSlot pour un événement de physique
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { eventId, timeSlotId } = body

    if (!eventId || !timeSlotId) {
      return NextResponse.json(
        { error: 'ID de l\'événement et ID du TimeSlot requis' },
        { status: 400 }
      )
    }

    // Récupérer l'événement existant
    const existingEvent = await getPhysicsEventById(eventId)
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

    // Trouver le TimeSlot à approuver
    const timeSlotToApprove = timeSlots.find(slot => slot.id === timeSlotId)
    if (!timeSlotToApprove) {
      return NextResponse.json(
        { error: 'TimeSlot non trouvé' },
        { status: 404 }
      )
    }

    // Marquer les autres slots avec le même referentActuelTimeID comme invalid
    const updatedTimeSlots = timeSlots.map(slot => {
      if (slot.referentActuelTimeID === timeSlotToApprove.referentActuelTimeID && slot.id !== timeSlotId) {
        return {
          ...slot,
          status: 'invalid' as const,
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: session.user.id,
              date: new Date().toISOString(),
              action: 'invalidated' as const
            }
          ]
        }
      }
      return slot
    })

    // Marquer le slot approuvé comme active
    const approvedSlot: TimeSlot = {
      ...timeSlotToApprove,
      status: 'active' as const,
      modifiedBy: [
        ...(timeSlotToApprove.modifiedBy || []),
        {
          userId: session.user.id,
          date: new Date().toISOString(),
          action: 'modified' as const
        }
      ]
    }

    // Mettre à jour les timeSlots
    const finalTimeSlots = updatedTimeSlots.map(slot => 
      slot.id === timeSlotId ? approvedSlot : slot
    )

    // Mettre à jour ou ajouter aux actuelTimeSlots
    const updatedActuelTimeSlots = actuelTimeSlots.map(slot => 
      slot.referentActuelTimeID === approvedSlot.referentActuelTimeID ? approvedSlot : slot
    )

    // Si pas trouvé dans actuelTimeSlots, l'ajouter
    if (!updatedActuelTimeSlots.some(slot => slot.referentActuelTimeID === approvedSlot.referentActuelTimeID)) {
      updatedActuelTimeSlots.push(approvedSlot)
    }

    // Synchroniser les actuelTimeSlots
    const synchronizedActuelTimeSlots = synchronizeActuelTimeSlots(
      { timeSlots: finalTimeSlots } as CalendarEvent,
      finalTimeSlots
    )

    // Mettre à jour l'événement avec les nouveaux TimeSlots
    const updates = {
      notes: JSON.stringify({
        timeSlots: finalTimeSlots,
        actuelTimeSlots: synchronizedActuelTimeSlots,
        originalRemarks: JSON.parse(existingEvent.notes || '{}').originalRemarks || ''
      })
    }

    const updatedEvent = await updatePhysicsEvent(eventId, updates)

    return NextResponse.json({
      success: true,
      message: 'TimeSlot approuvé avec succès',
      approvedTimeSlot: approvedSlot,
      event: {
        ...updatedEvent,
        timeSlots: finalTimeSlots,
        actuelTimeSlots: synchronizedActuelTimeSlots
      }
    })

  } catch (error) {
    console.error('Erreur lors de l\'approbation du TimeSlot de physique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'approbation du TimeSlot' },
      { status: 500 }
    )
  }
}
