// hooks/useCalendarData.ts
import { useState, useEffect } from 'react'

export function useCalendarData() {
  const [tpPresets, setTpPresets] = useState<any[]>([])

  const loadTpPresets = async () => {
    try {
      const response = await fetch('/api/tp-presets')
      if (!response.ok) throw new Error('Erreur lors du chargement des presets TP')
      const data = await response.json()
      setTpPresets(data.presets || [])
    } catch (error) {
      console.error('Erreur lors du chargement des presets TP:', error)
    }
  }

  useEffect(() => {
    loadTpPresets()
  }, [])

  return { tpPresets }
}