// lib/calendar-utils-timeslots-client.ts
// Fonctions utilitaires pour TimeSlots - VERSION CLIENT UNIQUEMENT
// Pas d'accès à MySQL ou aux APIs serveur

import { generateTimeSlotId } from '@/lib/calendar-utils-client'
import { type RoomData } from '@/lib/calendar-utils-client-room'



// 🎯 Fonctions Principales
//// processEventEdition() - Fonction wrapper principale qui encapsule toute la logique
// 🔧 Fonctions Utilitaires
//// createNewTimeSlot() - Création nouveau créneau avec traçabilité
//// updateTimeSlotWithTracking() - Mise à jour avec détection modifications
//// checkAndSwapTimes() - Échange automatique des heures
//// isEventOwner() - Détection propriétaire d'événement


// Types pour les salles en tant qu'objets JSON
export interface RoomDataClient {
  id: string
  name: string
  capacity?: number
  description?: string
}

// Fonction pour normaliser les données de salle (string ou objet) - VERSION CLIENT
export function normalizeRoomData(room: string | RoomDataClient | null | undefined): RoomDataClient | null {
  if (!room) return null
  
  if (typeof room === 'string') {
    // Si c'est une chaîne, essayer de parser comme JSON
    if (room.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(room)
        return {
          id: parsed.id || parsed.name || room,
          name: parsed.name || room,
          capacity: parsed.capacity,
          description: parsed.description
        }
      } catch {
        // Si le parsing échoue, traiter comme nom simple
        return {
          id: room,
          name: room
        }
      }
    } else {
      // Nom simple de salle
      return {
        id: room,
        name: room
      }
    }
  }
  
  // Si c'est déjà un objet
  return {
    id: room.id || room.name || 'unknown',
    name: room.name || room.id || 'Salle inconnue',
    capacity: room.capacity,
    description: room.description
  }
}

// Fonction pour comparer deux room data - VERSION CLIENT
export function compareRoomData(room1: string | RoomDataClient | null | undefined, room2: string | RoomDataClient | null | undefined): boolean {
  if (!room1 && !room2) return true
  if (!room1 || !room2) return false
  
  const normalized1 = normalizeRoomData(room1)
  const normalized2 = normalizeRoomData(room2)
  
  if (!normalized1 || !normalized2) return false
  
  return normalized1.id === normalized2.id
}

// Fonction pour convertir un objet room en JSON string pour la base de données - VERSION CLIENT
export function serializeRoomData(room: RoomDataClient | null): string | null {
  if (!room) return null
  return JSON.stringify(room)
}

// ================================
// FONCTIONS CENTRALISÉES POUR GESTION DES TIMESLOTS - VERSION CLIENT
// Synthèse de toutes les modifications et corrections apportées
// ================================

/**
 * Fonction pour traiter les TimeSlots en mode édition avec modification par ID - VERSION CLIENT
 * NOUVEAU: Modifie les créneaux existants par ID au lieu de créer systématiquement de nouveaux créneaux
 * Historique des dates intégré dans modifiedBy avec previousStartDate/previousEndDate
 */
