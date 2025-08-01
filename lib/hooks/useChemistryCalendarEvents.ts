// lib/hooks/useChemistryCalendarEvents.ts

import { useCallback } from 'react'
import { CalendarEvent } from '@/types/calendar'

interface UseChemistryCalendarEventsProps {
  addEvent: (event: CalendarEvent) => void
  updateEvent: (event: CalendarEvent) => void
  removeEvent: (eventId: string) => void
  setError: (error: string | null) => void
}

export const useChemistryCalendarEvents = (calendarData: UseChemistryCalendarEventsProps) => {
  const createEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    try {
      if (!eventData.title || !eventData.timeSlots?.[0]) {
        throw new Error('Données manquantes pour créer l\'événement')
      }

      const response = await fetch('/api/calendrier/chimie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description,
          timeSlots: eventData.timeSlots,
          type: eventData.type,
          room: eventData.room,
          class: eventData.class,
          materials: eventData.materials,
          chemicals: eventData.chemicals,
          remarks: eventData.remarks
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la création')
      }

      const createdEvent = await response.json()
      calendarData.addEvent(createdEvent)
      return createdEvent
    } catch (error) {
      calendarData.setError(error instanceof Error ? error.message : 'Erreur lors de la création de l\'événement')
      throw error
    }
  }, [calendarData])

  const updateEvent = useCallback(async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      const response = await fetch('/api/calendrier/chimie', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: eventId,
          title: updates.title,
          description: updates.description,
          timeSlots: updates.timeSlots,
          type: updates.type,
          room: updates.room,
          class: updates.class,
          materials: updates.materials,
          chemicals: updates.chemicals,
          remarks: updates.remarks
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la mise à jour')
      }

      const updatedEvent = await response.json()
      calendarData.updateEvent(updatedEvent)
      return updatedEvent
    } catch (error) {
      calendarData.setError(error instanceof Error ? error.message : 'Erreur lors de la mise à jour de l\'événement')
      throw error
    }
  }, [calendarData])

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const response = await fetch(`/api/calendrier/chimie?id=${eventId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      calendarData.removeEvent(eventId)
    } catch (error) {
      calendarData.setError(error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'événement')
      throw error
    }
  }, [calendarData])

  const moveEvent = useCallback(async (eventId: string, newStartDate: string, newEndDate: string) => {
    try {
      const response = await fetch(`/api/calendrier/chimie/move-event?id=${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newStartDate,
          newEndDate
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors du déplacement')
      }

      const updatedEvent = await response.json()
      calendarData.updateEvent(updatedEvent)
      return updatedEvent
    } catch (error) {
      calendarData.setError(error instanceof Error ? error.message : 'Erreur lors du déplacement de l\'événement')
      throw error
    }
  }, [calendarData])

  const changeEventState = useCallback(async (eventId: string, newState: string) => {
    try {
      const response = await fetch(`/api/calendrier/chimie/state-change?id=${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newState
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors du changement d\'état')
      }

      const updatedEvent = await response.json()
      calendarData.updateEvent(updatedEvent)
      return updatedEvent
    } catch (error) {
      calendarData.setError(error instanceof Error ? error.message : 'Erreur lors du changement d\'état de l\'événement')
      throw error
    }
  }, [calendarData])

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    moveEvent,
    changeEventState
  }
}
