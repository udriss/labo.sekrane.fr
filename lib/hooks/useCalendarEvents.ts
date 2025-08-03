// hooks/useCalendarEvents.ts
import { useState, useEffect } from 'react'
import { CalendarEvent } from '@/types/calendar'

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/calendrier/chimie')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du calendrier')
      }
      
      const eventsData = await response.json()
      
      // Les événements n'ont plus de startDate/endDate directement
      // On les traite tels qu'ils viennent de l'API avec leurs timeSlots
      setEvents(eventsData)
    } catch (error) {
      console.error('Erreur lors du chargement du calendrier:', error)
      setError(error instanceof Error ? error.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  // Ajouter setEvents dans l'objet retourné
  return { events, loading, error, fetchEvents, setEvents }
}