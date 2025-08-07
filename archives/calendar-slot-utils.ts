// lib/calendar-slot-utils.ts

import { TimeSlot, CalendarEvent } from '@/types/calendar';

/**
 * Filtre les créneaux pour ne garder que ceux qui sont actifs (exclut "invalid" et "deleted")
 */
export function getActiveTimeSlots(timeSlots: TimeSlot[]): TimeSlot[] {
  return timeSlots.filter(slot => slot.status === 'active');
}

/**
 * Trouve le créneau actuel correspondant à un créneau proposé en utilisant referentActuelTimeID
 */
export function findCorrespondingActualSlot(proposedSlot: TimeSlot, actualSlots: TimeSlot[]): TimeSlot | null {
  if (!proposedSlot || !actualSlots || actualSlots.length === 0) {
    return null;
  }

  // Correspondance directe par referentActuelTimeID si présent
  if (proposedSlot.referentActuelTimeID) {
    const byRef = actualSlots.find(slot => slot.id === proposedSlot.referentActuelTimeID);
    if (byRef) return byRef;
  }

  // Sinon, correspondance par ID (créneau inchangé)
  const byId = actualSlots.find(slot => slot.id === proposedSlot.id);
  if (byId) return byId;

  // Si aucune correspondance, retourner null
  return null;
}

/**
 * Vérifie si un événement a des changements en attente de validation
 */
export function hasPendingChanges(event: CalendarEvent, currentUserId?: string): boolean {
  if (!event.actuelTimeSlots || !event.timeSlots) return false;
  
  // Filtrer strictement les créneaux valides (exclure ceux avec status "invalid" ou "deleted")
  const activeTimeSlots = getActiveTimeSlots(event.timeSlots);
  const actualTimeSlots = event.actuelTimeSlots;
  
  // Si l'événement est PENDING et que c'est le propriétaire qui a fait les modifications,
  // ne pas considérer comme ayant des changements en attente
  if (event.state === 'PENDING' && event.createdBy === currentUserId) {
    return false;
  }
  
  // Comparer le nombre de créneaux valides
  if (activeTimeSlots.length !== actualTimeSlots.length) return true;
  
  // Vérifier si chaque créneau proposé valide a été modifié
  return activeTimeSlots.some(proposedSlot => {
    const correspondingActual = findCorrespondingActualSlot(proposedSlot, actualTimeSlots);
    
    if (!correspondingActual) {
      return true; // Nouveau créneau proposé
    }
    
    // Comparer les dates
    return correspondingActual.startDate !== proposedSlot.startDate || 
           correspondingActual.endDate !== proposedSlot.endDate;
  });
}

/**
 * Obtient le statut d'un créneau (validé, en attente, nouveau)
 */
export function getSlotStatus(proposedSlot: TimeSlot, event: CalendarEvent): 'new' | 'pending' | 'approved' {
  const correspondingActual = findCorrespondingActualSlot(proposedSlot, event.actuelTimeSlots || []);
  
  if (!correspondingActual) {
    return 'new'; // Nouveau créneau
  }
  
  // Vérifier si c'est une correspondance par ID (créneau inchangé)
  const isSameDate = correspondingActual.startDate === proposedSlot.startDate && 
                    correspondingActual.endDate === proposedSlot.endDate;
  
  if (isSameDate) {
    return 'approved'; // Créneau validé (identique)
  }
  
  return 'pending'; // Créneau modifié en attente
}

/**
 * Synchronise actuelTimeSlots avec les nouveaux timeSlots actifs
 */
export function synchronizeActuelTimeSlots(event: CalendarEvent, newTimeSlots: TimeSlot[]): TimeSlot[] {
  // Ne garder que les créneaux actifs pour actuelTimeSlots
  return getActiveTimeSlots(newTimeSlots);
}