export function processTimeSlotEditionClient(
  timeSlots: any[],
  originalEvent: any,
  userId: string,
  formData?: any
): {
  mode: 'single' | 'multiple';
  processedTimeSlots: any[];
  logData: any;
} {
  // Filtrer les créneaux actifs
  const activeTimeSlots = timeSlots.filter(slot => slot.status !== 'deleted')
  
  // Déterminer le mode basé sur le nombre de créneaux actifs réels
  const mode = activeTimeSlots.length > 1 ? 'multiple' : 'single'
  
  const currentDate = new Date().toISOString()
  
  // Log de détection du mode
  const logData = {
    activeTimeSlotsCount: activeTimeSlots.length,
    mode: mode.toUpperCase(),
    modeChoisi: mode === 'multiple' ? 'MULTI-CRENEAUX' : 'CRENEAU-UNIQUE',
    timeSlots: activeTimeSlots
  }
  
  
  
  let processedTimeSlots: any[] = []
  
  if (mode === 'multiple') {
    // Mode multi-créneaux - NOUVEAU: Modification par ID avec historique dans modifiedBy
    
    
    // Traiter chaque créneau actif
    activeTimeSlots.forEach((slot: any, slotIndex: number) => {
      if (slot.date && slot.startTime && slot.endTime) {
        const startDateTime = new Date(slot.date)
        startDateTime.setHours(parseInt(slot.startTime.split(':')[0]), parseInt(slot.startTime.split(':')[1]))
        
        const endDateTime = new Date(slot.date)
        endDateTime.setHours(parseInt(slot.endTime.split(':')[0]), parseInt(slot.endTime.split(':')[1]))

        
        if (slot.isExisting && slot.id) {
          // NOUVEAU: Modifier le créneau existant par son ID au lieu de créer un nouveau
          const existingSlot = originalEvent?.timeSlots?.find((s: any) => s.id === slot.id)
          
          if (existingSlot) {
            // Vérifier si les heures ont changé pour ajouter à l'historique
            const originalStart = new Date(existingSlot.startDate)
            const originalEnd = new Date(existingSlot.endDate)
            
            const hasTimeChanged = 
              startDateTime.getTime() !== originalStart.getTime() ||
              endDateTime.getTime() !== originalEnd.getTime()
            

            // NOUVEAU: Conserver l'ID et modifier le créneau existant avec historique dans modifiedBy
            const newModifiedByEntry = hasTimeChanged ? {
              userId,
              timestamp: currentDate,
              action: 'time_modified' as const,
              previousStartDate: originalStart.toISOString(), // NOUVEAU: Historique des dates dans modifiedBy
              previousEndDate: originalEnd.toISOString(),     // NOUVEAU: Historique des dates dans modifiedBy
              newStartDate: startDateTime.toISOString(),
              newEndDate: endDateTime.toISOString(),
              changes: {
                previousStart: originalStart.toISOString(),
                previousEnd: originalEnd.toISOString(),
                newStart: startDateTime.toISOString(),
                newEnd: endDateTime.toISOString()
              }
            } : null
            
            processedTimeSlots.push({
              ...existingSlot,
              id: slot.id, // GARDER L'ID EXISTANT
              startDate: startDateTime.toISOString(),
              endDate: endDateTime.toISOString(),
              status: 'active' as const,
              // SUPPRIMÉ: startDateForecast et endDateForecast
              // NOUVEAU: Historique intégré dans modifiedBy
              modifiedBy: newModifiedByEntry ? [
                ...(existingSlot.modifiedBy || []),
                newModifiedByEntry
              ] : (existingSlot.modifiedBy || [])
            })
          } else {
            console.warn(`⚠️ Créneau existant avec ID ${slot.id} non trouvé, création d'un nouveau`)
            // Si l'ID existant n'est pas trouvé, créer un nouveau créneau
            processedTimeSlots.push({
              id: generateTimeSlotId(),
              startDate: startDateTime.toISOString(),
              endDate: endDateTime.toISOString(),
              status: 'active' as const,
              createdBy: slot.createdBy || userId,
              modifiedBy: [{
                userId,
                timestamp: currentDate,
                action: 'created' as const,
                previousStartDate: null, // Pas d'historique pour création
                previousEndDate: null,
                newStartDate: startDateTime.toISOString(),
                newEndDate: endDateTime.toISOString()
              }]
            })
          }
        } else {
          // Nouveau créneau - seulement quand vraiment nécessaire
          const newSlot = {
            id: generateTimeSlotId(),
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            status: 'active' as const,
            createdBy: slot.createdBy || userId,
            modifiedBy: [{
              userId,
              timestamp: currentDate,
              action: 'created' as const,
              previousStartDate: null, // Pas d'historique pour création
              previousEndDate: null,
              newStartDate: startDateTime.toISOString(),
              newEndDate: endDateTime.toISOString()
            }]
          }
          
          processedTimeSlots.push(newSlot)
        }
      }
    })
    
    // NOUVEAU: Gérer les créneaux supprimés - marquer ceux qui ne sont plus dans la liste active
    if (originalEvent?.timeSlots) {
      originalEvent.timeSlots.forEach((existingSlot: any) => {
        if (existingSlot.status === 'active') {
          // Vérifier si ce créneau existant est encore dans la liste active
          const stillActive = activeTimeSlots.find(slot => slot.id === existingSlot.id)
          if (!stillActive) {
            // Marquer comme supprimé avec historique dans modifiedBy
            processedTimeSlots.push({
              ...existingSlot,
              status: 'deleted' as const,
              modifiedBy: [
                ...(existingSlot.modifiedBy || []),
                {
                  userId,
                  timestamp: currentDate,
                  action: 'deleted' as const,
                  previousStartDate: existingSlot.startDate,
                  previousEndDate: existingSlot.endDate,
                  newStartDate: null, // Supprimé = pas de nouvelle date
                  newEndDate: null
                }
              ]
            })
            
            
          }
        } else {
          // Garder les slots déjà supprimés
          processedTimeSlots.push(existingSlot)
        }
      })
    }
    
  } else {
    // Mode créneau unique avec modification par ID - AMÉLIORÉ avec historique dans modifiedBy
    
    
    const activeTimeSlot = activeTimeSlots[0]
    
    if (activeTimeSlot && activeTimeSlot.date && activeTimeSlot.startTime && activeTimeSlot.endTime) {

      
      const startDateTime = new Date(activeTimeSlot.date)
      startDateTime.setHours(parseInt(activeTimeSlot.startTime.split(':')[0]), parseInt(activeTimeSlot.startTime.split(':')[1]))
      
      const endDateTime = new Date(activeTimeSlot.date)
      endDateTime.setHours(parseInt(activeTimeSlot.endTime.split(':')[0]), parseInt(activeTimeSlot.endTime.split(':')[1]))
      
      // NOUVEAU: Vérifier si le créneau actif est un créneau existant à modifier
      if (activeTimeSlot.isExisting && activeTimeSlot.id && originalEvent?.timeSlots) {
        const existingSlot = originalEvent.timeSlots.find((s: any) => s.id === activeTimeSlot.id)
        
        if (existingSlot) {
          // MODIFIER le créneau existant au lieu de créer un nouveau
          const originalStart = new Date(existingSlot.startDate)
          const originalEnd = new Date(existingSlot.endDate)
          
          const hasTimeChanged = 
            startDateTime.getTime() !== originalStart.getTime() ||
            endDateTime.getTime() !== originalEnd.getTime()
          
          // Modifier le créneau existant et conserver son ID avec historique dans modifiedBy
          const newModifiedByEntry = hasTimeChanged ? {
            userId,
            timestamp: currentDate,
            action: 'time_modified' as const,
            previousStartDate: originalStart.toISOString(),
            previousEndDate: originalEnd.toISOString(),
            newStartDate: startDateTime.toISOString(),
            newEndDate: endDateTime.toISOString(),
            changes: {
              previousStart: originalStart.toISOString(),
              previousEnd: originalEnd.toISOString(),
              newStart: startDateTime.toISOString(),
              newEnd: endDateTime.toISOString()
            }
          } : null
          
          processedTimeSlots.push({
            ...existingSlot,
            id: activeTimeSlot.id, // GARDER L'ID EXISTANT
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            status: 'active' as const,
            // NOUVEAU: Historique intégré dans modifiedBy
            modifiedBy: newModifiedByEntry ? [
              ...(existingSlot.modifiedBy || []),
              newModifiedByEntry
            ] : (existingSlot.modifiedBy || [])
          })
          
          // Marquer tous les autres créneaux existants comme supprimés
          originalEvent.timeSlots.forEach((slot: any) => {
            if (slot.id !== activeTimeSlot.id && slot.status === 'active') {
              processedTimeSlots.push({
                ...slot,
                status: 'deleted' as const,
                modifiedBy: [
                  ...(slot.modifiedBy || []),
                  {
                    userId,
                    timestamp: currentDate,
                    action: 'deleted' as const,
                    previousStartDate: slot.startDate,
                    previousEndDate: slot.endDate,
                    newStartDate: null,
                    newEndDate: null
                  }
                ]
              })
            } else if (slot.status !== 'active') {
              // Conserver les créneaux déjà supprimés
              processedTimeSlots.push(slot)
            }
          })
          
        } else {
          console.warn(`⚠️ Créneau existant avec ID ${activeTimeSlot.id} non trouvé en mode unique`)
          // Si l'ID existant n'est pas trouvé, traiter comme nouveau créneau
          createNewSingleSlot()
        }
      } else {
        // Nouveau créneau en mode unique
        createNewSingleSlot()
      }
      
      // Fonction helper pour créer un nouveau créneau unique avec historique dans modifiedBy
      function createNewSingleSlot() {
        // Marquer tous les anciens créneaux comme supprimés
        if (originalEvent?.timeSlots) {
          originalEvent.timeSlots.forEach((slot: any) => {
            if (slot.status === 'active') {
              processedTimeSlots.push({
                ...slot,
                status: 'deleted' as const,
                modifiedBy: [
                  ...(slot.modifiedBy || []),
                  {
                    userId,
                    timestamp: currentDate,
                    action: 'deleted' as const,
                    previousStartDate: slot.startDate,
                    previousEndDate: slot.endDate,
                    newStartDate: null,
                    newEndDate: null
                  }
                ]
              })
            } else {
              processedTimeSlots.push(slot)
            }
          })
        }
        
        // Ajouter le nouveau créneau avec historique dans modifiedBy
        const newSlot = {
          id: generateTimeSlotId(),
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          status: 'active' as const,
          createdBy: activeTimeSlot?.createdBy || userId,
          modifiedBy: [{
            userId,
            timestamp: currentDate,
            action: 'created' as const,
            previousStartDate: null,
            previousEndDate: null,
            newStartDate: startDateTime.toISOString(),
            newEndDate: endDateTime.toISOString()
          }]
        }
        processedTimeSlots.push(newSlot)
        
      }
      
    } else if (formData?.startDate && formData?.startTime && formData?.endTime) {
      // Fallback vers formData si aucun timeSlot actif trouvé - AMÉLIORÉ avec historique dans modifiedBy
      console.warn('🔍 [processTimeSlotEditionClient] FALLBACK - Aucun timeSlot actif, utilisation de formData')
      
      const startDateTime = new Date(formData.startDate)
      startDateTime.setHours(parseInt(formData.startTime.split(':')[0]), parseInt(formData.startTime.split(':')[1]))
      
      const endDateTime = new Date(formData.startDate)
      endDateTime.setHours(parseInt(formData.endTime.split(':')[0]), parseInt(formData.endTime.split(':')[1]))
      
      // Marquer tous les anciens créneaux comme supprimés
      if (originalEvent?.timeSlots) {
        originalEvent.timeSlots.forEach((slot: any) => {
          if (slot.status === 'active') {
            processedTimeSlots.push({
              ...slot,
              status: 'deleted' as const,
              modifiedBy: [
                ...(slot.modifiedBy || []),
                {
                  userId,
                  timestamp: currentDate,
                  action: 'deleted' as const,
                  previousStartDate: slot.startDate,
                  previousEndDate: slot.endDate,
                  newStartDate: null,
                  newEndDate: null
                }
              ]
            })
          } else {
            processedTimeSlots.push(slot)
          }
        })
      }
      
      // Ajouter le nouveau créneau avec historique dans modifiedBy
      const newSlot = {
        id: generateTimeSlotId(),
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        status: 'active' as const,
        createdBy: userId,
        modifiedBy: [{
          userId,
          timestamp: currentDate,
          action: 'created' as const,
          previousStartDate: null,
          previousEndDate: null,
          newStartDate: startDateTime.toISOString(),
          newEndDate: endDateTime.toISOString()
        }]
      }
      
      processedTimeSlots.push(newSlot)

    }
  }
  
  return {
    mode,
    processedTimeSlots,
    logData
  }
}

