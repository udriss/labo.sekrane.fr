// lib/hooks/usePhysicsCalendarData.ts

import { useState, useCallback } from 'react'
import { CalendarEvent } from '@/types/calendar'

export const usePhysicsCalendarData = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      let url = '/api/calendrier/physique'
      const params = new URLSearchParams()
      
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }
      
      const physicsEvents = await response.json()
      console.log('Physics events loaded:', physicsEvents)
      setEvents(physicsEvents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des événements de physique')
      console.error('Error loading physics events:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const addEvent = useCallback((event: CalendarEvent) => {
    setEvents(prev => [...prev, event])
  }, [])

  const updateEvent = useCallback((updatedEvent: CalendarEvent) => {
    setEvents(prev => prev.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    ))
  }, [])

  const removeEvent = useCallback((eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId))
  }, [])

  return {
    events,
    loading,
    error,
    loadEvents,
    addEvent,
    updateEvent,
    removeEvent,
    setError
  }
}
