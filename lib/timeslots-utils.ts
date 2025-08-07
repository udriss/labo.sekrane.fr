// lib/timeslots-utils.ts
// Nouvelles fonctions utilitaires pour les créneaux utilisant l'API centralisée

import { TimeslotData, TimeslotProposal } from '@/types/timeslots'
import { CalendarEvent } from '@/types/calendar'

// Type pour les créneaux locaux dans les composants
export interface LocalTimeSlot {
  id?: string;
  date: Date | null;
  startTime: string;
  endTime: string;
  status?: 'active' | 'deleted' | 'cancelled';
  isExisting?: boolean;
  wasModified?: boolean;
  originalData?: {
    date: Date | null;
    startTime: string;
    endTime: string;
  };
  createdBy?: string;
  modifiedBy?: Array<{
    userId: string;
    timestamp?: string;
    date?: string;
    action: 'created' | 'modified' | 'deleted' | 'invalidated' | 'approved' | 'rejected' | 'restored' | 'time_modified';
    note?: string;
    previousStartDate?: string | null;
    previousEndDate?: string | null;
    newStartDate?: string | null;
    newEndDate?: string | null;
    changes?: {
      previousStart?: string;
      previousEnd?: string;
      newStart?: string;
      newEnd?: string;
    };
  }>;
}

/**
 * Créer un nouveau créneau local
 */
export function createNewTimeSlot(
  userId: string,
  date?: Date,
  startTime: string = '08:00',
  endTime: string = '10:00'
): LocalTimeSlot {
  return {
    id: undefined, // Sera généré par l'API
    date: date || new Date(),
    startTime,
    endTime,
    status: 'active',
    isExisting: false,
    wasModified: false,
    createdBy: userId,
    modifiedBy: []
  }
}

/**
 * Mettre à jour un créneau local avec suivi des modifications
 */
export function updateTimeSlotWithTracking(
  slot: LocalTimeSlot,
  field: 'date' | 'startTime' | 'endTime',
  value: any,
  userId: string
): LocalTimeSlot {
  const updatedSlot = { ...slot }
  
  // Sauvegarder les données originales si ce n'est pas déjà fait
  if (!updatedSlot.originalData && updatedSlot.isExisting) {
    updatedSlot.originalData = {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime
    }
  }
  
  // Mettre à jour le champ
  if (field === 'date') {
    updatedSlot.date = value
  } else if (field === 'startTime') {
    updatedSlot.startTime = value
  } else if (field === 'endTime') {
    updatedSlot.endTime = value
  }
  
  // Marquer comme modifié si c'est un slot existant
  if (updatedSlot.isExisting) {
    updatedSlot.wasModified = true
  }
  
  return updatedSlot
}

/**
 * Vérifier et échanger les heures si nécessaire
 */
export function checkAndSwapTimes(
  slot: LocalTimeSlot,
  onSwapCallback?: (slot: LocalTimeSlot) => void
): { needsSwap: boolean; swappedSlot: LocalTimeSlot } {
  if (!slot.startTime || !slot.endTime) {
    return { needsSwap: false, swappedSlot: slot }
  }
  
  const startTime = new Date(`2000-01-01T${slot.startTime}:00`)
  const endTime = new Date(`2000-01-01T${slot.endTime}:00`)
  
  if (startTime >= endTime) {
    // Échanger les heures
    const swappedSlot = { ...slot }
    swappedSlot.startTime = slot.endTime
    swappedSlot.endTime = slot.startTime
    
    if (onSwapCallback) {
      onSwapCallback(swappedSlot)
    }
    
    return { needsSwap: true, swappedSlot }
  }
  
  return { needsSwap: false, swappedSlot: slot }
}

/**
 * Vérifier si l'utilisateur est propriétaire d'un événement
 */
export function isEventOwner(
  event: CalendarEvent,
  userId?: string,
  userEmail?: string
): boolean {
  if (!userId && !userEmail) return false
  if (!event.createdBy) return false
  
  if (userId && event.createdBy === userId) return true
  if (userEmail && event.createdBy === userEmail) return true
  
  return false
}

/**
 * Convertir les créneaux API vers le format local
 */
export function convertApiTimeslotsToLocalSlots(apiTimeslots: TimeslotData[]): LocalTimeSlot[] {
  return apiTimeslots.map(timeslot => {
    const startDate = new Date(timeslot.start_date)
    const endDate = new Date(timeslot.end_date)
    
    return {
      id: timeslot.id,
      date: startDate,
      startTime: startDate.toTimeString().slice(0, 5), // HH:mm
      endTime: endDate.toTimeString().slice(0, 5), // HH:mm
      status: timeslot.state === 'deleted' ? 'deleted' : 'active',
      isExisting: true,
      wasModified: timeslot.state === 'modified',
      originalData: {
        date: startDate,
        startTime: startDate.toTimeString().slice(0, 5),
        endTime: endDate.toTimeString().slice(0, 5)
      },
      createdBy: timeslot.user_id,
      modifiedBy: [] // À remplir depuis l'historique si nécessaire
    }
  })
}

/**
 * Convertir les créneaux locaux vers des propositions pour l'API
 */
export function convertLocalSlotsToProposals(
  slots: LocalTimeSlot[],
  eventId: string,
  discipline: 'chimie' | 'physique',
  userId: string
): TimeslotProposal[] {
  return slots
    .filter(slot => slot.status !== 'deleted' && slot.date)
    .map(slot => {
      const startDate = new Date(`${slot.date!.toISOString().split('T')[0]}T${slot.startTime}:00`)
      const endDate = new Date(`${slot.date!.toISOString().split('T')[0]}T${slot.endTime}:00`)
      
      return {
        id: slot.id,
        event_id: eventId,
        discipline,
        user_id: userId,
        state: slot.wasModified ? 'modified' : 'created',
        start_date: startDate.toISOString().slice(0, 19).replace('T', ' '), // Format MySQL
        end_date: endDate.toISOString().slice(0, 19).replace('T', ' '),
        timeslot_date: startDate.toISOString().slice(0, 10), // Format DATE
        notes: `Créneau ${slot.isExisting ? 'modifié' : 'créé'} via composant`,
        action: slot.isExisting ? 'modify' : 'create'
      } as TimeslotProposal
    })
}

