// lib/hooks/useCalendarTimeSlots.ts
// Hook client-only pour la gestion du calendrier avec TimeSlots

import { useState, useCallback } from 'react'
import { CalendarEvent, EventState } from '@/types/calendar'

// Hook centralisé pour la gestion du calendrier avec TimeSlots (client-only)
export const useCalendarTimeSlots = (discipline: 'chimie' | 'physique') => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // API endpoints selon la discipline
  const getApiEndpoint = useCallback((path: string = '') => {
    return `/api/events${path}`
  }, [])

  // Charger tous les événements
  const loadEvents = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append('discipline', discipline) // Utiliser la nouvelle API centralisée
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const url = `${getApiEndpoint()}?${params.toString()}`
      console.log(`[useCalendarTimeSlots] Récupération des événements ${discipline} depuis:`, url)
      
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`)
      const result = await response.json()
      console.log(`[useCalendarTimeSlots] Événements ${discipline} récupérés:`, result)
      
      const eventsData = Array.isArray(result) ? result : (result.events || result)
      setEvents(Array.isArray(eventsData) ? eventsData : [])
    } catch (err) {
      console.error(`[useCalendarTimeSlots] Erreur chargement ${discipline}:`, err)
      setError(err instanceof Error ? err.message : `Erreur lors du chargement des événements de ${discipline}`)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [discipline, getApiEndpoint])

  // Créer un événement
  const createEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(getApiEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventData,
          discipline // Ajouter la discipline dans le body
        })
      })
      if (!response.ok) throw new Error('Erreur lors de la création')
      const result = await response.json()
      const newEvent = result.event || result
      setEvents(prev => [...prev, newEvent])
      return newEvent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
      throw err
    } finally {
      setLoading(false)
    }
  }, [getApiEndpoint, discipline])

  // Mettre à jour un événement
  const updateEvent = useCallback(async (eventId: string, updatedFields: Partial<CalendarEvent>) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${getApiEndpoint()}?id=${eventId}&discipline=${discipline}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedFields,
          discipline // Ajouter la discipline dans le body
        })
      })
      if (!response.ok) throw new Error('Erreur lors de la modification')
      const result = await response.json()
      const updatedEvent = result.event || result
      setEvents(prev => prev.map(ev => ev.id === eventId ? updatedEvent : ev))
      return updatedEvent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification')
      throw err
    } finally {
      setLoading(false)
    }
  }, [getApiEndpoint, discipline])

  // Supprimer un événement
  const deleteEvent = useCallback(async (eventId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${getApiEndpoint()}?id=${eventId}&discipline=${discipline}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Erreur lors de la suppression')
      setEvents(prev => prev.filter(ev => ev.id !== eventId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      throw err
    } finally {
      setLoading(false)
    }
  }, [getApiEndpoint, discipline])

  // Déplacer un événement (proposer nouveaux créneaux) - UTILISE L'API CENTRALISÉE
  const moveEvent = useCallback(async (eventId: string, timeSlots: any[], reason?: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/calendrier/move-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId,
          discipline: discipline,
          newTimeSlots: timeSlots, 
          reason 
        })
      })
      if (!response.ok) throw new Error('Erreur lors du déplacement')
      const result = await response.json()
      const updatedEvent = result.event || result
      setEvents(prev => prev.map(ev => ev.id === eventId ? updatedEvent : ev))
      return updatedEvent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du déplacement')
      throw err
    } finally {
      setLoading(false)
    }
  }, [discipline])

  // Changer l'état d'un événement
  const changeEventState = useCallback(async (eventId: string, newState: EventState, reason?: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${getApiEndpoint()}/state-change?id=${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newState, reason })
      })
      if (!response.ok) throw new Error('Erreur lors du changement d\'état')
      const result = await response.json()
      const updatedEvent = result.event || result
      setEvents(prev => prev.map(ev => ev.id === eventId ? updatedEvent : ev))
      return updatedEvent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement d\'état')
      throw err
    } finally {
      setLoading(false)
    }
  }, [getApiEndpoint])

  // Approuver/Rejeter les changements de créneaux - UTILISE L'API CENTRALISÉE
  const handleTimeSlotChanges = useCallback(async (eventId: string, action: 'approve' | 'reject') => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/calendrier/move-event', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId,
          discipline: discipline,
          action
        })
      })
      if (!response.ok) throw new Error(`Erreur lors de ${action === 'approve' ? 'l\'approbation' : 'du rejet'}`)
      const result = await response.json()
      const updatedEvent = result.event || result
      setEvents(prev => prev.map(ev => ev.id === eventId ? updatedEvent : ev))
      return updatedEvent
    } catch (err) {
      setError(err instanceof Error ? err.message : `Erreur lors de ${action === 'approve' ? 'l\'approbation' : 'du rejet'}`)
      throw err
    } finally {
      setLoading(false)
    }
  }, [discipline])

  return {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    moveEvent,
    changeEventState,
    handleTimeSlotChanges,
    setError,
    setEvents
  }
}
