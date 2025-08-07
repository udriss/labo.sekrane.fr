// app/api/calendrier/chimie/owner-validation/route.ts
// API pour la validation des modifications par l'owner

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
    const { eventId, action, reason, modifications, targetState } = body

    if (!eventId || !action) {
      return NextResponse.json(
        { error: 'ID d\'événement et action requis' },
        { status: 400 }
      )
    }

    // Validation de l'action
    if (!['APPROVE_CHANGES', 'REJECT_CHANGES', 'OWNER_MODIFY'].includes(action)) {
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

    // Vérifier que l'utilisateur est bien l'owner
    const isOwner = existingEvent.createdBy === session.user.email || 
                   existingEvent.createdBy === session.user.id
    
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Seul le propriétaire de l\'événement peut valider les modifications' },
        { status: 403 }
      )
    }

    const currentDate = new Date().toISOString()
    const ownerName = session.user.name || session.user.email || 'Owner'

    // Préparer les données de mise à jour selon l'action
    let updateData: any = {}

    switch (action) {
      case 'APPROVE_CHANGES':
        // Approuver les modifications : passer en VALIDATED
        updateData.state = 'VALIDATED'
        updateData.stateChangeReason = reason || 'Modifications approuvées par l\'owner'
        
        // Marquer tous les créneaux comme validés dans l'historique
        if (existingEvent.timeSlots) {
          updateData.timeSlots = existingEvent.timeSlots.map(slot => ({
            ...slot,
            modifiedBy: [
              ...(slot.modifiedBy || []),
              {
                userId: session.user.id,
                date: currentDate,
                action: 'approved' as const,
                note: `Validé par ${ownerName}`
              }
            ]
          }))
        }
        break

      case 'REJECT_CHANGES':
        // Rejeter les modifications : remettre en PENDING pour l'opérateur
        updateData.state = 'PENDING'
        updateData.stateChangeReason = reason || 'Modifications rejetées par l\'owner, à reprendre'
        
        // Marquer les créneaux comme rejetés
        if (existingEvent.timeSlots) {
          updateData.timeSlots = existingEvent.timeSlots.map(slot => ({
            ...slot,
            modifiedBy: [
              ...(slot.modifiedBy || []),
              {
                userId: session.user.id,
                date: currentDate,
                action: 'rejected' as const,
                note: `Rejeté par ${ownerName}: ${reason || 'Modifications non acceptées'}`
              }
            ]
          }))
        }
        break

      case 'OWNER_MODIFY':
        // Owner modifie lui-même : appliquer les modifications et remettre en PENDING
        updateData.state = 'PENDING'
        updateData.stateChangeReason = reason || 'Modifié par l\'owner'
        
        // Appliquer les modifications si fournies
        if (modifications && existingEvent.timeSlots) {
          let updatedTimeSlots = [...existingEvent.timeSlots]
          
          Object.entries(modifications).forEach(([slotId, modification]: [string, any]) => {
            updatedTimeSlots = updatedTimeSlots.map(slot => {
              if (slot.id === slotId) {
                switch (modification.action) {
                  case 'modify':
                    if (modification.newSlot) {
                      return {
                        ...slot,
                        startDate: `${modification.newSlot.date}T${modification.newSlot.startTime}:00.000Z`,
                        endDate: `${modification.newSlot.date}T${modification.newSlot.endTime}:00.000Z`,
                        modifiedBy: [
                          ...(slot.modifiedBy || []),
                          {
                            userId: session.user.id,
                            date: currentDate,
                            action: 'modified' as const,
                            note: `Modifié par ${ownerName}`
                          }
                        ]
                      }
                    }
                    break
                  case 'remove':
                    return {
                      ...slot,
                      status: 'deleted' as const,
                      modifiedBy: [
                        ...(slot.modifiedBy || []),
                        {
                          userId: session.user.id,
                          date: currentDate,
                          action: 'deleted' as const,
                          note: `Supprimé par ${ownerName}`
                        }
                      ]
                    }
                  case 'keep':
                  default:
                    return slot
                }
              }
              return slot
            })
          })
          
          updateData.timeSlots = updatedTimeSlots
        }
        break
    }

    // Ajouter l'historique de changement d'état
    updateData.lastStateChange = {
      from: existingEvent.state,
      to: updateData.state,
      date: currentDate,
      userId: session.user.id,
      reason: reason || `Action ${action} par ${ownerName}`
    }

    // Effectuer la mise à jour
    const updatedEvent = await updateChemistryEventWithTimeSlots(eventId, updateData)

    return NextResponse.json({
      success: true,
      message: getValidationMessage(action),
      event: updatedEvent
    })

  } catch (error) {
    console.error('Erreur lors de la validation owner:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la validation' },
      { status: 500 }
    )
  }
}

// Messages pour chaque action de validation
function getValidationMessage(action: string): string {
  switch (action) {
    case 'APPROVE_CHANGES':
      return 'Modifications approuvées avec succès'
    case 'REJECT_CHANGES':
      return 'Modifications rejetées, événement renvoyé à l\'opérateur'
    case 'OWNER_MODIFY':
      return 'Vos modifications ont été appliquées'
    default:
      return 'Validation effectuée'
  }
}
