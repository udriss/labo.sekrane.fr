// app/api/calendrier/physique/state-change/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withAudit } from '@/lib/api/with-audit'
import { getPhysicsEvents, updatePhysicsEvent } from '@/lib/calendar-utils'

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
      const events = await getPhysicsEvents();
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
      const { newState, reason, timeSlots } = body;

      // Nouveaux états supportés par le système TimeSlots
      const validStates = ['PENDING', 'VALIDATED', 'CANCELLED', 'MOVED', 'IN_PROGRESS'];
      
      if (!newState || !validStates.includes(newState)) {
        return NextResponse.json(
          { error: `État invalide. États valides: ${validStates.join(', ')}` },
          { status: 400 }
        );
      }

      // Préparer les données de mise à jour
      const updateData: any = {
        state: newState,
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') // Format MySQL
      };

      // Si des timeSlots sont fournis, les intégrer dans les notes
      if (timeSlots && Array.isArray(timeSlots)) {
        let currentNotes;
        try {
          currentNotes = JSON.parse(event.notes || '{}');
        } catch {
          currentNotes = {};
        }

        // Convertir les timeSlots du format formulaire vers le format de stockage
        const convertedTimeSlots = timeSlots.map(slot => ({
          id: slot.id || `TS_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
          startDate: slot.date && slot.startTime ? `${slot.date}T${slot.startTime}:00.000Z` : '',
          endDate: slot.date && slot.endTime ? `${slot.date}T${slot.endTime}:00.000Z` : '',
          status: 'active',
          createdBy: slot.createdBy || userId,
          modifiedBy: slot.modifiedBy || [{
            userId: userId,
            date: new Date().toISOString(),
            action: 'created'
          }],
          referentActuelTimeID: slot.referentActuelTimeID || null
        }));

        updateData.notes = JSON.stringify({
          ...currentNotes,
          timeSlots: convertedTimeSlots,
          actuelTimeSlots: currentNotes.actuelTimeSlots || convertedTimeSlots,
          originalRemarks: currentNotes.originalRemarks || '',
          stateChangeReason: reason || '',
          lastStateChange: {
            from: (event as any).state || 'PENDING',
            to: newState,
            date: new Date().toISOString(),
            userId: userId,
            reason: reason || ''
          }
        });
      } else if (reason) {
        // Si seule une raison est fournie, l'ajouter aux notes
        let currentNotes;
        try {
          currentNotes = JSON.parse(event.notes || '{}');
        } catch {
          currentNotes = {};
        }

        updateData.notes = JSON.stringify({
          ...currentNotes,
          stateChangeReason: reason,
          lastStateChange: {
            from: (event as any).state || 'PENDING',
            to: newState,
            date: new Date().toISOString(),
            userId: userId,
            reason: reason
          }
        });
      }

      // Mettre à jour l'état de l'événement
      const updatedEvent = await updatePhysicsEvent(eventId, updateData);

      return NextResponse.json({
        updatedEvent: updatedEvent,
        message: 'État mis à jour avec succès'
      });

    } catch (error) {
      console.error('Erreur lors du changement d\'état de l\'événement physique:', error);
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
