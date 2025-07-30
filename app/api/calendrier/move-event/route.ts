// app/api/calendrier/move-event/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withAudit } from '@/lib/api/with-audit'
import { readCalendarFile, writeCalendarFile, migrateEventToNewFormat } from '@/lib/calendar-utils'
import { generateTimeSlotId } from '@/lib/calendar-utils-client'
import { TimeSlot } from '@/types/calendar'

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

      const body = await request.json();
      const { timeSlots, reason } = body;

      if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
        return NextResponse.json(
          { error: 'Créneaux horaires requis pour la proposition' },
          { status: 400 }
        );
      }

      const changeDate = new Date().toISOString();

      // 1. Invalider TOUS les anciens timeSlots (validés ou non) SAUF ceux dans actuelTimeSlots
      const invalidatedTimeSlots = event.timeSlots.map((slot: TimeSlot) => ({
        ...slot,
        status: 'invalid' as const,
        modifiedBy: [
          ...(slot.modifiedBy || []),
          {
            userId: userId,
            date: changeDate,
            action: 'invalidated' as const
          }
        ]
      }));

      // 2. Créer les nouveaux créneaux proposés avec status 'active'
      const newTimeSlots: TimeSlot[] = [];
      
      for (let i = 0; i < timeSlots.length; i++) {
        const slot = timeSlots[i];
        
        if (!slot.date || !slot.startTime || !slot.endTime) {
          return NextResponse.json(
            { error: `Créneau ${i + 1}: date, heure de début et heure de fin sont requis` },
            { status: 400 }
          );
        }

        const startDateTime = new Date(`${slot.date}T${slot.startTime}`);
        const endDateTime = new Date(`${slot.date}T${slot.endTime}`);

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          return NextResponse.json(
            { error: `Créneau ${i + 1}: format de date/heure invalide` },
            { status: 400 }
          );
        }

        if (endDateTime <= startDateTime) {
          return NextResponse.json(
            { error: `Créneau ${i + 1}: l'heure de fin doit être après l'heure de d��but` },
            { status: 400 }
          );
        }

        // Déterminer referentActuelTimeID
        // Si le slot a une propriété referentActuelTimeID explicite, l'utiliser
        // Sinon, essayer de faire correspondre par index avec les créneaux actuels
        let referentActuelTimeID: string | null = null;
        
        if (slot.referentActuelTimeID !== undefined) {
          // Référence explicite fournie par l'utilisateur
          referentActuelTimeID = slot.referentActuelTimeID;
        } else {
          // Correspondance automatique par index avec actuelTimeSlots
          const currentActiveSlots = event.actuelTimeSlots || [];
          
          if (currentActiveSlots[i]) {
            referentActuelTimeID = currentActiveSlots[i].id;
          }
          // Sinon reste null (nouveau créneau sans correspondance)
        }

        const newTimeSlot: TimeSlot = {
          id: generateTimeSlotId(),
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          status: 'active',
          createdBy: userId,
          modifiedBy: [{
            userId: userId,
            date: changeDate,
            action: 'created'
          }],
          ...(referentActuelTimeID !== null ? { referentActuelTimeID } : {})
        };

        newTimeSlots.push(newTimeSlot);
      }

      // 3. Conserver les actuelTimeSlots inchangés (ils restent toujours en vigueur)
      // et ajouter les nouveaux créneaux proposés
      const updatedEvent = {
        ...event,
        timeSlots: [...invalidatedTimeSlots, ...newTimeSlots],
        // actuelTimeSlots reste inchangé - c'est la référence stable
        updatedAt: changeDate
      };
      
      calendarData.events[eventIndex] = updatedEvent;
      await writeCalendarFile(calendarData);

      
      
      
      

      const response = {
        updatedEvent,
        message: `${newTimeSlots.length} nouveau(x) créneau(x) proposé(s) avec succès`,
        invalidatedCount: invalidatedTimeSlots.length,
        newSlotsCount: newTimeSlots.length,
        actuelTimeSlotsCount: event.actuelTimeSlots?.length || 0
      };
      
      return NextResponse.json(response);

    } catch (error) {
      console.error('Erreur lors de la proposition de nouveaux créneaux:', error);
      return NextResponse.json(
        { error: 'Erreur serveur interne' },
        { status: 500 }
      );
    }
  },
  {
    module: 'CALENDAR',
    entity: 'event_move',
    action: 'PROPOSE_TIMESLOTS',
    extractEntityIdFromResponse: (response) => response?.updatedEvent?.id,
    extractEntityId: (req) => new URL(req.url).searchParams.get('id') || undefined,
    customDetails: (req, response) => ({
      newSlotsCount: response?.newSlotsCount || 0,
      invalidatedCount: response?.invalidatedCount || 0,
      actuelTimeSlotsCount: response?.actuelTimeSlotsCount || 0,
      hasReferentIds: response?.updatedEvent?.timeSlots?.some((s: TimeSlot) => s.referentActuelTimeID) || false
    })
  }
);