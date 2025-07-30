// app/api/calendrier/approve-timeslots/route.ts

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

      // 1. Récupérer tous les créneaux proposés (status 'active' dans timeSlots)
      const proposedSlots = event.timeSlots.filter((slot: TimeSlot) => slot.status === 'active');
      
      if (proposedSlots.length === 0) {
        return NextResponse.json(
          { error: 'Aucun créneau proposé à approuver' },
          { status: 400 }
        );
      }

      let updatedActuelTimeSlots = [...(event.actuelTimeSlots || [])];

      // 2. Pour chaque créneau proposé, l'ajouter ou remplacer dans actuelTimeSlots
      proposedSlots.forEach((proposedSlot: TimeSlot) => {
        if (proposedSlot.referentActuelTimeID) {
          // Remplacer le créneau référent
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
      });

      // 3. Marquer tous les créneaux proposés comme approuvés dans timeSlots
      const updatedTimeSlots = event.timeSlots.map((slot: TimeSlot) => {
        if (slot.status === 'active') {
          return {
            ...slot,
            modifiedBy: [
              ...(slot.modifiedBy || []),
              {
                userId: userId,
                date: changeDate,
                action: 'modified' as const
              }
            ]
          };
        }
        return slot;
      });

      // 4. Passer l'état à VALIDATED puisque tous les créneaux sont approuvés
      const finalState = 'VALIDATED';

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

      
      
      

      return NextResponse.json({
        event: updatedEvent,
        message: 'Tous les créneaux proposés ont été approuvés',
        finalState,
        totalSlots: updatedActuelTimeSlots.length,
        approvedCount: proposedSlots.length
      });

    } catch (error) {
      console.error('Erreur lors de l\'approbation des créneaux:', error);
      return NextResponse.json(
        { error: 'Erreur serveur interne' },
        { status: 500 }
      );
    }
  },
  {
    module: 'CALENDAR',
    entity: 'timeslots_approve',
    action: 'APPROVE_ALL',
    extractEntityIdFromResponse: (response) => response?.event?.id,
    extractEntityId: (req) => {
      // Pour les requêtes POST, l'ID sera extrait de la réponse
      return undefined;
    },
    customDetails: (req, response) => ({
      finalState: response?.finalState,
      totalSlots: response?.totalSlots,
      approvedCount: response?.approvedCount
    })
  }
);