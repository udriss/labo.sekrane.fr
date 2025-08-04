import { NextRequest, NextResponse } from 'next/server'
import { getEventsForRoom } from '@/lib/calendar-utils-timeslots'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const room = searchParams.get('room')
    const date = searchParams.get('date')

    if (!room) {
      return NextResponse.json(
        { error: 'Le paramètre room est requis' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Le paramètre date est requis' },
        { status: 400 }
      )
    }

    const events = await getEventsForRoom(room, date, date)
    return NextResponse.json(events)
  } catch (error) {
    console.error('Erreur lors de la récupération des événements pour la salle:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des événements' },
      { status: 500 }
    )
  }
}
