// app/api/calendrier/approve-single-timeslot/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withAudit } from '@/lib/api/with-audit'
import { readCalendarFile, writeCalendarFile, migrateEventToNewFormat } from '@/lib/calendar-utils'
import { TimeSlot } from '@/types/calendar'

export const POST = withAudit(
  async (request: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);
      const userId = session?.user?.id;

      if (!userId) {
        return NextResponse.json(
          { error: 'Authentification requise' },
          { status: 401 }
        );
      }

      const body = await request.json();
      const { eventId, slotId } = body;

      if (!eventId || !slotId) {
        return NextResponse.json(
          { error: 'ID de l\'événement et ID du créneau requis' },
          { status: 400 }
        );
      }

      const calendarData = await readCalendarFile();
      const eventIndex = calendarData.events.findIndex((event: any) => event.id === eventId);
      
      if (eventIndex === -1) {
        return NextResponse.json(
          { error: 'Événement non trouvé' },
          { status: 404 }
        );
      }

      const event = calendarData.events[eventIndex].timeSlots 
        ? calendarData.events[eventIndex] 
        : await migrateEventToNewFormat(calendarData.events[eventIndex]);

      const changeDate = new Date().toISOString();

      // Trouver le créneau proposé à approuver
      const proposedSlotIndex = event.timeSlots.findIndex((slot: TimeSlot) => 
        slot.id === slotId && slot.status === 'active'
      );

      if (proposedSlotIndex === -1) {
        return NextResponse.json(
          { error: 'Créneau proposé non trouvé' },
          { status: 404 }
        );
      }

      const proposedSlot = event.timeSlots[proposedSlotIndex];
      let updatedActuelTimeSlots = [...(event.actuelTimeSlots || [])];

      // 1. Si le créneau proposé a un referentActuelTimeID, remplacer le créneau référent
      if (proposedSlot.referentActuelTimeID) {
        const referentIndex = updatedActuelTimeSlots.findIndex(
          (slot: TimeSlot) => slot.id === proposedSlot.referentActuelTimeID
        );
        
        if (referentIndex !== -1) {
          // Remplacer le créneau référent par le nouveau créneau approuvé
          updatedActuelTimeSlots[referentIndex] = {
            ...proposedSlot,
            modifiedBy: [
              ...(proposedSlot.modifiedBy || []),
              {
                userId: userId,
                date: changeDate,
                action: 'modified' as const
              }
            ]
          };
        } else {
          // Le créneau référent n'existe plus, ajouter le nouveau créneau
          updatedActuelTimeSlots.push({
            ...proposedSlot,
            modifiedBy: [
              ...(proposedSlot.modifiedBy || []),
              {
                userId: userId,
                date: changeDate,
                action: 'created' as const
              }
            ]
          });
        }
      } else {
        // Nouveau créneau sans référence, l'ajouter à actuelTimeSlots
        updatedActuelTimeSlots.push({
          ...proposedSlot,
          modifiedBy: [
            ...(proposedSlot.modifiedBy || []),
            {
              userId: userId,
              date: changeDate,
              action: 'created' as const
            }
          ]
        });
      }

      // 2. Marquer le créneau proposé comme approuvé dans timeSlots
      const updatedTimeSlots = [...event.timeSlots];
      updatedTimeSlots[proposedSlotIndex] = {
        ...proposedSlot,
        modifiedBy: [
          ...(proposedSlot.modifiedBy || []),
          {
            userId: userId,
            date: changeDate,
            action: 'modified' as const
          }
        ]
      };

      // 3. Vérifier s'il y a encore des créneaux en attente d'approbation
      const remainingPendingSlots = updatedTimeSlots.filter(
        (slot: TimeSlot) => slot.status === 'active' && slot.id !== slotId
      );

      // 4. Déterminer l'état final
      let finalState = event.state;
      if (remainingPendingSlots.length === 0) {
        // Plus de créneaux en attente, passer à VALIDATED
        finalState = 'VALIDATED';
      }

      // 5. Mettre à jour l'événement
      const updatedEvent = {
        ...event,
        timeSlots: updatedTimeSlots,
        actuelTimeSlots: updatedActuelTimeSlots,
        state: finalState,
        updatedAt: changeDate
      };

      calendarData.events[eventIndex] = updatedEvent;
      await writeCalendarFile(calendarData);

      console.log(`Créneau ${slotId} approuvé pour l'événement ${eventId} par ${session?.user?.email || userId}`);
      console.log(`État final de l'événement: ${finalState}`);
      console.log(`Créneaux actuelTimeSlots: ${updatedActuelTimeSlots.length}`);

      return NextResponse.json({
        event: updatedEvent,
        message: 'Créneau approuvé avec succès',
        finalState,
        totalSlots: updatedActuelTimeSlots.length,
        pendingSlots: remainingPendingSlots.length
      });

    } catch (error) {
      console.error('Erreur lors de l\'approbation du créneau:', error);
      return NextResponse.json(
        { error: 'Erreur serveur interne' },
        { status: 500 }
      );
    }
  },
  {
    module: 'CALENDAR',
    entity: 'timeslot_approve',
    action: 'APPROVE_SINGLE',
    extractEntityIdFromResponse: (response) => response?.event?.id,
    extractEntityId: (req) => {
      // Pour les requêtes POST, l'ID sera extrait de la réponse
      return undefined;
    },
    customDetails: (req, response) => ({
      slotId: response?.slotId || 'unknown',
      finalState: response?.finalState,
      totalSlots: response?.totalSlots,
      pendingSlots: response?.pendingSlots
    })
  }
);