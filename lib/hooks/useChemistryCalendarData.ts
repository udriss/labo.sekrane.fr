// lib/hooks/useChemistryCalendarData.ts

import { useState, useEffect, useCallback } from 'react'
import { CalendarEvent } from '@/types/calendar'

interface CalendarData {
  events: CalendarEvent[]
  loading: boolean
  error: string | null
}

export const useChemistryCalendarData = () => {
  const [data, setData] = useState<CalendarData>({
    events: [],
    loading: true,
    error: null
  })

  const loadEvents = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }))
      
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const url = `/api/calendrier/chimie${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors du chargement')
      }
      
      const events = await response.json()
      setData(prev => ({ ...prev, events, loading: false }))
    } catch (error) {
      setData(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Erreur lors du chargement des événements'
      }))
    }
  }, [])

  const addEvent = useCallback((event: CalendarEvent) => {
    setData(prev => ({
      ...prev,
      events: [...prev.events, event]
    }))
  }, [])

  const updateEvent = useCallback((updatedEvent: CalendarEvent) => {
    setData(prev => ({
      ...prev,
      events: prev.events.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      )
    }))
  }, [])

  const removeEvent = useCallback((eventId: string) => {
    setData(prev => ({
      ...prev,
      events: prev.events.filter(event => event.id !== eventId)
    }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setData(prev => ({ ...prev, error }))
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  return {
    ...data,
    loadEvents,
    addEvent,
    updateEvent,
    removeEvent,
    setError
  }
}
