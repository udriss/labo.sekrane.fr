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
    // TODO: Implémenter la création d'événement
    return NextResponse.json({ message: 'Non implémenté' }, { status: 501 })
  } catch (error) {
    console.error('Erreur création event:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    )
  }
}