/**
 * Validation des créneaux
 */
export function validateTimeSlots(slots: LocalTimeSlot[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Vérifier qu'il y a au moins un créneau valide
  const validSlots = slots.filter(slot => 
    slot.status !== 'deleted' && slot.date && slot.startTime && slot.endTime
  )
  
  if (validSlots.length === 0) {
    errors.push('Au moins un créneau horaire est requis')
  }
  
  // Vérifier les heures d'ouverture
  validSlots.forEach((slot, index) => {
    if (slot.startTime) {
      const [startHour] = slot.startTime.split(':').map(Number)
      if (startHour < 8) {
        warnings.push(`Créneau ${index + 1} : début avant 8h00`)
      }
    }
    
    if (slot.endTime) {
      const [endHour, endMinute] = slot.endTime.split(':').map(Number)
      if (endHour > 19 || (endHour === 19 && endMinute > 0)) {
        warnings.push(`Créneau ${index + 1} : fin après 19h00`)
      }
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Obtenir les créneaux actifs d'un événement (format legacy)
 * Cette fonction aide à la transition depuis l'ancien système
 */
export function getActiveTimeSlots(timeSlots: any[]): any[] {
  if (!Array.isArray(timeSlots)) return []
  
  return timeSlots.filter(slot => {
    return slot && (
      slot.status === 'active' ||
      slot.status === 'validated' ||
      slot.status === 'approved' ||
      !slot.status || // Slots sans status sont considérés actifs
      ((slot as any).state !== 'deleted' && (slot as any).state !== 'cancelled')
    )
  })
}

/**
 * Vérifier si un événement a des modifications en attente (format legacy)
 */
export function hasPendingChanges(event: CalendarEvent): boolean {
  if (!event.timeSlots || !Array.isArray(event.timeSlots)) return false
  
  return event.timeSlots.some(slot => {
    const anySlot = slot as any
    return slot && (
      anySlot.status === 'pending' ||
      anySlot.status === 'modified' ||
      anySlot.state === 'pending' ||
      anySlot.state === 'modified' ||
      (anySlot.modifiedBy && Array.isArray(anySlot.modifiedBy) && anySlot.modifiedBy.length > 0)
    )
  })
}

/**
 * Get display time slots from an event - Legacy compatibility
 */
export function getDisplayTimeSlots(event: any): any[] {
  if (!event) return [];
  
  // Gestion des différents formats de créneaux
  if (event.timeSlots && Array.isArray(event.timeSlots)) {
    return event.timeSlots.filter((slot: any) => 
      slot && !slot.is_deleted && slot.status !== 'deleted'
    );
  }
  
  // Format legacy avec slots directs
  if (event.slots && Array.isArray(event.slots)) {
    return event.slots.filter((slot: any) => 
      slot && !slot.is_deleted && slot.status !== 'deleted'
    );
  }
  
  // Créer un créneau par défaut si aucun disponible
  if (event.start && event.end) {
    return [{
      id: event.id || 'default',
      start_date: event.start,
      end_date: event.end,
      status: 'active'
    }];
  }
  
  return [];
}

/**
 * Traitement des données d'événement pour la sauvegarde
 */
export function processEventEdition(params: {
  formData: any;
  timeSlots: LocalTimeSlot[];
  originalEvent: CalendarEvent | null;
  userId: string;
  files: any[];
  remarks: string;
}): {
  validation: { isValid: boolean; errors: string[]; warnings: string[] };
  dataToSave: any;
  hasTimeslotChanges: boolean;
  hasOtherChanges: boolean;
} {
  const { formData, timeSlots, originalEvent, userId, files, remarks } = params
  
  // Validation
  const validation = validateTimeSlots(timeSlots)
  
  // Détecter les changements
  const hasTimeslotChanges = timeSlots.some(slot => 
    slot.wasModified || !slot.isExisting || slot.status === 'deleted'
  )
  
  const hasOtherChanges = originalEvent ? (
    formData.title !== (originalEvent.title || '') ||
    formData.description !== (originalEvent.description || '') ||
    formData.type !== (originalEvent.type || 'TP') ||
    JSON.stringify(formData.class_data) !== JSON.stringify(originalEvent.class_data || []) ||
    JSON.stringify(formData.room) !== JSON.stringify(originalEvent.room) ||
    JSON.stringify(formData.materials) !== JSON.stringify(originalEvent.materials || []) ||
    JSON.stringify(formData.chemicals) !== JSON.stringify(originalEvent.chemicals || []) ||
    formData.location !== (originalEvent.location || '') ||
    remarks !== (originalEvent.remarks || '')
  ) : true
  
  // Préparer les données pour la sauvegarde
  const dataToSave = {
    title: formData.title,
    description: formData.description,
    type: formData.type,
    state: formData.state,
    class_data: formData.class_data,
    room: formData.room,
    materials: formData.materials,
    chemicals: formData.chemicals,
    location: formData.location,
    remarks: remarks,
    files: files.map(f => f.existingFile || {
      fileName: f.file?.name,
      fileUrl: f.uploadedUrl,
      fileSize: f.file?.size,
      fileType: f.file?.type
    }).filter(Boolean)
  }
  
  return {
    validation,
    dataToSave,
    hasTimeslotChanges,
    hasOtherChanges
  }
}
