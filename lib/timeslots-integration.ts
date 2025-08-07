// Couche d'intégration pour la gestion des créneaux
// Fichier : lib/timeslots-integration.ts

import {
  createTimeslot,
  updateExistingTimeslot,
  getActiveTimeslots,
  getTimeslotsByEventId,
  proposeNewTimeslots,
  markTimeslotAsDeleted,
  approveTimeslot,
  rejectTimeslot,
  getTimeslotStats,
  dateUtils
} from '@/lib/timeslots-database'

import {
  TimeslotData,
  TimeslotProposal,
  TimeslotValidation,
  TimeslotState,
  Discipline,
  TimeslotApiResponse,
  TimeslotType
} from '@/types/timeslots'

// Configuration par défaut
const DEFAULT_CONFIG = {
  autoCleanup: false, // Désactivé comme demandé
  validationRequired: true,
  maxTimeslotsPerEvent: 50,
  allowOverlapping: false
}

// Traitement de création de créneaux sans cleanup automatique
export async function processTimeSlotCreationNew(
  eventId: string,
  discipline: Discipline,
  userId: string,
  eventOwner: string,
  proposals: TimeslotProposal[],
  allowPastDates: boolean = false
): Promise<TimeslotApiResponse> {
  try {
    // Valider les propositions
    const validationErrors = validateTimeslotProposals(proposals, allowPastDates)
    if (validationErrors.length > 0) {
      // Retourner un objet avec les erreurs au lieu de lever une exception
      return {
        timeslots: [],
        summary: {
          total: 0,
          active: 0,
          pending: 0,
          approved: 0
        },
        meta: {
          event_id: eventId,
          discipline: discipline,
          type: 'active'
        },
        errors: validationErrors,
        success: false
      }
    }
    
    // Vérifier le nombre maximum de créneaux
    const existingTimeslots = await getTimeslotsByEventId(eventId, discipline)
    const totalAfterCreation = existingTimeslots.length + proposals.filter(p => p.action === 'create').length
    
    if (totalAfterCreation > DEFAULT_CONFIG.maxTimeslotsPerEvent) {
      return {
        timeslots: [],
        summary: {
          total: 0,
          active: 0,
          pending: 0,
          approved: 0
        },
        meta: {
          event_id: eventId,
          discipline: discipline,
          type: 'active'
        },
        errors: [{
          field: 'proposals',
          message: `Nombre maximum de créneaux dépassé (${DEFAULT_CONFIG.maxTimeslotsPerEvent})`
        }],
        success: false
      }
    }
    
    // Vérifier les chevauchements si non autorisés
    if (!DEFAULT_CONFIG.allowOverlapping) {
      const overlaps = checkForOverlaps(proposals, existingTimeslots)
      if (overlaps.length > 0) {
        return {
          timeslots: [],
          summary: {
            total: 0,
            active: 0,
            pending: 0,
            approved: 0
          },
          meta: {
            event_id: eventId,
            discipline: discipline,
            type: 'active'
          },
          errors: overlaps.map(overlap => ({
            field: 'proposals',
            message: overlap
          })),
          success: false
        }
      }
    }
    
    // Traiter les propositions sans cleanup automatique
    const processedTimeslots = await proposeNewTimeslots(
      eventId,
      discipline,
      userId,
      eventOwner,
      proposals
    )
    
    // Récupérer les statistiques
    const stats = await getTimeslotStats(eventId, discipline)
    
    return {
      timeslots: processedTimeslots,
      summary: {
        total: stats.total,
        active: stats.active,
        pending: stats.pending,
        approved: stats.approved
      },
      meta: {
        event_id: eventId,
        discipline: discipline,
        type: 'active'
      },
      success: true
    }
    
  } catch (error) {
    console.error('Erreur lors du traitement des créneaux:', error)
    throw error
  }
}

// Validation des propositions de créneaux
export async function validateTimeslotProposal(
  timeslotId: string,
  validatorId: string,
  validation: TimeslotValidation
): Promise<TimeslotData> {
  try {
    let result: TimeslotData
    
    if (validation.action === 'approve') {
      result = await approveTimeslot(timeslotId, validatorId, validation.reason)
    } else if (validation.action === 'reject') {
      result = await rejectTimeslot(timeslotId, validatorId, validation.reason)
    } else {
      throw new Error('Action de validation non supportée')
    }
    
    return result
    
  } catch (error) {
    console.error('Erreur lors de la validation du créneau:', error)
    throw error
  }
}

