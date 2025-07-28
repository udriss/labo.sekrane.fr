// app/api/calendrier/reject-single-timeslot/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readCalendarFile, writeCalendarFile, migrateEventToNewFormat } from '@/lib/calendar-utils'
import { withAudit } from '@/lib/api/with-audit'

export const POST = withAudit(
  async (request: NextRequest) => {
    try {
      const session = await getServerSession(authOptions)
      const userId = session?.user?.id

      if (!userId) {
        return NextResponse.json(
          { error: 'Non authentifié' },
          { status: 401 }
        )
      }

      const { eventId, slotId } = await request.json()

      if (!eventId || !slotId) {
        return NextResponse.json(
          { error: 'ID de l\'événement et ID du créneau requis' },
          { status: 400 }
        )
      }

      const calendarData = await readCalendarFile()
      const eventIndex = calendarData.events.findIndex((event: any) => event.id === eventId)

      if (eventIndex === -1) {
        return NextResponse.json(
          { error: 'Événement non trouvé' },
          { status: 404 }
        )
      }

      let event = calendarData.events[eventIndex]
      
      // Migrer vers le nouveau format si nécessaire
      if (!event.timeSlots) {
        event = await migrateEventToNewFormat(event)
      }

      // Vérifier que l'utilisateur est le propriétaire
      if (event.createdBy !== userId) {
        return NextResponse.json(
          { error: 'Seul le propriétaire peut rejeter les créneaux' },
          { status: 403 }
        )
      }

      // Trouver l'index du créneau
      const slotIndex = event.timeSlots?.findIndex((slot: any) => slot.id === slotId)
      if (slotIndex === -1) {
        return NextResponse.json(
          { error: 'Créneau non trouvé' },
          { status: 404 }
        )
      }

      // Initialiser actuelTimeSlots si nécessaire
      if (!event.actuelTimeSlots) {
        event.actuelTimeSlots = [...(event.timeSlots || [])]
      }

      // Rejeter ce créneau spécifique : restaurer le créneau proposé à partir d'actuelTimeSlots
      const actualSlot = event.actuelTimeSlots[slotIndex]
      if (actualSlot) {
        event.timeSlots[slotIndex] = { ...actualSlot }
      }

      // Vérifier si tous les créneaux sont maintenant identiques (aucun changement en attente)
      const allIdentical = event.timeSlots?.every((proposedSlot: any, index: number) => {
        const actualSlot = event.actuelTimeSlots?.[index]
        return actualSlot && 
               actualSlot.startDate === proposedSlot.startDate &&
               actualSlot.endDate === proposedSlot.endDate &&
               actualSlot.id === proposedSlot.id
      })

      // Si tout est maintenant identique, remettre l'état à VALIDATED
      if (allIdentical) {
        event.state = 'VALIDATED'
      } else {
        event.state = 'PENDING'
      }

      event.updatedAt = new Date().toISOString()

      // Sauvegarder
      calendarData.events[eventIndex] = event
      await writeCalendarFile(calendarData)

      return NextResponse.json({
        message: `Créneau rejeté. État: ${event.state}`,
        event: event,
        allIdentical
      })

    } catch (error) {
      console.error('Erreur lors du rejet du créneau:', error)
      return NextResponse.json(
        { error: 'Erreur lors du rejet du créneau' },
        { status: 500 }
      )
    }
  },
  {
    module: 'CALENDAR',
    entity: 'event',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.event?.id,
    customDetails: (req, response) => ({
      eventTitle: response?.event?.title,
      allIdentical: response?.allIdentical,
      newState: response?.event?.state,
      actionType: 'REJECT_SINGLE_TIMESLOT'
    })
  }
)
