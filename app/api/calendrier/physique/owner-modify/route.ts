// app/api/calendrier/physique/owner-modify/route.ts
// API pour les modifications d'événements par l'owner en physique (état PENDING après modification)

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
    const { eventId, action, reason, proposedTimeSlots, slotId } = body

    if (!eventId || !action) {
      return NextResponse.json(
        { error: 'ID d\'événement et action requis' },
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

    // Vérifier que l'utilisateur est bien l'owner
    const isOwner = existingEvent.created_by === session.user.id || 
                   existingEvent.created_by === session.user.email

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Seul le propriétaire peut effectuer cette action' },
        { status: 403 }
      )
    }

    const currentDate = new Date().toISOString()
    const ownerName = session.user.name || session.user.email || 'Propriétaire'

    let updateData: any = {}

    switch (action) {
      case 'GLOBAL_MODIFY':
        // Modification globale par l'owner - état devient PENDING
        if (!proposedTimeSlots || proposedTimeSlots.length === 0) {
          return NextResponse.json(
            { error: 'Nouveaux créneaux requis pour la modification' },
            { status: 400 }
          )
        }

        updateData.state = 'PENDING'
        updateData.stateChangeReason = reason || 'Modifications apportées par le propriétaire'
        updateData.validationState = 'ownerPending' // L'owner a modifié, maintenant il doit valider
        
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
              note: 'Remplacé par modifications du propriétaire'
            }
          ]
        })) || []
        
        // Créer les nouveaux créneaux
        const newTimeSlots = proposedTimeSlots.map((slot: any, index: number) => ({
          id: `OWNER_${Date.now()}_${index}`,
          startDate: slot.startDate,
          endDate: slot.endDate,
          status: 'active' as const,
          createdBy: session.user.id,
          modifiedBy: [{
            userId: session.user.id,
            date: currentDate,
            action: 'created' as const,
            note: `Nouveau créneau créé par le propriétaire ${ownerName}`
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

      case 'SLOT_MODIFY':
        // Modification d'un créneau spécifique par l'owner
        if (!slotId) {
          return NextResponse.json(
            { error: 'ID de créneau requis pour la modification spécifique' },
            { status: 400 }
          )
        }

        updateData.state = 'PENDING'
        updateData.stateChangeReason = reason || `Créneau ${slotId} modifié par le propriétaire`
        updateData.validationState = 'ownerPending' // L'owner a modifié, maintenant il doit valider
        
        let updatedTimeSlots = [...(existingEvent.timeSlots || [])]
        
        if (proposedTimeSlots && proposedTimeSlots.length > 0) {
          // Marquer l'ancien créneau comme supprimé et ajouter le nouveau
          updatedTimeSlots = updatedTimeSlots.map(slot => {
            if (slot.id === slotId) {
              return {
                ...slot,
                status: 'deleted' as const,
                modifiedBy: [
                  ...(slot.modifiedBy || []),
                  {
                    userId: session.user.id,
                    date: currentDate,
                    action: 'deleted' as const,
                    note: `Remplacé par le propriétaire ${ownerName}`
                  }
                ]
              }
            }
            return slot
          })
          
          // Ajouter le nouveau créneau
          const newSlot = proposedTimeSlots[0]
          updatedTimeSlots.push({
            id: `OWNER_${Date.now()}_${slotId}`,
            startDate: newSlot.startDate,
            endDate: newSlot.endDate,
            status: 'active' as const,
            createdBy: session.user.id,
            modifiedBy: [{
              userId: session.user.id,
              date: currentDate,
              action: 'created' as const,
              note: `Créneau de remplacement créé par le propriétaire ${ownerName}`
            }]
          })
        } else {
          // Juste supprimer le créneau
          updatedTimeSlots = updatedTimeSlots.map(slot => {
            if (slot.id === slotId) {
              return {
                ...slot,
                status: 'deleted' as const,
                modifiedBy: [
                  ...(slot.modifiedBy || []),
                  {
                    userId: session.user.id,
                    date: currentDate,
                    action: 'deleted' as const,
                    note: `Supprimé par le propriétaire ${ownerName}`
                  }
                ]
              }
            }
            return slot
          })
        }
        
        updateData.timeSlots = updatedTimeSlots
        updateData.actuelTimeSlots = updatedTimeSlots.filter(slot => slot.status === 'active')
        break

      default:
        return NextResponse.json(
          { error: 'Action non supportée' },
          { status: 400 }
        )
    }

    // Ajouter l'historique de changement d'état
    updateData.lastStateChange = {
      from: existingEvent.state,
      to: updateData.state,
      date: currentDate,
      userId: session.user.id,
      reason: `Modifications par le propriétaire: ${reason || `Action ${action} par ${ownerName}`}`
    }

    // Effectuer la mise à jour
    const updatedEvent = await updatePhysicsEventWithTimeSlots(eventId, updateData)

    return NextResponse.json({
      success: true,
      message: 'Modifications apportées, événement en attente de validation',
      event: updatedEvent
    })

  } catch (error) {
    console.error('Erreur lors de la modification par l\'owner:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la modification' },
      { status: 500 }
    )
  }
}
