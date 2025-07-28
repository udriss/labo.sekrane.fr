// app/api/calendrier/reject-timeslots/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readCalendarFile, writeCalendarFile } from '@/lib/calendar-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { eventId } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      )
    }

    // Lire les données existantes
    const calendarData = await readCalendarFile()
    const eventIndex = calendarData.events.findIndex((e: any) => e.id === eventId)

    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    const event = calendarData.events[eventIndex]

    // Vérifier que l'utilisateur est le créateur
    if (event.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Seul le créateur peut rejeter les changements' },
        { status: 403 }
      )
    }

    // Rejeter : remettre timeSlots aux valeurs des actuelTimeSlots
    // D'abord, marquer tous les timeSlots actuels comme supprimés
    const updatedTimeSlots = event.timeSlots.map((slot: any) => ({
      ...slot,
      status: 'deleted',
      modifiedBy: [
        ...slot.modifiedBy,
        {
          userId,
          date: new Date().toISOString(),
          action: 'deleted' as const
        }
      ]
    }))

    // Puis recréer les timeSlots à partir des actuelTimeSlots
    const restoredTimeSlots = event.actuelTimeSlots.map((slot: any) => ({
      ...slot,
      status: 'active',
      modifiedBy: [
        ...(slot.modifiedBy || []),
        {
          userId,
          date: new Date().toISOString(),
          action: 'created' as const
        }
      ]
    }))

    calendarData.events[eventIndex] = {
      ...event,
      timeSlots: [...updatedTimeSlots, ...restoredTimeSlots],
      state: 'VALIDATED', // Retour aux créneaux validés -> VALIDATED
      updatedAt: new Date().toISOString()
    }

    // Sauvegarder
    await writeCalendarFile(calendarData)

    return NextResponse.json({ 
      success: true, 
      message: 'Créneaux rejetés, restauration des créneaux précédents',
      event: calendarData.events[eventIndex]
    })

  } catch (error) {
    console.error('Erreur API reject-timeslots:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
