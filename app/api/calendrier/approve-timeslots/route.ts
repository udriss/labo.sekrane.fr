// app/api/calendrier/approve-timeslots/route.ts

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
        { error: 'Seul le créateur peut approuver les changements' },
        { status: 403 }
      )
    }

    // Approuver : mettre à jour actuelTimeSlots avec les timeSlots actifs
    const activeTimeSlots = event.timeSlots.filter((slot: any) => slot.status === 'active')
    
    // Conserver tous les créneaux proposés dans actuelTimeSlots
    calendarData.events[eventIndex] = {
      ...event,
      actuelTimeSlots: activeTimeSlots.map((slot: any) => ({
        ...slot,
        modifiedBy: [
          ...(slot.modifiedBy || []),
          {
            userId,
            date: new Date().toISOString(),
            action: 'approved' as const
          }
        ]
      })),
      state: 'VALIDATED', // Tous les créneaux approuvés -> VALIDATED
      updatedAt: new Date().toISOString()
    }

    // Sauvegarder
    await writeCalendarFile(calendarData)

    return NextResponse.json({ 
      success: true, 
      message: 'Créneaux approuvés avec succès',
      event: calendarData.events[eventIndex]
    })

  } catch (error) {
    console.error('Erreur API approve-timeslots:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
