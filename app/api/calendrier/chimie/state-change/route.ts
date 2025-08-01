// app/api/calendrier/chimie/state-change/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withAudit } from '@/lib/api/with-audit'
import { getChemistryEvents, updateChemistryEvent } from '@/lib/calendar-utils'

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

      // Récupérer l'événement existant
      const events = await getChemistryEvents();
      const event = events.find(e => e.id === eventId);
      
      if (!event) {
        return NextResponse.json(
          { error: 'Événement non trouvé' },
          { status: 404 }
        );
      }

      // Vérifier les permissions : LABORANTIN, ADMINLABO ou créateur de l'événement
      const canChangeState = userRole === 'LABORANTIN' || 
                            userRole === 'ADMINLABO' || 
                            event.created_by === userId;
                           
      if (!canChangeState) {
        return NextResponse.json(
          { error: 'Vous n\'avez pas les permissions pour modifier l\'état de cet événement' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const { newState } = body;

      if (!newState || !['scheduled', 'confirmed', 'cancelled', 'completed'].includes(newState)) {
        return NextResponse.json(
          { error: 'État invalide' },
          { status: 400 }
        );
      }

      // Mettre à jour l'état de l'événement
      const updatedEvent = await updateChemistryEvent(eventId, {
        ...event,
        status: newState,
        updated_at: new Date().toISOString()
      });

      return NextResponse.json(updatedEvent);

    } catch (error) {
      console.error('Erreur lors du changement d\'état de l\'événement chimie:', error);
      return NextResponse.json(
        { error: 'Erreur lors du changement d\'état de l\'événement' },
        { status: 500 }
      );
    }
  },
  {
    action: 'UPDATE_STATE',
    module: 'CALENDAR',
    entity: 'EVENT',
    extractEntityId: (req: NextRequest) => new URL(req.url).searchParams.get('id') || undefined
  }
);
