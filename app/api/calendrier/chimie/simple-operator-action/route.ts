// app/api/calendrier/chimie/simple-operator-action/route.ts
// API simplifiée pour les actions d'opérateur (compatible avec la structure actuelle)

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
    const { eventId, action, reason, proposedTimeSlots } = body

    if (!eventId || !action) {
      return NextResponse.json(
        { error: 'ID d\'événement et action requis' },
        { status: 400 }
      )
    }

    // Validation de l'action
    if (!['VALIDATE', 'CANCEL', 'MOVE'].includes(action)) {
      return NextResponse.json(
        { error: 'Action non valide' },
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

    const currentDate = new Date().toISOString()
    const operatorName = session.user.name || session.user.email || 'Opérateur'

    // Préparer les données de mise à jour selon l'action
    // Note: updated_at sera géré automatiquement par MySQL
    let updateData: any = {}

    switch (action) {
      case 'VALIDATE':
        updateData.state = 'VALIDATED'
        updateData.stateChangeReason = reason || 'Événement validé par l\'opérateur'
        updateData.validationState = 'noPending' // Plus de validation en attente
        
        // Conserver les créneaux actuels (dans timeSlots avec status active)
        // et les synchroniser avec actuelTimeSlots
        const activeSlots = existingEvent.timeSlots?.filter(slot => slot.status === 'active') || []
        if (activeSlots.length > 0) {
          updateData.actuelTimeSlots = activeSlots
          const sortedSlots = activeSlots.sort((a: any, b: any) => 
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          )
          updateData.start_date = sortedSlots[0].startDate
          updateData.end_date = sortedSlots[sortedSlots.length - 1].endDate
        }
        break

      case 'CANCEL':
        updateData.state = 'CANCELLED'
        updateData.stateChangeReason = reason || 'Événement annulé par l\'opérateur'
        updateData.validationState = 'noPending' // Plus de validation en attente
        
        // Marquer tous les timeSlots comme supprimés
        const cancelledTimeSlots = existingEvent.timeSlots?.map(slot => ({
          ...slot,
          status: 'deleted' as const,
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: session.user.id,
              date: currentDate,
              action: 'deleted' as const,
              note: reason || 'Annulé par l\'opérateur'
            }
          ]
        })) || []
        
        updateData.timeSlots = cancelledTimeSlots
        break

      case 'MOVE':
        if (!proposedTimeSlots || proposedTimeSlots.length === 0) {
          return NextResponse.json(
            { error: 'Créneaux proposés requis pour l\'action MOVE' },
            { status: 400 }
          )
        }
        
        updateData.state = 'MOVED'
        updateData.stateChangeReason = reason || 'Nouveaux créneaux proposés par l\'opérateur'
        
        // Marquer les anciens créneaux comme supprimés
        const oldTimeSlots = existingEvent.timeSlots?.map(slot => ({
          ...slot,
          status: 'deleted' as const,
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: session.user.id,
              date: currentDate,
              action: 'deleted' as const,
              note: 'Remplacé par nouveaux créneaux opérateur'
            }
          ]
        })) || []
        
        // Ajouter les nouveaux créneaux proposés
        const newTimeSlots = proposedTimeSlots.map((slot: any, index: number) => ({
          id: `OP_${Date.now()}_${index}`,
          startDate: slot.startDate,
          endDate: slot.endDate,
          status: 'active' as const,
          createdBy: session.user.id,
          modifiedBy: [{
            userId: session.user.id,
            date: currentDate,
            action: 'created' as const,
            note: `Créneau proposé par ${operatorName}`
          }]
        }))
        
        updateData.timeSlots = [...oldTimeSlots, ...newTimeSlots]
        updateData.actuelTimeSlots = newTimeSlots
        
        // Mettre à jour les dates principales
        const sortedNewSlots = newTimeSlots.sort((a: any, b: any) => 
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        )
        updateData.start_date = sortedNewSlots[0].startDate
        updateData.end_date = sortedNewSlots[sortedNewSlots.length - 1].endDate
        break
    }

    // Ajouter l'historique de changement d'état
    updateData.lastStateChange = {
      from: existingEvent.state,
      to: updateData.state,
      date: currentDate,
      userId: session.user.id,
      reason: reason || `Action ${action} par ${operatorName}`
    }

    // Effectuer la mise à jour
    const updatedEvent = await updateChemistryEventWithTimeSlots(eventId, updateData)

    return NextResponse.json({
      success: true,
      message: getActionMessage(action),
      event: updatedEvent
    })

  } catch (error) {
    console.error('Erreur lors de l\'action d\'opérateur:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement de l\'action' },
      { status: 500 }
    )
  }
}

// Messages pour chaque action
function getActionMessage(action: string): string {
  switch (action) {
    case 'VALIDATE':
      return 'Événement validé avec succès'
    case 'CANCEL':
      return 'Événement annulé'
    case 'MOVE':
      return 'Nouveaux créneaux proposés'
    default:
      return 'Action effectuée'
  }
}
