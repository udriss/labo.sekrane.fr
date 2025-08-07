// app/api/calendrier/chimie/reject-timeslots/route.ts
// API pour rejeter des créneaux horaires (TimeSlots) - Version Chimie

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  getChemistryEventByIdWithTimeSlots, 
  updateChemistryEventWithTimeSlots 
} from '@/lib/calendar-utils-timeslots'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { eventId, timeslotIds, rejectionNote } = body

    if (!eventId || !timeslotIds || !Array.isArray(timeslotIds)) {
      return NextResponse.json(
        { error: 'ID d\'événement et liste des créneaux requis' },
        { status: 400 }
      )
    }

    // Récupérer l'événement existant
    const existingEvent = await getChemistryEventByIdWithTimeSlots(eventId)
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur est le créateur de l'événement (seul le créateur peut rejeter)
    if (existingEvent.createdBy !== session.user.id && 
        existingEvent.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: 'Seul le créateur de l\'événement peut rejeter les créneaux' },
        { status: 403 }
      )
    }

    // Traiter les TimeSlots pour rejet
    const currentTimeSlots = existingEvent.timeSlots || []

    // Marquer les créneaux comme rejetés/invalides
    const updatedTimeSlots = currentTimeSlots.map(slot => {
      if (timeslotIds.includes(slot.id)) {
        return {
          ...slot,
          status: 'invalid' as const,
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: session.user.id,
              date: new Date().toISOString(),
              action: 'rejected' as const,
              note: rejectionNote || 'Créneau rejeté'
            }
          ]
        }
      }
      return slot
    })

    // Les créneaux actuels restent inchangés lors du rejet
    const updateData: any = {
      timeSlots: updatedTimeSlots,
      actuelTimeSlots: existingEvent.actuelTimeSlots || []
    }

    // Effectuer la mise à jour
    const updatedEvent = await updateChemistryEventWithTimeSlots(eventId, updateData)

    return NextResponse.json({
      success: true,
      message: `${timeslotIds.length} créneau(x) rejeté(s)`,
      rejectedSlots: timeslotIds.length,
      event: {
        id: updatedEvent.id,
        timeSlots: updatedEvent.timeSlots,
        actuelTimeSlots: updatedEvent.actuelTimeSlots
      }
    })

  } catch (error) {
    console.error('Erreur lors du rejet des créneaux chimie:', error)
    return NextResponse.json(
      { error: 'Erreur lors du rejet des créneaux' },
      { status: 500 }
    )
  }
}
