// app/api/calendrier/chimie/reject-single-timeslot/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withAudit } from '@/lib/api/with-audit'
import { getEventTimeSlots, updateTimeSlotInEvent } from '@/lib/calendar-utils'
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
      const { eventId, slotId, reason } = body;

      if (!eventId || !slotId) {
        return NextResponse.json(
          { error: 'ID de l\'événement et ID du créneau requis' },
          { status: 400 }
        );
      }

      const { timeSlots } = await getEventTimeSlots(eventId, 'chemistry');
      
      const changeDate = new Date().toISOString();

      // Trouver le créneau proposé à rejeter
      const proposedSlotIndex = timeSlots.findIndex((slot: TimeSlot) => 
        slot.id === slotId && slot.status === 'active'
      );

      if (proposedSlotIndex === -1) {
        return NextResponse.json(
          { error: 'Créneau proposé non trouvé' },
          { status: 404 }
        );
      }

      const proposedSlot = timeSlots[proposedSlotIndex];

      // Marquer le créneau comme rejeté/invalide
      await updateTimeSlotInEvent(eventId, slotId, {
        status: 'invalid',
        modifiedBy: [...(proposedSlot.modifiedBy || []), {
          userId,
          date: changeDate,
          action: 'invalidated'
        }]
      } as Partial<TimeSlot>, 'chemistry');

      return NextResponse.json({
        message: 'Créneau rejeté avec succès',
        rejectedSlot: {
          ...proposedSlot,
          status: 'invalid',
          modifiedBy: [...(proposedSlot.modifiedBy || []), {
            userId,
            date: changeDate,
            action: 'invalidated'
          }]
        },
        reason
      });

    } catch (error) {
      console.error('Erreur lors du rejet du créneau chimie:', error);
      return NextResponse.json(
        { error: 'Erreur lors du rejet du créneau' },
        { status: 500 }
      );
    }
  },
  {
    action: 'REJECT_SINGLE',
    module: 'CALENDAR',
    entity: 'TIMESLOT',
    extractEntityId: (req: NextRequest) => {
      try {
        const body = JSON.parse(req.body as any);
        return body.slotId;
      } catch {
        return undefined;
      }
    }
  }
);
