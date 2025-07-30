// lib/calendar-utils.ts

import { promises as fs } from 'fs'
import path from 'path'
import { TimeSlot } from '@/types/calendar'
import { generateTimeSlotId } from '@/lib/calendar-utils-client'

const CALENDAR_FILE = path.join(process.cwd(), 'data', 'calendar.json')

// Fonction pour migrer les anciennes données vers le nouveau format
export async function migrateEventToNewFormat(event: any): Promise<any> {
  // Si l'événement a déjà des timeSlots, vérifier les nouveaux champs
  if (event.timeSlots && Array.isArray(event.timeSlots)) {
    // S'assurer que actuelTimeSlots est présent
    const migratedEvent = {
      ...event,
      actuelTimeSlots: event.actuelTimeSlots || event.timeSlots.filter((slot: any) => slot.status === 'active')
    };
    // Supprimer eventModifying s'il existe (n'est plus utilisé)
    delete migratedEvent.eventModifying;
    return migratedEvent;
  }

  // Créer un timeSlot à partir des anciennes données startDate/endDate
  const timeSlot: TimeSlot = {
    id: generateTimeSlotId(),
    startDate: event.startDate,
    endDate: event.endDate,
    status: 'active'
  };

  // Retourner l'événement avec le nouveau format complet
  const { startDate, endDate, parentEventId, eventModifying, ...restEvent } = event;
  return {
    ...restEvent,
    timeSlots: [timeSlot],
    actuelTimeSlots: [timeSlot] // NOUVEAU: créneaux actuellement retenus
  };
}

// Fonction pour écrire dans le fichier calendrier
export async function writeCalendarFile(data: any) {
  try {
    await fs.writeFile(CALENDAR_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Erreur écriture fichier calendar:', error)
    throw error
  }
}

// Fonction pour lire le fichier calendrier
export async function readCalendarFile() {
  try {
    const data = await fs.readFile(CALENDAR_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Erreur lecture fichier calendar:', error)
    return { events: [] }
  }
}

export async function migrateCalendarData() {
  try {
    const calendarData = await readCalendarFile();
    let needsMigration = false;

    // Migrer tous les événements vers le nouveau format
    const migratedEvents = await Promise.all(calendarData.events.map(async (event: any) => {
      // Si l'événement a déjà des timeSlots, pas besoin de migration
      if (event.timeSlots && Array.isArray(event.timeSlots)) {
        return event;
      }

      needsMigration = true;

      // Créer un timeSlot à partir des anciennes données startDate/endDate
      const timeSlot: TimeSlot = {
        id: generateTimeSlotId(),
        startDate: event.startDate,
        endDate: event.endDate,
        status: 'active'
      };

      // Retourner l'événement avec le nouveau format
      const { startDate, endDate, parentEventId, ...restEvent } = event;
      return {
        ...restEvent,
        timeSlots: [timeSlot]
      };
    }));

    if (needsMigration) {
      
      calendarData.events = migratedEvents;
      await writeCalendarFile(calendarData);
      
    }

    return calendarData;
  } catch (error) {
    console.error('Erreur lors de la migration des données:', error);
    throw error;
  }
}