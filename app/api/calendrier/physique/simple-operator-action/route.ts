// app/api/calendrier/physique/simple-operator-action/route.ts
// API simplifiée pour les actions d'opérateur en physique

import { NextRequest, NextResponse } from 'next/server'
import { getPhysicsEventByIdWithTimeSlots, updatePhysicsEventWithTimeSlots } from '@/lib/calendar-utils-timeslots'
import { CalendarEvent, TimeSlot } from '@/types/calendar'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, action, reason, proposedTimeSlots } = body

    if (!eventId || !action) {
      return NextResponse.json(
        { error: 'eventId et action sont requis' },
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
    
    // Préparer les données de mise à jour
    // Note: updated_at sera géré automatiquement par MySQL
    let updateData: any = {}

    switch (action) {
      case 'VALIDATE':
        // Valider l'événement : utiliser les timeSlots proposés comme actuelTimeSlots
        updateData.state = 'VALIDATED'
        updateData.validationState = 'noPending' // Plus de validation en attente
        updateData.actuelTimeSlots = [...(event.timeSlots || [])]
        updateData.lastStateChange = {
          from: event.state || 'PENDING',
          to: 'VALIDATED',
          date: now,
          userId: 'operator',
          reason: reason || 'Événement validé par l\'opérateur'
        }
        break

      case 'CANCEL':
        // Annuler l'événement
        updateData.state = 'CANCELLED'
        updateData.validationState = 'noPending' // Plus de validation en attente
        // Marquer tous les créneaux comme 'deleted'
        if (event.timeSlots) {
          updateData.timeSlots = event.timeSlots.map(slot => ({
            ...slot,
            status: 'deleted' as const
          }))
        }
        if (event.actuelTimeSlots) {
          updateData.actuelTimeSlots = event.actuelTimeSlots.map(slot => ({
            ...slot,
            status: 'deleted' as const
          }))
        }
        updateData.lastStateChange = {
          from: event.state || 'PENDING',
          to: 'CANCELLED',
          date: now,
          userId: 'operator',
          reason: reason || 'Événement annulé par l\'opérateur'
        }
        break

      case 'MOVE':
        if (!proposedTimeSlots || proposedTimeSlots.length === 0) {
          return NextResponse.json(
            { error: 'Des créneaux proposés sont requis pour déplacer un événement' },
            { status: 400 }
          )
        }

        // Déplacer l'événement : garder les timeSlots originaux et créer de nouveaux actuelTimeSlots
        updateData.state = 'MOVED'
        
        // Créer les nouveaux créneaux
        const newTimeSlots: TimeSlot[] = proposedTimeSlots.map((slot: any, index: number) => ({
          id: `moved-${Date.now()}-${index}`,
          startDate: slot.startDate,
          endDate: slot.endDate,
          status: 'active' as const,
          createdBy: 'operator',
          modifiedBy: [{
            userId: 'operator',
            date: now,
            action: 'created' as const,
            note: reason || 'Événement déplacé par l\'opérateur'
          }]
        }))

        updateData.actuelTimeSlots = newTimeSlots
        updateData.lastStateChange = {
          from: event.state || 'PENDING',
          to: 'MOVED',
          date: now,
          userId: 'operator',
          reason: reason || 'Événement déplacé par l\'opérateur'
        }
        break

      default:
        return NextResponse.json(
          { error: `Action non supportée: ${action}` },
          { status: 400 }
        )
    }

    // Sauvegarder les modifications
    const updatedEvent = await updatePhysicsEventWithTimeSlots(eventId, updateData)

    const successMessage = {
      'VALIDATE': 'Événement validé avec succès',
      'CANCEL': 'Événement annulé avec succès',
      'MOVE': 'Événement déplacé avec succès'
    }[action as 'VALIDATE' | 'CANCEL' | 'MOVE']

    return NextResponse.json({
      success: true,
      message: successMessage,
      event: updatedEvent
    })

  } catch (error) {
    console.error('Erreur lors de l\'action d\'opérateur:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
