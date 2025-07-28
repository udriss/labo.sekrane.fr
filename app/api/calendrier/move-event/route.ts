// app/api/calendrier/move-event/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withAudit } from '@/lib/api/with-audit'
import { readCalendarFile, writeCalendarFile,
   migrateEventToNewFormat } from '@/lib/calendar-utils'
import { updateStateChanger, generateTimeSlotId } from '@/lib/calendar-utils-client'
import { TimeSlot } from '@/types/calendar';

// app/api/calendrier/move-event/route.ts
export const PUT = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userRole = session?.user?.role;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    
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

    // Vérifier les permissions
    const canEdit = userRole === 'LABORANTIN' || 
                   userRole === 'ADMINLABO' || 
                   event.createdBy === userId;
                   
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de modifier cet événement' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { state, reason, timeSlots } = body;

    if (!state || state !== 'MOVED') {
      return NextResponse.json(
        { error: 'État requis pour le déplacement' },
        { status: 400 }
      );
    }

    if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      return NextResponse.json(
        { error: 'Créneaux horaires requis pour le déplacement' },
        { status: 400 }
      );
    }

    const changeDate = new Date().toISOString();

    // Si l'utilisateur n'est pas le créateur, créer une demande de modification
    if (event.createdBy !== userId) {
      const eventModifying = event.eventModifying || [];
      
      const newModification = {
        requestDate: changeDate,
        userId: userId || '',
        action: 'MOVE' as const,
        status: 'PENDING' as const,
        reason: reason || '',
        timeSlots: timeSlots.map((slot: any) => ({
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }))
      };

      const updatedEvent = {
        ...event,
        eventModifying: [...eventModifying, newModification],
        // Suite de app/api/calendrier/move-event/route.ts
        updatedAt: changeDate
      };

      calendarData.events[eventIndex] = updatedEvent;
      await writeCalendarFile(calendarData);

      return NextResponse.json({
        updatedEvent,
        message: 'Demande de déplacement de l\'événement envoyée',
        isPending: true
      });
    }

    // Si l'utilisateur est le créateur, marquer tous les timeSlots actuels comme supprimés
    const updatedTimeSlots = event.timeSlots.map((slot: TimeSlot) => ({
      ...slot,
      status: 'deleted' as const
    }));

    // Ajouter les nouveaux timeSlots
    for (const slot of timeSlots) {
      if (!slot.date || !slot.startTime || !slot.endTime) continue;

      const startDateTime = new Date(`${slot.date}T${slot.startTime}`);
      const endDateTime = new Date(`${slot.date}T${slot.endTime}`);
      
      updatedTimeSlots.push({
        id: generateTimeSlotId(),
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        status: 'active' as const,
        userIDAdding: userId || 'INDISPONIBLE',
      });
    }

    // Mettre à jour stateChanger
    const updatedStateChanger = updateStateChanger(event.stateChanger || [], userId, changeDate);

    // Mettre à jour l'événement
    const updatedEvent = {
      ...event,
      state,
      stateChanger: updatedStateChanger,
      stateReason: reason || event.stateReason || '',
      timeSlots: updatedTimeSlots,
      updatedAt: changeDate
    };
    
    calendarData.events[eventIndex] = updatedEvent;
    await writeCalendarFile(calendarData);

    return NextResponse.json({
      updatedEvent,
      message: 'Événement déplacé avec succès'
    });
  },
  {
    module: 'CALENDAR',
    entity: 'event_move',
    action: 'MOVE_EVENT',
    extractEntityIdFromResponse: (response) => response?.updatedEvent?.id,
    extractEntityId: (req) => new URL(req.url).searchParams.get('id') || undefined,
    customDetails: (req, response) => ({
      newState: response?.updatedEvent?.state || 'UNKNOWN',
      newTimeSlotsCount: response?.updatedEvent?.timeSlots?.filter((s: TimeSlot) => s.status === 'active').length || 0,
      isPending: response?.isPending || false
    })
  }
);

