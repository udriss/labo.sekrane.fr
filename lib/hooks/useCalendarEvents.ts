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
      const response = await fetch('/api/calendrier')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du calendrier')
      }
      
      const eventsData = await response.json()
      const eventsWithDates = eventsData.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }))
      
      setEvents(eventsWithDates)
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