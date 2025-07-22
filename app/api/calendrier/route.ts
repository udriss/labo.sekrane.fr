import { NextRequest, NextResponse } from 'next/server'
import { getCalendarEvents } from '@/lib/services/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let events
    if (startDate && endDate) {
      const { getCalendarEventsForPeriod } = await import('@/lib/services/database')
      events = await getCalendarEventsForPeriod(new Date(startDate), new Date(endDate))
    } else {
      events = await getCalendarEvents()
    }

    return NextResponse.json(events)
  } catch (error) {
    console.error('Erreur API calendar:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du calendrier' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      title, 
      description, 
      date,
      timeSlots,
      startDate, // Pour la rétrocompatibilité
      endDate,   // Pour la rétrocompatibilité
      type,
      classes,
      materials,
      chemicals,
      fileName
    } = body

    // Validation des données - nouveau format avec créneaux ou ancien format
    if (!title) {
      return NextResponse.json(
        { error: 'Le titre est requis' },
        { status: 400 }
      )
    }

    // Support du nouveau format (date + timeSlots) et de l'ancien format (startDate/endDate)
    let eventsToCreate = []

    if (date && timeSlots && Array.isArray(timeSlots)) {
      // Nouveau format : créer un événement pour chaque créneau
      for (const slot of timeSlots) {
        if (!slot.startTime || !slot.endTime) {
          return NextResponse.json(
            { error: 'Tous les créneaux doivent avoir une heure de début et de fin' },
            { status: 400 }
          )
        }

        const startDateTime = new Date(`${date}T${slot.startTime}`)
        const endDateTime = new Date(`${date}T${slot.endTime}`)

        eventsToCreate.push({
          title,
          description: description || null,
          startDate: startDateTime,
          endDate: endDateTime,
          type: type || 'TP',
          classes: classes || [],
          materials: materials || [],
          chemicals: chemicals || [],
          fileName: fileName || null
        })
      }
    } else if (startDate && endDate) {
      // Ancien format : rétrocompatibilité
      eventsToCreate.push({
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: type || 'TP',
        classes: classes || [],
        materials: materials || [],
        chemicals: chemicals || [],
        fileName: fileName || null
      })
    } else {
      return NextResponse.json(
        { error: 'Format de données invalide. Utilisez soit (date + timeSlots) soit (startDate + endDate)' },
        { status: 400 }
      )
    }

    const { createCalendarEvent } = await import('@/lib/services/database')
    
    // Créer tous les événements
    const newEvents = []
    for (const eventData of eventsToCreate) {
      const newEvent = await createCalendarEvent(eventData)
      newEvents.push(newEvent)
    }
    
    return NextResponse.json(newEvents.length === 1 ? newEvents[0] : newEvents, { status: 201 })
  } catch (error) {
    console.error('Erreur création event:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    )
  }
}