// Validation en lot de plusieurs créneaux
export async function validateMultipleTimeslots(
  validations: TimeslotValidation[],
  validatorId: string
): Promise<TimeslotData[]> {
  const results: TimeslotData[] = []
  const errors: string[] = []
  
  for (const validation of validations) {
    try {
      const result = await validateTimeslotProposal(
        validation.id,
        validatorId,
        validation
      )
      results.push(result)
    } catch (error) {
      errors.push(`Erreur pour ${validation.id}: ${error}`)
    }
  }
  
  if (errors.length > 0) {
    console.warn('Erreurs lors de la validation en lot:', errors)
  }
  
  return results
}

// Récupérer les créneaux selon le type demandé
export async function getTimeslotsByType(
  eventId: string,
  discipline: Discipline,
  type: TimeslotType = 'active',
  userId?: string
): Promise<TimeslotApiResponse> {
  try {
    console.log('🔍 [getTimeslotsByType] Début avec paramètres:', {
      eventId,
      discipline,
      type,
      userId
    })
    
    let timeslots: TimeslotData[]
    
    switch (type) {
      case 'active':
        console.log('📊 [getTimeslotsByType] Appel getActiveTimeslots...')
        timeslots = await getActiveTimeslots(eventId, discipline, userId)
        console.log('📊 [getTimeslotsByType] getActiveTimeslots retourné:', timeslots?.length || 0, 'créneaux')
        break
        
      case 'pending':
        console.log('📊 [getTimeslotsByType] Appel getTimeslotsByEventId pour pending...')
        timeslots = await getTimeslotsByEventId(eventId, discipline, ['created', 'modified'])
        console.log('📊 [getTimeslotsByType] getTimeslotsByEventId(pending) retourné:', timeslots?.length || 0, 'créneaux')
        break
        
      case 'all':
        console.log('📊 [getTimeslotsByType] Appel getTimeslotsByEventId pour all...')
        timeslots = await getTimeslotsByEventId(eventId, discipline)
        console.log('📊 [getTimeslotsByType] getTimeslotsByEventId(all) retourné:', timeslots?.length || 0, 'créneaux')
        break
        
      case 'summary':
        console.log('📊 [getTimeslotsByType] Mode summary - récupération stats...')
        // Pour le summary, on récupère juste les stats
        const stats = await getTimeslotStats(eventId, discipline)
        console.log('📊 [getTimeslotsByType] Stats récupérées:', stats)
        return {
          timeslots: [],
          summary: {
            total: stats.total,
            active: stats.active,
            pending: stats.pending,
            approved: stats.approved
          },
          meta: {
            event_id: eventId,
            discipline: discipline,
            type: type
          }
        }
        
      default:
        console.error('❌ [getTimeslotsByType] Type non supporté:', type)
        throw new Error(`Type de créneau non supporté: ${type}`)
    }
    
    console.log('📊 [getTimeslotsByType] Créneaux récupérés:', {
      count: timeslots?.length || 0,
      timeslots: timeslots
    })
    
    // Calculer les statistiques
    console.log('📊 [getTimeslotsByType] Calcul des statistiques...')
    const stats = await getTimeslotStats(eventId, discipline)
    console.log('📊 [getTimeslotsByType] Statistiques calculées:', stats)
    
    // Sanitize timeslots pour éviter les erreurs de sérialisation JSON
    const sanitizedTimeslots = timeslots?.map(slot => {
      // Convertir les dates en strings si nécessaire
      const sanitizeDate = (date: any) => {
        if (date instanceof Date) return date.toISOString()
        if (typeof date === 'string') return date
        return date
      }
      
      return {
        ...slot,
        timeslot_date: sanitizeDate(slot.timeslot_date),
        start_date: sanitizeDate(slot.start_date),
        end_date: sanitizeDate(slot.end_date),
        created_at: sanitizeDate(slot.created_at),
        updated_at: sanitizeDate(slot.updated_at)
      }
    }) || []
    
    const result = {
      timeslots: sanitizedTimeslots,
      summary: {
        total: stats.total,
        active: stats.active,
        pending: stats.pending,
        approved: stats.approved
      },
      meta: {
        event_id: eventId,
        discipline: discipline,
        type: type
      }
    }
    
    console.log('✅ [getTimeslotsByType] Résultat final:', result)
    
    return result
    
  } catch (error) {
    console.error('❌ [getTimeslotsByType] Erreur lors de la récupération des créneaux:', error)
    throw error
  }
}

// Supprimer logiquement un créneau
export async function deleteTimeslotLogically(
  timeslotId: string,
  userId: string,
  reason?: string
): Promise<TimeslotData> {
  try {
    return await markTimeslotAsDeleted(timeslotId, userId, reason)
  } catch (error) {
    console.error('Erreur lors de la suppression du créneau:', error)
    throw error
  }
}