/**
 * Fonction pour préparer les données d'événement pour sauvegarde - VERSION CLIENT
 * Centralise toute la logique de préparation des données
 */
export function prepareEventDataForSaveClient(
  formData: any,
  timeSlots: any[],
  originalEvent: any,
  userId: string,
  files: any[] = [],
  remarks: string = ''
): {
  dataToSave: any;
  logData: any;
} {
  // Préparer les données de base
  const baseData = {
    id: originalEvent?.id,
    title: formData.title,
    description: formData.description,
    state: formData.state,
    type: formData.type,
    class_data: formData.class_data,
    room: serializeRoomData(formData.room),
    location: formData.location,
    materials: formData.materials.map((mat: any) => ({
      ...mat,
      quantity: mat.quantity || 1
    })),
    chemicals: formData.chemicals.map((chem: any) => ({
      ...chem,
      requestedQuantity: chem.requestedQuantity || 1
    })),
    files: files.map(f => f.existingFile || f.file).filter(Boolean),
    remarks: remarks,
    updatedAt: new Date().toISOString()
  }
  
  // Log des données de base
  const baseLogData = {
    eventId: originalEvent?.id,
    title: formData.title,
    description: formData.description,
    type: formData.type,
    chemicalsCount: formData.chemicals.length,
    chemicalsData: formData.chemicals,
    materialsCount: formData.materials.length,
    materialsData: formData.materials,
    roomData: formData.room,
    classData: formData.class_data,
    timeSlotsCount: timeSlots.length,
    activeTimeSlots: timeSlots.filter(slot => slot.status !== 'deleted')
  }
  
  
  
  // Traiter les TimeSlots
  const { mode, processedTimeSlots, logData } = processTimeSlotEditionClient(
    timeSlots,
    originalEvent,
    userId,
    formData
  )
  
  // Ajouter les TimeSlots aux données finales
  const dataToSave = {
    ...baseData,
    timeSlots: processedTimeSlots
  }
  
  // Log final des données
  const finalLogData = {
    eventId: dataToSave.id,
    title: dataToSave.title,
    timeSlotsCount: dataToSave.timeSlots?.length || 0,
    timeSlotsData: dataToSave.timeSlots,
    activeSlotsCount: dataToSave.timeSlots?.filter(slot => slot.status === 'active').length || 0,
    deletedSlotsCount: dataToSave.timeSlots?.filter(slot => slot.status === 'deleted').length || 0,
    chemicalsData: dataToSave.chemicals,
    materialsData: dataToSave.materials,
    mode,
    completeDataToSave: dataToSave
  }
  
  
  
  return {
    dataToSave,
    logData: {
      base: baseLogData,
      processing: logData,
      final: finalLogData
    }
  }
}

