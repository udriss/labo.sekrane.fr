// app/api/calendrier/physique/reject-timeslots/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withAudit } from '@/lib/api/with-audit'
import { getEventTimeSlots, updateEventTimeSlots } from '@/lib/calendar-utils'
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
      const { eventId, reason } = body;

      if (!eventId) {
        return NextResponse.json(
          { error: 'ID de l\'événement requis' },
          { status: 400 }
        );
      }

      const { timeSlots, actuelTimeSlots } = await getEventTimeSlots(eventId, 'physics');
      
      const changeDate = new Date().toISOString();

      // Filtrer tous les créneaux actifs à rejeter
      const activeProposedSlots = timeSlots.filter((slot: TimeSlot) => slot.status === 'active');

      if (activeProposedSlots.length === 0) {
        return NextResponse.json(
          { error: 'Aucun créneau actif à rejeter' },
          { status: 400 }
        );
      }

      // Marquer tous les créneaux proposés comme invalides
      const updatedTimeSlots = timeSlots.map((slot: TimeSlot) => {
        if (slot.status === 'active') {
          return {
            ...slot,
            status: 'invalid' as const,
            modifiedBy: [...(slot.modifiedBy || []), {
              userId,
              date: changeDate,
              action: 'invalidated' as const
            }]
          };
        }
        return slot;
      });

      // Mettre à jour l'événement avec les créneaux rejetés
      await updateEventTimeSlots(eventId, updatedTimeSlots, actuelTimeSlots, 'physics');

      return NextResponse.json({
        message: 'Tous les créneaux ont été rejetés avec succès',
        rejectedCount: activeProposedSlots.length,
        reason
      });

    } catch (error) {
      console.error('Erreur lors du rejet des créneaux physique:', error);
      return NextResponse.json(
        { error: 'Erreur lors du rejet des créneaux' },
        { status: 500 }
      );
    }
  },
  {
    action: 'REJECT_ALL',
    module: 'CALENDAR',
    entity: 'TIMESLOT',
    extractEntityId: (req: NextRequest) => {
      try {
        const body = JSON.parse(req.body as any);
        return body.eventId;
      } catch {
        return undefined;
      }
    }
  }
);
