// app/api/calendrier/approve-single-timeslot/route.ts

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
          { error: 'Seul le propriétaire peut approuver les créneaux' },
          { status: 403 }
        )
      }

      // Trouver le créneau proposé
      const proposedSlot = event.timeSlots?.find((slot: any) => slot.id === slotId)
      if (!proposedSlot) {
        return NextResponse.json(
          { error: 'Créneau proposé non trouvé' },
          { status: 404 }
        )
      }

      // Trouver l'index du créneau actuel correspondant (même index)
      const slotIndex = event.timeSlots?.findIndex((slot: any) => slot.id === slotId)
      if (slotIndex === -1) {
        return NextResponse.json(
          { error: 'Index du créneau non trouvé' },
          { status: 404 }
        )
      }

      // Initialiser actuelTimeSlots si nécessaire
      if (!event.actuelTimeSlots) {
        event.actuelTimeSlots = [...(event.timeSlots || [])]
      }

      // Approuver ce créneau spécifique : remplacer dans actuelTimeSlots
      event.actuelTimeSlots[slotIndex] = { ...proposedSlot }

      // Vérifier si tous les créneaux sont maintenant approuvés
      const allApproved = event.timeSlots?.every((proposedSlot: any, index: number) => {
        const actualSlot = event.actuelTimeSlots?.[index]
        return actualSlot && 
               actualSlot.startDate === proposedSlot.startDate &&
               actualSlot.endDate === proposedSlot.endDate &&
               actualSlot.id === proposedSlot.id
      })

      // Mettre à jour le state selon si tout est approuvé ou non
      if (allApproved) {
        event.state = 'VALIDATED'
      } else {
        event.state = 'PENDING'
      }

      event.updatedAt = new Date().toISOString()

      // Sauvegarder
      calendarData.events[eventIndex] = event
      await writeCalendarFile(calendarData)

      return NextResponse.json({
        message: `Créneau approuvé. État: ${event.state}`,
        event: event,
        allApproved
      })

    } catch (error) {
      console.error('Erreur lors de l\'approbation du créneau:', error)
      return NextResponse.json(
        { error: 'Erreur lors de l\'approbation du créneau' },
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
      allApproved: response?.allApproved,
      newState: response?.event?.state,
      actionType: 'APPROVE_SINGLE_TIMESLOT'
    })
  }
)
