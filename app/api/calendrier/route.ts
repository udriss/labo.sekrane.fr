// app/api/calendrier/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { withAudit } from '@/lib/api/with-audit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';

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

// POST - Envelopper car c'est une création
export const POST = withAudit(
  async (request: NextRequest) => {
    // Récupérer la session pour obtenir l'utilisateur actuel
    const session = await getServerSession(authOptions)
    const userEmail = session?.user?.email
    const userId = session?.user?.id

    const body = await request.json()
    const { 
      title, 
      description, 
      date,
      timeSlots,
      startDate,
      endDate,
      type,
      classes,
      materials,
      chemicals,
      fileName,
      location,
      room,
      notes,
      equipment
    } = body

    // Validation des données
    if (!title) {
      return NextResponse.json(
        { error: 'Le titre est requis' },
        { status: 400 }
      )
    }

    // Support du nouveau format (date + timeSlots) et de l'ancien format
    let eventsToCreate = []

    if (date && timeSlots && Array.isArray(timeSlots)) {
      // Nouveau format pour les TP avec créneaux multiples
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
          room: room || null,
          location: location || null,
          materials: materials || [],
          chemicals: chemicals || [],
          equipment: equipment || [],
          fileName: fileName || null,
          notes: notes || null,
          createdBy: userId || null,
          modifiedBy: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    } else if (startDate && endDate) {
      // Ancien format ou événements laborantin
      eventsToCreate.push({
        id: `EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        description: description || null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        type: type || 'TP',
        class: classes ? (Array.isArray(classes) ? classes[0] : classes) : null,
        room: room || null,
        location: location || null,
        materials: materials || [],
        chemicals: chemicals || [],
        equipment: equipment || [],
        fileName: fileName || null,
        notes: notes || null,
        createdBy: userId || null,
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
  },
  {
    module: 'CALENDAR',
    entity: 'event',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.id || response?.[0]?.id,
    customDetails: (req, response) => ({
      eventTitle: response?.title || response?.[0]?.title,
      eventCount: Array.isArray(response) ? response.length : 1
    })
  }
)

// PUT - Envelopper car c'est une modification
export const PUT = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions)
    const userEmail = session?.user?.email
    const userRole = session?.user?.role
    const userId = session?.user?.id

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

    const event = calendarData.events[eventIndex]

    // Vérifier les permissions
    const canEdit = userRole === 'ADMIN' || 
                   userRole === 'ADMINLABO' || 
                   event.createdBy === userId

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de modifier cet événement' },
        { status: 403 }
      )
    }

    const body = await request.json()

    



    // Gérer le tableau modifiedBy avec le nouveau format
    const currentModifiedBy: Array<[string, ...string[]]> = event.modifiedBy || []
    const modificationDate = new Date().toISOString()
    
    // Trouver si l'utilisateur a déjà modifié
    const userIndex = currentModifiedBy.findIndex((entry: [string, ...string[]]) => entry[0] === userId)
    
    let updatedModifiedBy: Array<[string, ...string[]]>
    if (userIndex >= 0 && userId) {
      // L'utilisateur existe déjà, ajouter la nouvelle date
      updatedModifiedBy = [...currentModifiedBy]
      // Créer un nouveau tuple correctement typé
      const existingEntry = currentModifiedBy[userIndex]
      const [existingUserId, ...existingDates] = existingEntry
      updatedModifiedBy[userIndex] = [existingUserId, ...existingDates, modificationDate] as [string, ...string[]]
    } else if (userId) {
      // Nouvel utilisateur, créer une nouvelle entrée
      updatedModifiedBy = [...currentModifiedBy, [userId, modificationDate]]
    } else {
      updatedModifiedBy = currentModifiedBy
    }

    // Mettre à jour l'événement
    const updatedEvent = {
      ...event,
      ...body,
      modifiedBy: updatedModifiedBy,
      updatedAt: modificationDate
    }
    
    calendarData.events[eventIndex] = updatedEvent
    await writeCalendarFile(calendarData)
    
    return NextResponse.json(updatedEvent)
  },
  {
    module: 'CALENDAR',
    entity: 'event',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.id,
    extractEntityId: (req) => new URL(req.url).searchParams.get('id') || undefined,
    customDetails: (req, response) => ({
      modifiedByCount: response?.modifiedBy?.length || 0
    })
  }
)

// DELETE - Envelopper car c'est une suppression
export const DELETE = withAudit(
  async (request: NextRequest) => {
    // Récupérer la session pour vérifier les permissions
    const session = await getServerSession(authOptions)
    const userEmail = session?.user?.email
    const userRole = session?.user?.role
    const userId = session?.user?.id

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

    const event = calendarData.events[eventIndex]

    // Vérifier les permissions
    const canDelete = userRole === 'ADMIN' || 
                     userRole === 'ADMINLABO' || 
                     event.createdBy === userId

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de supprimer cet événement' },
        { status: 403 }
      )
    }

    // Supprimer l'événement
    const deletedEvent = calendarData.events.splice(eventIndex, 1)[0]
    await writeCalendarFile(calendarData)
    
    return NextResponse.json({ message: 'Événement supprimé', event: deletedEvent })
  },
  {
    module: 'CALENDAR',
    entity: 'event',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.event?.id,
    extractEntityId: (req) => new URL(req.url).searchParams.get('id') || undefined
  }
)