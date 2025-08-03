// lib/hooks/useEventMove.ts
// Hook personnalisé pour gérer les déplacements d'événements

import { useState, useCallback } from 'react'
import { CalendarEvent } from '@/types/calendar'
import { proposeEventMove } from '@/lib/calendar-move-utils'

interface UseEventMoveReturn {
  moveEvent: (
    eventId: string,
    discipline: 'chimie' | 'physique',
    newTimeSlots: Array<{
      date: string
      startTime: string
      endTime: string
    }>,
    reason?: string
  ) => Promise<{
    success: boolean
    event?: CalendarEvent
    isOwner?: boolean
    message?: string
    error?: string
  }>
  loading: boolean
  error: string | null
}

export function useEventMove(): UseEventMoveReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const moveEvent = useCallback(async (
    eventId: string,
    discipline: 'chimie' | 'physique',
    newTimeSlots: Array<{
      date: string
      startTime: string
      endTime: string
    }>,
    reason?: string
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await proposeEventMove(eventId, discipline, newTimeSlots, reason)
      
      if (!result.success) {
        setError(result.error || 'Erreur lors du déplacement')
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inattendue'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    moveEvent,
    loading,
    error
  }
}
