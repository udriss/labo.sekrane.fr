// app/api/calendrier/reject-single-timeslot/route.ts

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

      // Trouver le créneau proposé à rejeter
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

      // 1. Invalider le créneau proposé
      const updatedTimeSlots = [...event.timeSlots];
      updatedTimeSlots[proposedSlotIndex] = {
        ...proposedSlot,
        status: 'invalid' as const,
        modifiedBy: [
          ...(proposedSlot.modifiedBy || []),
          {
            userId: userId,
            date: changeDate,
            action: 'invalidated' as const
          }
        ]
      };

      // 2. Si le créneau proposé a un referentActuelTimeID, invalider aussi le créneau référent dans actuelTimeSlots
      let updatedActuelTimeSlots = event.actuelTimeSlots || [];
      
      if (proposedSlot.referentActuelTimeID) {
        updatedActuelTimeSlots = updatedActuelTimeSlots.map((actualSlot: TimeSlot) => {
          if (actualSlot.id === proposedSlot.referentActuelTimeID) {
            return {
              ...actualSlot,
              status: 'invalid' as const,
              modifiedBy: [
                ...(actualSlot.modifiedBy || []),
                {
                  userId: userId,
                  date: changeDate,
                  action: 'invalidated' as const
                }
              ]
            };
          }
          return actualSlot;
        });
      }

      // 3. Vérifier s'il reste des créneaux valides dans actuelTimeSlots
      const remainingValidActuelSlots = updatedActuelTimeSlots.filter(
        (slot: TimeSlot) => slot.status === 'active'
      );

      let finalState = event.state;
      let finalActuelTimeSlots = updatedActuelTimeSlots;

      if (remainingValidActuelSlots.length === 0) {
        // Aucun créneau valide restant -> annuler complètement l'événement
        finalState = 'CANCELLED';
        finalActuelTimeSlots = []; // Vider actuelTimeSlots
      } else {
        // Il reste des créneaux valides -> garder seulement ceux-ci
        finalActuelTimeSlots = remainingValidActuelSlots;
        
        // Si au moins un créneau reste validé, passer l'état à VALIDATED
        if (finalState !== 'VALIDATED') {
          finalState = 'VALIDATED';
        }
      }

      // 4. Transférer les créneaux invalidés d'actuelTimeSlots vers timeSlots pour l'historique
      const invalidatedActuelSlots = updatedActuelTimeSlots.filter(
        (slot: TimeSlot) => slot.status === 'invalid'
      );

      // Ajouter les créneaux invalidés d'actuelTimeSlots à timeSlots s'ils n'y sont pas déjà
      invalidatedActuelSlots.forEach((invalidatedSlot: TimeSlot) => {
        const existsInTimeSlots = updatedTimeSlots.some(
          (slot: TimeSlot) => slot.id === invalidatedSlot.id
        );
        
        if (!existsInTimeSlots) {
          updatedTimeSlots.push(invalidatedSlot);
        }
      });

      // 5. Mettre à jour l'événement
      const updatedEvent = {
        ...event,
        timeSlots: updatedTimeSlots,
        actuelTimeSlots: finalActuelTimeSlots,
        state: finalState,
        updatedAt: changeDate
      };

      calendarData.events[eventIndex] = updatedEvent;
      await writeCalendarFile(calendarData);

      console.log(`Créneau ${slotId} rejeté pour l'événement ${eventId} par ${session?.user?.email || userId}`);
      console.log(`État final de l'événement: ${finalState}`);
      console.log(`Créneaux actuelTimeSlots restants: ${finalActuelTimeSlots.length}`);

      return NextResponse.json({
        event: updatedEvent,
        message: 'Créneau rejeté avec succès',
        finalState,
        remainingSlots: finalActuelTimeSlots.length
      });

    } catch (error) {
      console.error('Erreur lors du rejet du créneau:', error);
      return NextResponse.json(
        { error: 'Erreur serveur interne' },
        { status: 500 }
      );
    }
  },
  {
    module: 'CALENDAR',
    entity: 'timeslot_reject',
    action: 'REJECT_SINGLE',
    extractEntityIdFromResponse: (response) => response?.event?.id,
    extractEntityId: (req) => {
      // Pour les requêtes POST, l'ID sera extrait de la réponse
      return undefined;
    },
    customDetails: (req, response) => ({
      slotId: response?.slotId || 'unknown',
      finalState: response?.finalState,
      remainingSlots: response?.remainingSlots
    })
  }
);