/**
 * Fonction pour déterminer si seuls les créneaux horaires ont changé - VERSION CLIENT
 * Utilisée pour décider entre modification directe ou proposition de déplacement
 */
export function hasOnlyTimeSlotsChangedClient(
  formData: any,
  originalEvent: any
): boolean {
  if (!originalEvent) return false
  
  return (
    formData.title === originalEvent.title &&
    formData.description === originalEvent.description &&
    formData.type === originalEvent.type &&
    JSON.stringify(formData.class_data) === JSON.stringify(originalEvent.class_data) &&
    compareRoomData(formData.room, originalEvent.room) &&
    formData.location === originalEvent.location &&
    JSON.stringify(formData.chemicals) === JSON.stringify(originalEvent.chemicals || []) &&
    JSON.stringify(formData.materials) === JSON.stringify(originalEvent.materials || [])
  )
}

/**
 * Fonction pour préparer les créneaux pour l'API de déplacement - VERSION CLIENT
 */
export function prepareTimeSlotsForMoveAPIClient(timeSlots: any[]): any[] {
  return timeSlots
    .filter(slot => slot.date && slot.startTime && slot.endTime && slot.status !== 'deleted')
    .map(slot => ({
      date: slot.date!.toISOString().split('T')[0],
      startTime: slot.startTime,
      endTime: slot.endTime
    }))
}

