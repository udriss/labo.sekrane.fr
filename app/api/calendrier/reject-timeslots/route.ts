// app/api/calendrier/reject-timeslots/route.ts

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
      const { eventId } = body;

      if (!eventId) {
        return NextResponse.json(
          { error: 'ID de l\'événement requis' },
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

      // 1. Invalider tous les créneaux proposés (status 'active' dans timeSlots)
      const proposedSlots = event.timeSlots.filter((slot: TimeSlot) => slot.status === 'active');
      const updatedTimeSlots = event.timeSlots.map((slot: TimeSlot) => {
        if (slot.status === 'active') {
          return {
            ...slot,
            status: 'invalid' as const,
            modifiedBy: [
              ...(slot.modifiedBy || []),
              {
                userId: userId,
                date: changeDate,
                action: 'invalidated' as const
              }
            ]
          };
        }
        return slot;
      });

      // 2. Invalider les créneaux référents dans actuelTimeSlots
      let updatedActuelTimeSlots = event.actuelTimeSlots || [];
      const referentIds = proposedSlots
        .map((slot: TimeSlot) => slot.referentActuelTimeID)
        .filter(Boolean);

      updatedActuelTimeSlots = updatedActuelTimeSlots.map((actualSlot: TimeSlot) => {
        if (referentIds.includes(actualSlot.id)) {
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

      
      
      

      return NextResponse.json({
        event: updatedEvent,
        message: 'Tous les créneaux proposés ont été rejetés',
        finalState,
        remainingSlots: finalActuelTimeSlots.length,
        rejectedCount: proposedSlots.length
      });

    } catch (error) {
      console.error('Erreur lors du rejet des créneaux:', error);
      return NextResponse.json(
        { error: 'Erreur serveur interne' },
        { status: 500 }
      );
    }
  },
  {
    module: 'CALENDAR',
    entity: 'timeslots_reject',
    action: 'REJECT_ALL',
    extractEntityIdFromResponse: (response) => response?.event?.id,
    extractEntityId: (req) => {
      // Pour les requêtes POST, l'ID sera extrait de la réponse
      return undefined;
    },
    customDetails: (req, response) => ({
      finalState: response?.finalState,
      remainingSlots: response?.remainingSlots,
      rejectedCount: response?.rejectedCount
    })
  }
);