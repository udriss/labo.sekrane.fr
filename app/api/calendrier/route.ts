import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const CALENDAR_FILE = path.join(process.cwd(), 'data', 'calendar.json')

// Fonction pour lire le fichier calendrier
async function readCalendarFile() {
  try {
    const data = await fs.readFile(CALENDAR_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Erreur lecture fichier calendar:', error)
    return { events: [] }
  }
}

// Fonction pour écrire dans le fichier calendrier
async function writeCalendarFile(data: any) {
  try {
    await fs.writeFile(CALENDAR_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Erreur écriture fichier calendar:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const calendarData = await readCalendarFile()
    let events = calendarData.events || []

    // Filtrage par période si demandé
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      events = events.filter((event: any) => {
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        return eventStart <= end && eventEnd >= start
      })
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
          id: `EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title,
          description: description || null,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          type: type || 'TP',
          class: classes ? (Array.isArray(classes) ? classes[0] : classes) : null,
          room: null,
          materials: materials || [],
          chemicals: chemicals || [],
          fileName: fileName || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    } else if (startDate && endDate) {
      // Ancien format : rétrocompatibilité
      eventsToCreate.push({
        id: `EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        description: description || null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        type: type || 'TP',
        class: classes ? (Array.isArray(classes) ? classes[0] : classes) : null,
        room: null,
        materials: materials || [],
        chemicals: chemicals || [],
        fileName: fileName || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        { error: 'Format de données invalide. Utilisez soit (date + timeSlots) soit (startDate + endDate)' },
        { status: 400 }
      )
    }

    // Lire le fichier existant et ajouter les nouveaux événements
    const calendarData = await readCalendarFile()
    const newEvents = []
    
    for (const eventData of eventsToCreate) {
      calendarData.events.push(eventData)
      newEvents.push(eventData)
    }
    
    // Sauvegarder le fichier
    await writeCalendarFile(calendarData)
    
    return NextResponse.json(newEvents.length === 1 ? newEvents[0] : newEvents, { status: 201 })
  } catch (error) {
    console.error('Erreur création event:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const calendarData = await readCalendarFile()
    
    const eventIndex = calendarData.events.findIndex((event: any) => event.id === eventId)
    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour l'événement
    const updatedEvent = {
      ...calendarData.events[eventIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    calendarData.events[eventIndex] = updatedEvent
    await writeCalendarFile(calendarData)
    
    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Erreur mise à jour event:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      )
    }

    const calendarData = await readCalendarFile()
    const eventIndex = calendarData.events.findIndex((event: any) => event.id === eventId)
    
    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer l'événement
    const deletedEvent = calendarData.events.splice(eventIndex, 1)[0]
    await writeCalendarFile(calendarData)
    
    return NextResponse.json({ message: 'Événement supprimé', event: deletedEvent })
  } catch (error) {
    console.error('Erreur suppression event:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
}
