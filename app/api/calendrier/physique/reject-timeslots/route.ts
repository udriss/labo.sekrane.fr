// app/api/calendrier/physique/reject-timeslots/route.ts
// API pour rejeter des créneaux horaires (TimeSlots) - Version Physique

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  getPhysicsEventByIdWithTimeSlots, 
  updatePhysicsEventWithTimeSlots 
} from '@/lib/calendar-utils-timeslots'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { eventId, timeslotIds, rejectionReason } = body

    if (!eventId || !timeslotIds || !Array.isArray(timeslotIds)) {
      return NextResponse.json(
        { error: 'ID d\'événement et liste des créneaux requis' },
        { status: 400 }
      )
    }

    if (!rejectionReason || rejectionReason.trim() === '') {
      return NextResponse.json(
        { error: 'Raison du rejet requise' },
        { status: 400 }
      )
    }

    // Récupérer l'événement existant
    const existingEvent = await getPhysicsEventByIdWithTimeSlots(eventId)
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur est le créateur de l'événement (seul le créateur peut rejeter)
    if (existingEvent.created_by !== session.user.id && 
        existingEvent.created_by !== session.user.email) {
      return NextResponse.json(
        { error: 'Seul le créateur de l\'événement peut rejeter les créneaux' },
        { status: 403 }
      )
    }

    // Traiter les TimeSlots pour rejet
    const currentTimeSlots = existingEvent.timeSlots || []
    const currentActuelTimeSlots = existingEvent.actuelTimeSlots || []

    // Marquer les créneaux comme rejetés (supprimés/invalides)
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
              note: rejectionReason
            }
          ]
        }
      }
      return slot
    })

    // Retirer les créneaux rejetés des créneaux actuels
    const updatedActuelTimeSlots = currentActuelTimeSlots.filter(slot => 
      !timeslotIds.includes(slot.id)
    )

    // Mettre à jour les dates principales basées sur les créneaux actuels restants
    const activeSlots = updatedActuelTimeSlots.filter(slot => slot.status === 'active')
    const updateData: any = {
      timeSlots: updatedTimeSlots,
      actuelTimeSlots: updatedActuelTimeSlots
    }

    if (activeSlots.length > 0) {
      const sortedSlots = activeSlots.sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      )
      updateData.start_date = sortedSlots[0].startDate
      updateData.end_date = sortedSlots[sortedSlots.length - 1].endDate
    } else {
      // Si plus aucun créneau actif, marquer l'événement comme annulé
      updateData.state = 'CANCELLED'
      updateData.stateChangeReason = `Tous les créneaux ont été rejetés: ${rejectionReason}`
      updateData.lastStateChange = {
        from: existingEvent.state || 'VALIDATED',
        to: 'CANCELLED',
        date: new Date().toISOString(),
        userId: session.user.id,
        reason: 'Rejet de tous les créneaux'
      }
    }

    // Effectuer la mise à jour
    const updatedEvent = await updatePhysicsEventWithTimeSlots(eventId, updateData)

    const rejectedSlots = timeslotIds.length

    return NextResponse.json({
      success: true,
      message: `${rejectedSlots} créneau(x) rejeté(s)`,
      rejectedSlots: rejectedSlots,
      remainingActiveSlots: updatedActuelTimeSlots.length,
      eventCancelled: updateData.state === 'CANCELLED',
      event: {
        id: updatedEvent.id,
        state: updatedEvent.state,
        timeSlots: updatedEvent.timeSlots,
        actuelTimeSlots: updatedEvent.actuelTimeSlots
      }
    })

  } catch (error) {
    console.error('Erreur lors du rejet des créneaux physique:', error)
    return NextResponse.json(
      { error: 'Erreur lors du rejet des créneaux' },
      { status: 500 }
    )
  }
}
