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
      startDate, 
      endDate, 
      type,
      classes,
      materials,
      chemicals,
      fileName
    } = body

    // Validation des données
    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Les champs titre, date de début et date de fin sont requis' },
        { status: 400 }
      )
    }

    const { createCalendarEvent } = await import('@/lib/services/database')
    
    const eventData = {
      title,
      description: description || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type: type || 'TP',
      classes: classes || [],
      materials: materials || [],
      chemicals: chemicals || [],
      fileName: fileName || null
    }

    const newEvent = await createCalendarEvent(eventData)
    
    return NextResponse.json(newEvent, { status: 201 })
  } catch (error) {
    console.error('Erreur création event:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    )
  }
}
