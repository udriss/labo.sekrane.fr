// app/api/calendrier/state-change/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withAudit } from '@/lib/api/with-audit'
import { readCalendarFile, writeCalendarFile } from '@/lib/calendar-utils'

export const PUT = withAudit(
  async (request: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);
      const userRole = session?.user?.role;
      const userId = session?.user?.id;

      // Vérifier l'authentification
      if (!userId) {
        return NextResponse.json(
          { error: 'Authentification requise' },
          { status: 401 }
        );
      }

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

      const event = calendarData.events[eventIndex];

      // Vérifier les permissions : LABORANTIN, ADMINLABO ou créateur de l'événement
      const canChangeState = userRole === 'LABORANTIN' || 
                            userRole === 'ADMINLABO' || 
                            event.createdBy === userId;
                           
      if (!canChangeState) {
        return NextResponse.json(
          { error: 'Vous n\'avez pas la permission de modifier l\'état de cet événement' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const { state, reason } = body;

      if (!state) {
        return NextResponse.json(
          { error: 'Nouvel état requis' },
          { status: 400 }
        );
      }

      const changeDate = new Date().toISOString();
      const previousState = event.state || 'PENDING';

      // Créer l'entrée de changement d'état
      const stateChange = {
        userId,
        date: changeDate,
        fromState: previousState,
        toState: state,
        reason: reason || ''
      };

      // Mettre à jour l'événement avec le nouvel état et la raison
      const updatedEvent = {
        ...event,
        state,
        stateChanger: [...(event.stateChanger || []), stateChange],
        updatedAt: changeDate,
        // Si c'est une validation, synchroniser actuelTimeSlots avec les créneaux actifs
        ...(state === 'VALIDATED' && {
          actuelTimeSlots: event.timeSlots?.filter((slot: any) => slot.status === 'active') || event.actuelTimeSlots
        })
      };
      
      calendarData.events[eventIndex] = updatedEvent;
      await writeCalendarFile(calendarData);

      console.log(`Changement d'état de l'événement ${eventId} par ${session?.user?.email || userId}: ${previousState} → ${state}`);

      const response = {
        updatedEvent,
        message: `État de l'événement changé de "${previousState}" vers "${state}" avec succès`,
        stateChange
      };
      
      return NextResponse.json(response);
    } catch (error) {
      console.error('Erreur lors du changement d\'état:', error);
      return NextResponse.json(
        { error: 'Erreur serveur interne' },
        { status: 500 }
      );
    }
  },
  {
    module: 'CALENDAR',
    entity: 'event_state',
    action: 'UPDATE_STATE',
    extractEntityIdFromResponse: (response) => response?.updatedEvent?.id,
    extractEntityId: (req) => new URL(req.url).searchParams.get('id') || undefined,
    customDetails: (req, response) => ({
      previousState: response?.stateChange?.fromState || 'UNKNOWN',
      newState: response?.stateChange?.toState || 'UNKNOWN',
      reasonProvided: !!(response?.stateChange?.reason),
      isCreatorChange: response?.stateChange?.userId === response?.updatedEvent?.createdBy,
      userRole: response?.updatedEvent?.createdBy === response?.stateChange?.userId ? 'CREATOR' : 'VALIDATOR'
    })
  }
);