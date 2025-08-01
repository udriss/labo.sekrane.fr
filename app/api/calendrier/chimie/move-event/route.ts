// app/api/calendrier/chimie/move-event/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withAudit } from '@/lib/api/with-audit'
import { getChemistryEvents, updateChemistryEvent } from '@/lib/calendar-utils'

export const PUT = withAudit(
  async (request: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);
      const userId = session?.user?.id;
      const userRole = session?.user?.role;

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

      // Récupérer l'événement existant
      const events = await getChemistryEvents();
      const event = events.find(e => e.id === eventId);
      
      if (!event) {
        return NextResponse.json(
          { error: 'Événement non trouvé' },
          { status: 404 }
        );
      }

      const body = await request.json();
      const { newStartDate, newEndDate, timeSlotId } = body;

      if (!newStartDate || !newEndDate) {
        return NextResponse.json(
          { error: 'Nouvelles dates requises' },
          { status: 400 }
        );
      }

      // Mettre à jour l'événement avec les nouvelles dates
      const updatedEvent = await updateChemistryEvent(eventId, {
        ...event,
        start_date: newStartDate,
        end_date: newEndDate,
        updated_at: new Date().toISOString()
      });

      return NextResponse.json(updatedEvent);

    } catch (error) {
      console.error('Erreur lors du déplacement de l\'événement chimie:', error);
      return NextResponse.json(
        { error: 'Erreur lors du déplacement de l\'événement' },
        { status: 500 }
      );
    }
  },
  {
    action: 'MOVE_EVENT',
    module: 'CALENDAR',
    entity: 'EVENT',
    extractEntityId: (req: NextRequest) => new URL(req.url).searchParams.get('id') || undefined
  }
);
