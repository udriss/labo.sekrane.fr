// app/api/calendrier/state-change/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Ajustez selon votre configuration d'authentification
import { withAudit } from '@/lib/api/with-audit'
import { readCalendarFile, writeCalendarFile } from '@/lib/calendar-utils'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { promises as fs } from 'fs'
import path from 'path'


export const PUT = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role;
    const userId = session?.user?.id;

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

    // Vérifier les permissions
    const canEdit = userRole === 'ADMIN' || 
                   userRole === 'ADMINLABO' || 
                   event.createdBy === userId;
                   
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de modifier cet événement' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { state, reason } = body;

    if (!state) {
      return NextResponse.json(
        { error: 'État requis pour le changement' },
        { status: 400 }
      );
    }

    // Gérer le tableau stateChanger pour suivre qui a changé l'état
    const currentStateChanger = event.stateChanger || [];
    const changeDate = new Date().toISOString();
    
    const userIndex = currentStateChanger.findIndex((entry: [string, ...string[]]) => entry[0] === userId);
    let updatedStateChanger: Array<[string, ...string[]]>;
    
    if (userIndex >= 0 && userId) {
      updatedStateChanger = [...currentStateChanger];
      const existingEntry = currentStateChanger[userIndex];
      const [existingUserId, ...existingDates] = existingEntry;
      updatedStateChanger[userIndex] = [existingUserId, ...existingDates, changeDate] as [string, ...string[]];
    } else if (userId) {
      updatedStateChanger = [...currentStateChanger, [userId, changeDate]];
    } else {
      updatedStateChanger = currentStateChanger;
    }

    // Mettre à jour l'événement avec le nouvel état et la raison
    const updatedEvent = {
      ...event,
      state,
      stateChanger: updatedStateChanger,
      stateReason: reason || event.stateReason || '',
      updatedAt: changeDate
    };
    
    calendarData.events[eventIndex] = updatedEvent;
    await writeCalendarFile(calendarData);

    const response = {
      updatedEvent,
      message: `État de l'événement mis à jour en "${state}" avec succès`
    };
    
    return NextResponse.json(response);
  },
  {
    module: 'CALENDAR',
    entity: 'event_state',
    action: 'UPDATE_STATE',
    extractEntityIdFromResponse: (response) => response?.updatedEvent?.id,
    extractEntityId: (req) => new URL(req.url).searchParams.get('id') || undefined,
    customDetails: (req, response) => ({
      newState: response?.updatedEvent?.state || 'UNKNOWN',
      reasonProvided: !!(response?.updatedEvent?.stateReason),
      stateChangeCount: response?.updatedEvent?.stateChanger?.length || 0
    })
  }
);