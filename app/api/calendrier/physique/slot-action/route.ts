// app/api/calendrier/physique/slot-action/route.ts
// API pour les actions sur créneaux individuels

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPhysicsEventByIdWithTimeSlots, updatePhysicsEventWithTimeSlots } from '@/lib/calendar-utils-timeslots'
import { CalendarEvent, TimeSlot } from '@/types/calendar'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { eventId, slotId, action, reason, proposedTimeSlots } = body

    if (!eventId || !slotId || !action) {
      return NextResponse.json(
        { error: 'eventId, slotId et action sont requis' },
        { status: 400 }
      )
    }

    if (!['VALIDATE', 'CANCEL', 'MOVE'].includes(action)) {
      return NextResponse.json(
        { error: 'Action non supportée. Utilisez VALIDATE, CANCEL ou MOVE' },
        { status: 400 }
      )
    }

    // Lire l'événement
    const event = await getPhysicsEventByIdWithTimeSlots(eventId)
    
    if (!event) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()
    const operatorName = session.user.name || session.user.email || 'Opérateur'

    // Fonction pour trouver et modifier un créneau
    const updateSlotInArray = (slots: TimeSlot[] | undefined): TimeSlot[] => {
      if (!slots) return []
      
      let updatedSlots = slots.map(slot => {
        if (slot.id === slotId) {
          const updatedSlot = { ...slot }
          
          switch (action) {
            case 'VALIDATE':
              updatedSlot.status = 'active'
              break
            case 'CANCEL':
              updatedSlot.status = 'deleted'
              break
            case 'MOVE':
              updatedSlot.status = 'deleted'
              break
          }
          
          // Ajouter l'historique de modification
          if (!updatedSlot.modifiedBy) {
            updatedSlot.modifiedBy = []
          }
          updatedSlot.modifiedBy.push({
            userId: session.user.id,
            date: now,
            action: action === 'VALIDATE' ? 'approved' : 'deleted',
            note: reason || `Créneau ${action === 'VALIDATE' ? 'validé' : action === 'CANCEL' ? 'annulé' : 'déplacé'} par ${operatorName}`
          })
          
          return updatedSlot
        }
        return slot
      })

      // Si action MOVE, ajouter les nouveaux créneaux
      if (action === 'MOVE' && proposedTimeSlots && proposedTimeSlots.length > 0) {
        const newSlots = proposedTimeSlots.map((newSlot: any, index: number) => ({
          id: `OP_${Date.now()}_${index}_${slotId}`,
          startDate: newSlot.startDate,
          endDate: newSlot.endDate,
          status: 'active' as const,
          createdBy: session.user.id,
          modifiedBy: [{
            userId: session.user.id,
            date: now,
            action: 'created' as const,
            note: `Nouveau créneau proposé par ${operatorName} pour remplacer ${slotId}`
          }]
        }))
        
        updatedSlots = [...updatedSlots, ...newSlots]
      }

      return updatedSlots
    }

    // Mettre à jour le créneau dans timeSlots et actuelTimeSlots
    const updatedTimeSlots = updateSlotInArray(event.timeSlots)
    const updatedActuelTimeSlots = updateSlotInArray(event.actuelTimeSlots)

    // Déterminer le validationState selon l'action
    // Si VALIDATE -> noPending (validation terminée)
    // Sinon -> ownerPending (car seuls les opérateurs accèdent à cette API)
    const validationState = action === 'VALIDATE' ? 'noPending' : 'ownerPending'

    // Ajouter l'historique des changements d'état
    const lastStateChange = {
      from: event.state || 'PENDING',
      to: event.state || 'PENDING', 
      date: now,
      userId: session.user.id,
      reason: reason || `Action ${action} sur créneau ${slotId} par ${operatorName}`
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      timeSlots: updatedTimeSlots,
      actuelTimeSlots: updatedActuelTimeSlots,
      lastStateChange,
      validationState
    }

    // Sauvegarder les modifications
    const updatedEvent = await updatePhysicsEventWithTimeSlots(eventId, updateData)

    return NextResponse.json({
      success: true,
      message: `Créneau ${action === 'VALIDATE' ? 'validé' : action === 'CANCEL' ? 'annulé' : 'déplacé'} avec succès`,
      event: updatedEvent,
      slotId
    })

  } catch (error) {
    console.error('Erreur lors de l\'action sur le créneau:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}