// app/api/calendrier/chimie/approve-single-timeslot/route.ts

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
      const { eventId, slotId } = body;

      if (!eventId || !slotId) {
        return NextResponse.json(
          { error: 'ID de l\'événement et ID du créneau requis' },
          { status: 400 }
        );
      }

      const { timeSlots, actuelTimeSlots } = await getEventTimeSlots(eventId, 'chemistry');
      
      const changeDate = new Date().toISOString();

      // Trouver le créneau proposé à approuver
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
      let updatedActuelTimeSlots = [...actuelTimeSlots];

      // 1. Si le créneau proposé a un referentActuelTimeID, remplacer le créneau référent
      if (proposedSlot.referentActuelTimeID) {
        const referentIndex = updatedActuelTimeSlots.findIndex(
          (slot: TimeSlot) => slot.id === proposedSlot.referentActuelTimeID
        );
        
        if (referentIndex !== -1) {
          // Marquer l'ancien comme supprimé/inactif
          await updateTimeSlotInEvent(eventId, proposedSlot.referentActuelTimeID!, {
            status: 'deleted',
            modifiedBy: [...(updatedActuelTimeSlots[referentIndex].modifiedBy || []), {
              userId,
              date: changeDate,
              action: 'deleted'
            }]
          } as Partial<TimeSlot>, 'chemistry');

          // Remplacer dans actuelTimeSlots
          updatedActuelTimeSlots[referentIndex] = {
            ...proposedSlot,
            status: 'active',
            modifiedBy: [...(proposedSlot.modifiedBy || []), {
              userId,
              date: changeDate,
              action: 'modified'
            }]
          };
        }
      } else {
        // 2. Sinon, ajouter comme nouveau créneau actuel
        updatedActuelTimeSlots.push({
          ...proposedSlot,
          status: 'active',
          modifiedBy: [...(proposedSlot.modifiedBy || []), {
            userId,
            date: changeDate,
            action: 'created'
          }]
        });
      }

      // Marquer le créneau proposé avec modification
      await updateTimeSlotInEvent(eventId, slotId, {
        modifiedBy: [...(proposedSlot.modifiedBy || []), {
          userId,
          date: changeDate,
          action: 'modified'
        }]
      } as Partial<TimeSlot>, 'chemistry');

      return NextResponse.json({
        message: 'Créneau approuvé avec succès',
        updatedSlot: {
          ...proposedSlot,
          modifiedBy: [...(proposedSlot.modifiedBy || []), {
            userId,
            date: changeDate,
            action: 'modified'
          }]
        }
      });

    } catch (error) {
      console.error('Erreur lors de l\'approbation du créneau chimie:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'approbation du créneau' },
        { status: 500 }
      );
    }
  },
  {
    action: 'APPROVE_SINGLE',
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
