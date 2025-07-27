// /lib/utils/calculateForecastStock.ts
import { CalendarEvent } from '@/types/calendar'

interface ChemicalWithForecast extends Record<string, any> {
  id: string
  name: string
  quantity: number
  unit: string
  forecastQuantity?: number
  totalRequested?: number
}

export async function calculateChemicalsForecast(
  chemicals: any[],
  currentEventId?: string
): Promise<ChemicalWithForecast[]> {
  try {
    // Récupérer tous les événements
    const response = await fetch('/api/calendrier')
    const events: CalendarEvent[] = await response.json()
    
    // Filtrer les événements futurs ou en cours (excluant l'événement actuel si en édition)
    const now = new Date()
    const futureEvents = events.filter(event => {
      const eventDate = new Date(event.startDate)
      return eventDate >= now && event.id !== currentEventId
    })
    
    // Calculer les quantités demandées par réactif chimique
    const requestedQuantities = new Map<string, number>()
    
    futureEvents.forEach(event => {
      if (event.chemicals && Array.isArray(event.chemicals)) {
        event.chemicals.forEach((chem: any) => {
          if (typeof chem === 'object' && chem.id && chem.requestedQuantity) {
            const currentTotal = requestedQuantities.get(chem.id) || 0
            requestedQuantities.set(chem.id, currentTotal + (chem.requestedQuantity || 0))
          }
        })
      }
    })
    
    // Ajouter les informations de stock prévisionnel à chaque réactif chimique
    return chemicals.map(chemical => ({
      ...chemical,
      totalRequested: requestedQuantities.get(chemical.id) || 0,
      forecastQuantity: chemical.quantity - (requestedQuantities.get(chemical.id) || 0)
    }))
  } catch (error) {
    console.error('Erreur lors du calcul du stock prévisionnel:', error)
    // En cas d'erreur, retourner les produits chimiques sans prévision
    return chemicals.map(chemical => ({
      ...chemical,
      totalRequested: 0,
      forecastQuantity: chemical.quantity
    }))
  }
}