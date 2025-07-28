// app/api/calendrier/confirm-modification/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withAudit } from '@/lib/api/with-audit'
import { readCalendarFile, writeCalendarFile,
     migrateEventToNewFormat } from '@/lib/calendar-utils'
import { updateStateChanger, generateTimeSlotId } from '@/lib/calendar-utils-client'
import { TimeSlot } from '@/types/calendar';

export const PUT = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { modificationId, action } = body;

    if (!modificationId || !action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'ID de modification et action valide requis' },
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

    // Vérifier que l'utilisateur est le créateur de l'événement
    if (event.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Seul le créateur de l\'événement peut confirmer ou rejeter les modifications' },
        { status: 403 }
      );
    }

    const eventModifying = event.eventModifying || [];
    
    // Rechercher la modification
    const modificationIndex = eventModifying.findIndex((mod: any) => {
      const currentModId = `${mod.userId}-${mod.action}-${mod.requestDate}`;
      return currentModId === modificationId && mod.status === 'PENDING';
    });
    
    if (modificationIndex === -1) {
      return NextResponse.json(
        { error: 'Modification en attente non trouvée' },
        { status: 404 }
      );
    }

    const modification = eventModifying[modificationIndex];
    const changeDate = new Date().toISOString();

    if (action === 'confirm') {
      // Appliquer la modification à l'événement
      let updatedEvent = { ...event };

      if (modification.action === 'CANCEL') {
        updatedEvent.state = 'CANCELLED';
        updatedEvent.stateReason = modification.reason || '';
        
        // Si l'annulation inclut de nouveaux créneaux, les ajouter
        if (modification.timeSlots && modification.timeSlots.length > 0) {
          // Marquer les timeSlots actuels comme supprimés et ajouter l'historique
          updatedEvent.timeSlots = updatedEvent.timeSlots.map((slot: TimeSlot) => ({
            ...slot,
            status: 'deleted' as const,
            modifiedBy: [
              ...(slot.modifiedBy || []),
              {
                userId: userId || 'INDISPONIBLE',
                date: changeDate,
                action: 'deleted' as const
              }
            ]
          }));

          // Ajouter les nouveaux créneaux
          for (const slot of modification.timeSlots) {
            if (!slot.date || !slot.startTime || !slot.endTime) continue;

            const startDateTime = new Date(`${slot.date}T${slot.startTime}`);
            const endDateTime = new Date(`${slot.date}T${slot.endTime}`);
            
            updatedEvent.timeSlots.push({
              id: generateTimeSlotId(),
              startDate: startDateTime.toISOString(),
              endDate: endDateTime.toISOString(),
              status: 'active' as const,
              createdBy: userId || 'INDISPONIBLE',
              modifiedBy: [{
                userId: userId || 'INDISPONIBLE',
                date: changeDate,
                action: 'created' as const
              }]
            });
          }
        }
      } else if (modification.action === 'MOVE' && modification.timeSlots) {
        // Pour un déplacement, marquer les anciens slots comme supprimés et ajouter les nouveaux
        updatedEvent.state = 'MOVED';
        updatedEvent.stateReason = modification.reason || '';
        
        // Marquer les timeSlots actuels comme supprimés avec historique
        updatedEvent.timeSlots = updatedEvent.timeSlots.map((slot: TimeSlot) => ({
          ...slot,
          status: 'deleted' as const,
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: userId || 'INDISPONIBLE',
              date: changeDate,
              action: 'deleted' as const
            }
          ]
        }));

        // Ajouter les nouveaux créneaux
        for (const slot of modification.timeSlots) {
          if (!slot.date || !slot.startTime || !slot.endTime) continue;

          const startDateTime = new Date(`${slot.date}T${slot.startTime}`);
          const endDateTime = new Date(`${slot.date}T${slot.endTime}`);
          
          updatedEvent.timeSlots.push({
            id: generateTimeSlotId(),
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            status: 'active' as const,
            createdBy: userId || 'INDISPONIBLE',
            modifiedBy: [{
              userId: userId || 'INDISPONIBLE',
              date: changeDate,
              action: 'created' as const
            }]
          });
        }
      }

      // Supprimer la modification du tableau eventModifying
      const updatedEventModifying = eventModifying.filter((_: any, index: number) => index !== modificationIndex);

      // Mettre à jour stateChanger
      const updatedStateChanger = updateStateChanger(event.stateChanger || [], userId, changeDate);

      updatedEvent = {
        ...updatedEvent,
        eventModifying: updatedEventModifying,
        stateChanger: updatedStateChanger,
        updatedAt: changeDate,
        // NOUVEAU: Mettre à jour actuelTimeSlots avec les créneaux actifs après confirmation
        actuelTimeSlots: updatedEvent.timeSlots.filter((slot: TimeSlot) => slot.status === 'active')
      };

      calendarData.events[eventIndex] = updatedEvent;
      await writeCalendarFile(calendarData);

      return NextResponse.json({
        updatedEvent,
        message: `Modification ${modification.action === 'CANCEL' ? 'd\'annulation' : 'de déplacement'} confirmée avec succès`
      });

    } else if (action === 'reject') {
      // Rejeter la modification - la supprimer du tableau
      const updatedEventModifying = eventModifying.filter((_: any, index: number) => index !== modificationIndex);

      const updatedEvent = {
        ...event,
        eventModifying: updatedEventModifying,
        updatedAt: changeDate
      };

      calendarData.events[eventIndex] = updatedEvent;
      await writeCalendarFile(calendarData);

      return NextResponse.json({
        updatedEvent,
        message: `Modification ${modification.action === 'CANCEL' ? 'd\'annulation' : 'de déplacement'} rejetée`
      });
    }

    return NextResponse.json(
      { error: 'Action non reconnue' },
      { status: 400 }
    );
  },
  {
    module: 'CALENDAR',
    entity: 'event_modification',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.updatedEvent?.id,
    extractEntityId: (req) => new URL(req.url).searchParams.get('eventId') || undefined,
    customDetails: (req, response) => ({
      action: response?.message?.includes('confirmée') ? 'CONFIRM' : 'REJECT',
      modificationType: response?.message?.includes('annulation') ? 'CANCEL' : 'MOVE',
      activeTimeSlotsCount: response?.updatedEvent?.timeSlots?.filter((s: TimeSlot) => s.status === 'active').length || 0
    })
  }
);
