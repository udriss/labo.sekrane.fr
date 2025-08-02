// app/api/calendrier/chimie/approve-timeslots/route.ts

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
      const { eventId } = body;

      if (!eventId) {
        return NextResponse.json(
          { error: 'ID de l\'événement requis' },
          { status: 400 }
        );
      }

      const { timeSlots, actuelTimeSlots } = await getEventTimeSlots(eventId, 'chemistry');
      
      const changeDate = new Date().toISOString();

      // Filtrer tous les créneaux actifs à approuver
      const activeProposedSlots = timeSlots.filter((slot: TimeSlot) => slot.status === 'active');

      if (activeProposedSlots.length === 0) {
        return NextResponse.json(
          { error: 'Aucun créneau actif à approuver' },
          { status: 400 }
        );
      }

      // Remplacer tous les actuelTimeSlots par les créneaux proposés approuvés
      const newActuelTimeSlots = activeProposedSlots.map((slot: TimeSlot) => ({
        ...slot,
        status: 'active' as const,
        modifiedBy: [...(slot.modifiedBy || []), {
          userId,
          date: changeDate,
          action: 'created' as const
        }]
      }));

      // Marquer tous les créneaux proposés comme traités
      const updatedTimeSlots = timeSlots.map((slot: TimeSlot) => {
        if (slot.status === 'active') {
          return {
            ...slot,
            modifiedBy: [...(slot.modifiedBy || []), {
              userId,
              date: changeDate,
              action: 'modified' as const
            }]
          };
        }
        return slot;
      });

      // Mettre à jour l'événement avec les nouveaux timeSlots
      await updateEventTimeSlots(eventId, updatedTimeSlots, newActuelTimeSlots, 'chemistry');

      return NextResponse.json({
        message: 'Tous les créneaux ont été approuvés avec succès',
        approvedCount: activeProposedSlots.length,
        newActuelTimeSlots
      });

    } catch (error) {
      console.error('Erreur lors de l\'approbation des créneaux chimie:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'approbation des créneaux' },
        { status: 500 }
      );
    }
  },
  {
    action: 'APPROVE_ALL',
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