/**
 * Fonction utilitaire pour valider les créneaux horaires - VERSION CLIENT
 */
export function validateTimeSlotsClient(timeSlots: any[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = []
  const warnings: string[] = []
  const activeSlots = timeSlots.filter(slot => slot.status !== 'deleted')
  
  if (activeSlots.length === 0) {
    errors.push('Au moins un créneau horaire valide est requis')
  }
  
  // Vérifier chaque créneau
  activeSlots.forEach((slot, index) => {
    if (!slot.date) {
      errors.push(`Créneau ${index + 1} : Date manquante`)
    }
    if (!slot.startTime) {
      errors.push(`Créneau ${index + 1} : Heure de début manquante`)
    }
    if (!slot.endTime) {
      errors.push(`Créneau ${index + 1} : Heure de fin manquante`)
    }
    
    // Vérifier les heures d'ouverture
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
    
    // Vérifier que l'heure de fin est après l'heure de début
    if (slot.startTime && slot.endTime) {
      const start = new Date(`2000-01-01T${slot.startTime}`)
      const end = new Date(`2000-01-01T${slot.endTime}`)
      if (end <= start) {
        errors.push(`Créneau ${index + 1} : l'heure de fin doit être après l'heure de début`)
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
 * Fonction wrapper pour utilisation simple dans EditEventDialog - VERSION CLIENT
 * Encapsule toute la logique de traitement pour l'édition d'événements
 */
export function processEventEditionClient(params: {
  formData: any;
  timeSlots: any[];
  originalEvent: any;
  userId: string;
  files?: any[];
  remarks?: string;
}): {
  dataToSave: any;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  isOnlyTimeSlotChange: boolean;
  moveApiData?: any[];
} {
  const { formData, timeSlots, originalEvent, userId, files = [], remarks = '' } = params
  
  // Valider les créneaux
  const validation = validateTimeSlotsClient(timeSlots)
  
  if (!validation.isValid) {
    return {
      dataToSave: null,
      validation,
      isOnlyTimeSlotChange: false
    }
  }
  
  // Vérifier si seuls les créneaux ont changé
  const isOnlyTimeSlotChange = hasOnlyTimeSlotsChangedClient(formData, originalEvent)
  
  // Préparer les données pour sauvegarde
  const { dataToSave, logData } = prepareEventDataForSaveClient(
    formData,
    timeSlots,
    originalEvent,
    userId,
    files,
    remarks
  )
  
  // Préparer les données pour l'API de déplacement si nécessaire
  let moveApiData: any[] | undefined
  if (isOnlyTimeSlotChange) {
    moveApiData = prepareTimeSlotsForMoveAPIClient(timeSlots)
  }
  
  return {
    dataToSave,
    validation,
    isOnlyTimeSlotChange,
    moveApiData
  }
}

/**
 * Fonction pour détecter si un utilisateur est propriétaire d'un événement - VERSION CLIENT
 */
export function isEventOwnerClient(event: any, userId?: string, userEmail?: string): boolean {
  if (!event || (!userId && !userEmail)) return false
  
  // Vérifier par ID utilisateur
  if (userId && event.created_by === userId) return true
  
  // Vérifier par email si disponible
  if (userEmail && event.creator_email === userEmail) return true
  
  return false
}

/**
 * Fonction pour obtenir l'ID utilisateur actuel - VERSION CLIENT
 * Helper pour les composants client qui ont besoin de l'ID utilisateur
 */
export function getCurrentUserIdClient(): string {
  // En client, cet ID devra être fourni par le composant parent
  // ou récupéré depuis le contexte de session
  return 'CLIENT_USER_ID' // Placeholder - sera remplacé par la session réelle
}

/**
 * Fonction pour créer un nouveau TimeSlot vide - VERSION CLIENT
 */
export function createNewTimeSlotClient(
  userId: string,
  baseDate?: Date,
  startTime?: string,
  endTime?: string
): any {
  const defaultDate = baseDate || new Date()
  const defaultStartTime = startTime || '08:00'
  const defaultEndTime = endTime || '10:00'
  
  return {
    id: generateTimeSlotId(),
    date: defaultDate,
    startTime: defaultStartTime,
    endTime: defaultEndTime,
    status: 'active' as const,
    isExisting: false,
    wasModified: false,
    originalData: undefined,
    createdBy: userId,
    modifiedBy: [{
      userId,
      date: new Date().toISOString(),
      action: 'created' as const
    }]
  }
}

/**
 * Fonction pour mettre à jour un TimeSlot avec détection des modifications - VERSION CLIENT
 */
export function updateTimeSlotWithTrackingClient(
  timeSlot: any,
  field: 'date' | 'startTime' | 'endTime',
  value: any,
  userId: string
): any {
  const updatedSlot = { ...timeSlot }
  
  // Sauvegarder les valeurs originales pour détecter les changements
  const originalDate = updatedSlot.date
  const originalStartTime = updatedSlot.startTime
  const originalEndTime = updatedSlot.endTime
  
  if (field === 'date') {
    updatedSlot.date = value
  } else {
    updatedSlot[field] = value
  }
  
  // Détecter si le slot existant a été modifié de manière significative
  if (updatedSlot.isExisting && updatedSlot.originalData) {
    const hasDateChanged = updatedSlot.originalData.date && value && field === 'date' && 
      new Date(updatedSlot.originalData.date).toDateString() !== new Date(value).toDateString()
    
    const hasTimeChanged = 
      (field === 'startTime' && updatedSlot.originalData.startTime !== value) ||
      (field === 'endTime' && updatedSlot.originalData.endTime !== value)
    
    // Si la date ou l'heure a changé de manière significative, marquer comme nouveau slot
    if (hasDateChanged || hasTimeChanged) {
      updatedSlot.isExisting = false
      updatedSlot.wasModified = true
    }
  }
  
  return updatedSlot
}

/**
 * Fonction pour vérifier et échanger les heures si nécessaire - VERSION CLIENT
 */
export function checkAndSwapTimesClient(timeSlot: any, onSwapCallback?: (slot: any) => void): {
  needsSwap: boolean;
  swappedSlot?: any;
} {
  if (!timeSlot.startTime || !timeSlot.endTime) {
    return { needsSwap: false }
  }
  
  const start = new Date(`2000-01-01T${timeSlot.startTime}`)
  const end = new Date(`2000-01-01T${timeSlot.endTime}`)
  
  if (end < start) {
    const swappedSlot = {
      ...timeSlot,
      startTime: timeSlot.endTime,
      endTime: timeSlot.startTime
    }
    
    if (onSwapCallback) {
      onSwapCallback(swappedSlot)
    }
    
    return {
      needsSwap: true,
      swappedSlot
    }
  }
  
  return { needsSwap: false }
}
