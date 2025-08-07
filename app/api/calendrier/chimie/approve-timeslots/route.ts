// app/api/calendrier/chimie/approve-timeslots/route.ts
// API pour approuver des créneaux horaires (TimeSlots) - Version Chimie

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
    const { eventId, timeslotIds, approvalNote } = body

    console.log('[[[[[[[[[[{{{{{{{{{API}}}}}}}}}]]]]]]]]]]:', body)
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

    // Vérifier que l'utilisateur est le créateur de l'événement (seul le créateur peut approuver)
    if (existingEvent.createdBy !== session.user.id && 
        existingEvent.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: 'Seul le créateur de l\'événement peut approuver les créneaux' },
        { status: 403 }
      )
    }

    // Traiter les TimeSlots pour approbation
    const currentTimeSlots = existingEvent.timeSlots || []
    const currentActuelTimeSlots = existingEvent.actuelTimeSlots || []

    // Marquer les créneaux comme approuvés et les ajouter aux créneaux actuels
    const updatedTimeSlots = currentTimeSlots.map(slot => {
      if (timeslotIds.includes(slot.id)) {
        return {
          ...slot,
          status: 'active' as const,
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: session.user.id,
              date: new Date().toISOString(),
              action: 'approved' as const,
              note: approvalNote
            }
          ]
        }
      }
      return slot
    })

    // Ajouter les créneaux approuvés aux créneaux actuels s'ils n'y sont pas déjà
    const approvedSlots = updatedTimeSlots.filter(slot => 
      timeslotIds.includes(slot.id) && slot.status === 'active'
    )

    const updatedActuelTimeSlots = [...currentActuelTimeSlots]
    approvedSlots.forEach(approvedSlot => {
      const existsInActuel = updatedActuelTimeSlots.find(actual => actual.id === approvedSlot.id)
      if (!existsInActuel) {
        updatedActuelTimeSlots.push(approvedSlot)
      }
    })

    // Mettre à jour les dates principales si nécessaire
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
    }

    // Effectuer la mise à jour
    const updatedEvent = await updateChemistryEventWithTimeSlots(eventId, updateData)

    return NextResponse.json({
      success: true,
      message: `${timeslotIds.length} créneau(x) approuvé(s)`,
      approvedSlots: approvedSlots.length,
      event: {
        id: updatedEvent.id,
        timeSlots: updatedEvent.timeSlots,
        actuelTimeSlots: updatedEvent.actuelTimeSlots
      }
    })

  } catch (error) {
    console.error('Erreur lors de l\'approbation des créneaux physique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'approbation des créneaux' },
      { status: 500 }
    )
  }
}
