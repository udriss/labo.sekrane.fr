// lib/calendar-utils-client.ts

import { TimeSlot, CalendarEvent } from '@/types/calendar'

// Fonction utilitaire pour obtenir tous les créneaux actifs d'un événement
// Selon les nouvelles exigences : afficher uniquement les propositions des nouveaux créneaux
// Si pas de nouveaux créneaux proposés, afficher les actuelTimeSlots
export function getActiveTimeSlots(event: CalendarEvent): TimeSlot[] {
  // Vérifier que l'événement existe et est valide
  if (!event || typeof event !== 'object') {
    return [];
  }
  
  if (!event.timeSlots || !Array.isArray(event.timeSlots)) {
    // Pour la rétrocompatibilité, si l'événement n'a pas de timeSlots
    // mais a encore startDate/endDate (pendant la migration)
    if ((event as any).startDate && (event as any).endDate) {
      return [{
        id: 'legacy-slot',
        startDate: (event as any).startDate,
        endDate: (event as any).endDate,
        status: 'active'
      }];
    }
    return [];
  }
  
  // Obtenir les nouveaux créneaux proposés (status 'active' dans timeSlots)
  const proposedSlots = event.timeSlots.filter(slot => slot.status === 'active');
  
  // Pour les événements annulés, toujours afficher les actuelTimeSlots
  if (event.state === 'CANCELLED') {
    return event.actuelTimeSlots || [];
  }
  
  // Si il y a des créneaux proposés, les afficher uniquement
  if (proposedSlots.length > 0) {
    return proposedSlots;
  }
  
  // Sinon, afficher les actuelTimeSlots (créneaux validés en vigueur)
  return event.actuelTimeSlots || [];
}

// Fonction pour obtenir uniquement les nouveaux créneaux proposés (status 'active' dans timeSlots)
export function getProposedTimeSlots(event: CalendarEvent): TimeSlot[] {
  if (!event.timeSlots || !Array.isArray(event.timeSlots)) {
    return [];
  }
  
  return event.timeSlots.filter(slot => slot.status === 'active');
}

// Fonction pour obtenir les créneaux actuels validés
export function getActuelTimeSlots(event: CalendarEvent): TimeSlot[] {
  return event.actuelTimeSlots || [];
}

// Fonction pour obtenir les créneaux à afficher dans le planning quotidien
// Priorité : actuelTimeSlots (créneaux confirmés) > timeSlots (propositions) > legacy dates
export function getDisplayTimeSlots(event: CalendarEvent): TimeSlot[] {
  // Vérifier que l'événement existe et est valide
  if (!event || typeof event !== 'object') {
    return [];
  }
  
  // 1. Prioriser les actuelTimeSlots s'ils existent (créneaux confirmés et en vigueur)
  if (event.actuelTimeSlots && Array.isArray(event.actuelTimeSlots) && event.actuelTimeSlots.length > 0) {
    return event.actuelTimeSlots;
  }
  
  // 2. Sinon, utiliser les timeSlots proposés (status 'active')
  if (event.timeSlots && Array.isArray(event.timeSlots)) {
    const proposedSlots = event.timeSlots.filter(slot => slot.status === 'active');
    if (proposedSlots.length > 0) {
      return proposedSlots;
    }
  }
  
  // 3. Pour la rétrocompatibilité, si l'événement n'a pas de timeSlots
  // mais a encore startDate/endDate (pendant la migration)
  if ((event as any).startDate && (event as any).endDate) {
    return [{
      id: 'legacy-slot',
      startDate: (event as any).startDate,
      endDate: (event as any).endDate,
      status: 'active'
    }];
  }
  
  return [];
}

// Fonction pour afficher un événement dans le calendrier (pour FullCalendar)
export function eventToCalendarEvents(event: CalendarEvent): any[] {
  const activeSlots = getActiveTimeSlots(event);
  
  return activeSlots.map((slot, index) => ({
    id: `${event.id}_${slot.id}`,
    title: event.title,
    start: slot.startDate,
    end: slot.endDate,
    extendedProps: {
      ...event,
      timeSlotId: slot.id,
      isMultiSlot: activeSlots.length > 1,
      slotIndex: index + 1,
      totalSlots: activeSlots.length
    }
  }));
}

// Fonction pour générer un ID unique pour les timeSlots
export function generateTimeSlotId(): string {
  return `TS_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Fonction helper pour updateStateChanger
export function updateStateChanger(
  stateChanger: Array<[string, ...string[]]>,
  userId: string | undefined,
  date: string
): Array<[string, ...string[]]> {
  if (!userId) return stateChanger;
  
  const userIndex = stateChanger.findIndex(entry => entry[0] === userId);
  
  if (userIndex >= 0) {
    const updatedStateChanger = [...stateChanger];
    const [existingUserId, ...existingDates] = stateChanger[userIndex];
    updatedStateChanger[userIndex] = [existingUserId, ...existingDates, date] as [string, ...string[]];
    return updatedStateChanger;
  } else {
    return [...stateChanger, [userId, date]];
  }
}