// Restaurer un créneau supprimé
export async function restoreDeletedTimeslot(
  timeslotId: string,
  userId: string,
  reason?: string
): Promise<TimeslotData> {
  // Cette fonction devra être implémentée dans timeslots-database.ts
  // Pour l'instant, on simule la restauration
  throw new Error('Fonction de restauration non encore implémentée')
}

// Utilitaires de validation

// Valider les propositions de créneaux
function validateTimeslotProposals(
  proposals: TimeslotProposal[], 
  allowPastDates: boolean = false
): Array<{field: string, message: string}> {
  const errors: Array<{field: string, message: string}> = []
  
  proposals.forEach((proposal, index) => {
    // Vérifier les dates
    if (!dateUtils.validateDateRange(proposal.start_date, proposal.end_date)) {
      errors.push({
        field: `proposals[${index}].dates`,
        message: 'La date de fin doit être après la date de début'
      })
    }
    
    // Vérifier que la date n'est pas dans le passé (sauf si autorisé)
    if (!allowPastDates) {
      const proposalDate = new Date(proposal.timeslot_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (proposalDate < today) {
        errors.push({
          field: `proposals[${index}].timeslot_date`,
          message: 'La date du créneau ne peut pas être dans le passé'
        })
      }
    }
    
    // Vérifier les champs obligatoires
    if (!proposal.event_id) {
      errors.push({
        field: `proposals[${index}].event_id`,
        message: 'ID d\'événement requis'
      })
    }
    
    if (!proposal.discipline) {
      errors.push({
        field: `proposals[${index}].discipline`,
        message: 'Discipline requise'
      })
    }
    
    if (!proposal.user_id) {
      errors.push({
        field: `proposals[${index}].user_id`,
        message: 'ID utilisateur requis'
      })
    }
  })
  
  return errors
}

// Vérifier les chevauchements de créneaux
function checkForOverlaps(
  newProposals: TimeslotProposal[],
  existingTimeslots: TimeslotData[]
): string[] {
  const overlaps: string[] = []
  
  // Filtrer les créneaux actifs existants
  const activeTimeslots = existingTimeslots.filter(slot => 
    ['created', 'modified', 'approved', 'restored'].includes(slot.state)
  )
  
  // Vérifier chaque nouvelle proposition
  newProposals.forEach((proposal, proposalIndex) => {
    if (proposal.action === 'delete') return // Ignorer les suppressions
    
    const proposalStart = new Date(proposal.start_date)
    const proposalEnd = new Date(proposal.end_date)
    
    // Vérifier contre les créneaux existants
    activeTimeslots.forEach(existing => {
      if (existing.timeslot_date === proposal.timeslot_date) {
        const existingStart = new Date(existing.start_date)
        const existingEnd = new Date(existing.end_date)
        
        // Vérifier le chevauchement
        if (proposalStart < existingEnd && proposalEnd > existingStart) {
          overlaps.push(`Proposition ${proposalIndex} chevauche avec le créneau ${existing.id}`)
        }
      }
    })
    
    // Vérifier contre les autres propositions
    newProposals.forEach((otherProposal, otherIndex) => {
      if (
        proposalIndex !== otherIndex && 
        otherProposal.action !== 'delete' &&
        proposal.timeslot_date === otherProposal.timeslot_date
      ) {
        const otherStart = new Date(otherProposal.start_date)
        const otherEnd = new Date(otherProposal.end_date)
        
        if (proposalStart < otherEnd && proposalEnd > otherStart) {
          overlaps.push(`Proposition ${proposalIndex} chevauche avec la proposition ${otherIndex}`)
        }
      }
    })
  })
  
  return overlaps
}

// Grouper les créneaux par date
export function groupTimeslotsByDate(timeslots: TimeslotData[]): Record<string, TimeslotData[]> {
  return timeslots.reduce((groups, timeslot) => {
    const date = timeslot.timeslot_date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(timeslot)
    return groups
  }, {} as Record<string, TimeslotData[]>)
}

// Convertir TimeslotData vers le format TimeSlot legacy pour compatibilité
export function convertTimeslotDataToLegacyTimeSlot(timeslot: TimeslotData): any {
  return {
    id: timeslot.id,
    start: timeslot.start_date,
    end: timeslot.end_date,
    date: timeslot.timeslot_date,
    notes: timeslot.notes,
    state: timeslot.state,
    userId: timeslot.user_id,
    createdAt: timeslot.created_at,
    updatedAt: timeslot.updated_at
  }
}

// Convertir un tableau de TimeslotData vers le format legacy
export function convertTimeslotsToLegacyFormat(timeslots: TimeslotData[]): any[] {
  return timeslots.map(convertTimeslotDataToLegacyTimeSlot)
}
