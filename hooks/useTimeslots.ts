// Hook pour la gestion des créneaux
// Fichier : hooks/useTimeslots.ts

import { useState, useCallback } from 'react'
import {
  TimeslotData,
  TimeslotProposal,
  TimeslotValidation,
  TimeslotApiResponse,
  TimeslotType,
  Discipline,
  UseTimeslotsReturn
} from '@/types/timeslots'

export function useTimeslots(): UseTimeslotsReturn {
  const [timeslots, setTimeslots] = useState<TimeslotData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fonction pour appeler l'API avec gestion d'erreurs
  const apiCall = useCallback(async (url: string, options?: RequestInit) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur réseau' }))
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }

    return response.json()
  }, [])

  // Récupérer les créneaux d'un événement
  const getTimeslots = useCallback(async (
    eventId: string,
    discipline: Discipline,
    type: TimeslotType = 'active'
  ): Promise<TimeslotData[]> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        event_id: eventId,
        discipline: discipline,
        type: type
      })

      const url = `/api/timeslots?${params}`
      console.log('🔍 [useTimeslots] Requête vers:', url)
      console.log('🔍 [useTimeslots] Paramètres:', { eventId, discipline, type })

      const response: TimeslotApiResponse = await apiCall(url)
      
      console.log('📊 [useTimeslots] Réponse API complète:', response)
      console.log('📊 [useTimeslots] Timeslots dans la réponse:', response.timeslots)
      console.log('📊 [useTimeslots] Nombre de timeslots:', response.timeslots?.length || 0)
      
      const timeslotsData = response.timeslots || []
      setTimeslots(timeslotsData)
      
      console.log('✅ [useTimeslots] Timeslots mis à jour dans le state:', timeslotsData.length)
      
      return timeslotsData

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la récupération des créneaux'
      setError(errorMessage)
      console.error('❌ [useTimeslots] Erreur getTimeslots:', {
        error: err,
        eventId,
        discipline,
        type,
        errorMessage,
        errorStack: err instanceof Error ? err.stack : undefined,
        errorName: err instanceof Error ? err.name : undefined
      })
      
      // Retourner un tableau vide en cas d'erreur
      return []
      return []
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Proposer de nouveaux créneaux
  const proposeTimeslots = useCallback(async (
    eventId: string,
    discipline: Discipline,
    proposals: TimeslotProposal[]
  ): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response: TimeslotApiResponse = await apiCall('/api/timeslots', {
        method: 'POST',
        body: JSON.stringify({
          event_id: eventId,
          discipline: discipline,
          proposals: proposals
        })
      })

      // Optionnel : mettre à jour la liste locale
      if (response.timeslots) {
        setTimeslots(prev => [...prev, ...response.timeslots])
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la proposition des créneaux'
      setError(errorMessage)
      console.error('Erreur proposeTimeslots:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Approuver des créneaux
  const approveTimeslots = useCallback(async (
    validations: TimeslotValidation[]
  ): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const approvalValidations = validations.map(v => ({ ...v, action: 'approve' as const }))
      
      await apiCall('/api/timeslots', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'validate',
          validations: approvalValidations
        })
      })

      // Mettre à jour les créneaux locaux
      setTimeslots(prev => prev.map(timeslot => {
        const validation = validations.find(v => v.id === timeslot.id)
        if (validation) {
          return { ...timeslot, state: 'approved' }
        }
        return timeslot
      }))

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'approbation des créneaux'
      setError(errorMessage)
      console.error('Erreur approveTimeslots:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Rejeter des créneaux
  const rejectTimeslots = useCallback(async (
    validations: TimeslotValidation[]
  ): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const rejectionValidations = validations.map(v => ({ ...v, action: 'reject' as const }))
      
      await apiCall('/api/timeslots', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'validate',
          validations: rejectionValidations
        })
      })

      // Mettre à jour les créneaux locaux
      setTimeslots(prev => prev.map(timeslot => {
        const validation = validations.find(v => v.id === timeslot.id)
        if (validation) {
          return { ...timeslot, state: 'rejected' }
        }
        return timeslot
      }))

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du rejet des créneaux'
      setError(errorMessage)
      console.error('Erreur rejectTimeslots:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Supprimer un créneau
  const deleteTimeslot = useCallback(async (
    timeslotId: string,
    reason?: string
  ): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ id: timeslotId })
      if (reason) {
        params.append('reason', reason)
      }

      await apiCall(`/api/timeslots?${params}`, {
        method: 'DELETE'
      })

      // Retirer le créneau de la liste locale ou marquer comme supprimé
      setTimeslots(prev => prev.map(timeslot => 
        timeslot.id === timeslotId 
          ? { ...timeslot, state: 'deleted' }
          : timeslot
      ))

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression du créneau'
      setError(errorMessage)
      console.error('Erreur deleteTimeslot:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Mettre à jour un créneau
  const updateTimeslot = useCallback(async (
    timeslotId: string,
    updates: Partial<Pick<TimeslotData, 'start_date' | 'end_date' | 'notes'>>
  ): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiCall('/api/timeslots', {
        method: 'PATCH',
        body: JSON.stringify({
          timeslot_id: timeslotId,
          updates: updates
        })
      })

      // Mettre à jour le créneau local
      if (response.timeslot) {
        setTimeslots(prev => prev.map(timeslot => 
          timeslot.id === timeslotId 
            ? response.timeslot
            : timeslot
        ))
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour du créneau'
      setError(errorMessage)
      console.error('Erreur updateTimeslot:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Rafraîchir la liste des créneaux
  const refreshTimeslots = useCallback(async (): Promise<void> => {
    // Cette fonction nécessite de connaître l'eventId et discipline
    // Elle peut être appelée après avoir défini ces valeurs via getTimeslots
    setError(null)
    // La logique de rafraîchissement sera implémentée selon les besoins
  }, [])

  // Obtenir les statistiques des créneaux
  const getTimeslotsSummary = useCallback(async (
    eventId: string,
    discipline: Discipline
  ): Promise<TimeslotApiResponse['summary']> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        event_id: eventId,
        discipline: discipline,
        type: 'summary'
      })

      const response: TimeslotApiResponse = await apiCall(`/api/timeslots?${params}`)
      return response.summary

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la récupération des statistiques'
      setError(errorMessage)
      console.error('Erreur getTimeslotsSummary:', err)
      return undefined
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  return {
    timeslots,
    loading,
    error,
    getTimeslots,
    proposeTimeslots,
    approveTimeslots,
    rejectTimeslots,
    deleteTimeslot,
    refreshTimeslots,
    // Fonctions additionnelles
    updateTimeslot,
    getTimeslotsSummary
  }
}

// Hook spécialisé pour un événement spécifique
export function useEventTimeslots(eventId: string, discipline: Discipline) {
  const timeslotsHook = useTimeslots()
  
  const [lastEventId, setLastEventId] = useState<string>()
  const [lastDiscipline, setLastDiscipline] = useState<Discipline>()

  // Rafraîchir automatiquement si l'événement ou la discipline change
  const refreshTimeslots = useCallback(async () => {
    if (eventId && discipline && (eventId !== lastEventId || discipline !== lastDiscipline)) {
      await timeslotsHook.getTimeslots(eventId, discipline, 'active')
      setLastEventId(eventId)
      setLastDiscipline(discipline)
    }
  }, [eventId, discipline, lastEventId, lastDiscipline, timeslotsHook])

  return {
    ...timeslotsHook,
    refreshTimeslots
  }
}
