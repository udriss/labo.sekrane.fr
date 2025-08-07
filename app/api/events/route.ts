// API centralisée pour la gestion des événements
// Fichier : app/api/events/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { CalendarEvent } from '@/types/calendar'
import { Discipline } from '@/types/timeslots'

// Importation des fonctions existantes pour maintenir la compatibilité
import {
  getChemistryEventsWithTimeSlots,
  createChemistryEventWithTimeSlots,
  updateChemistryEventWithTimeSlots,
  getChemistryEventByIdWithTimeSlots
} from '@/lib/calendar-utils-timeslots'

// Importation des utilitaires nécessaires
import { 
  parseClassDataSafe,
  getClassNameFromClassData,
  normalizeClassField,
  createClassDataFromString,
  type ClassData 
} from '@/lib/class-data-utils'

// Fonction utilitaire pour parser le JSON de manière sécurisée
function parseJsonSafe<T>(jsonString: string | null | undefined | any, defaultValue: T): T {
  try {
    if (!jsonString || jsonString === 'null' || jsonString === 'undefined') {
      return defaultValue
    }
    
    // Si c'est déjà un objet (pas une chaîne), le retourner directement
    if (typeof jsonString === 'object') {
      return jsonString as T
    }
    
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.warn('Erreur lors du parsing JSON:', error, 'String:', jsonString)
    return defaultValue
  }
}

// Note: Pour l'instant, utilisons les mêmes fonctions pour physique
// TODO: Créer calendar-utils-physique-timeslots.ts si nécessaire

// GET - Récupérer les événements d'une discipline
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const discipline = searchParams.get('discipline') as Discipline
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const eventId = searchParams.get('id')

    if (!discipline || !['chimie', 'physique'].includes(discipline)) {
      return NextResponse.json(
        { error: 'Discipline requise (chimie ou physique)' },
        { status: 400 }
      )
    }

    // Si un ID spécifique est demandé
    if (eventId) {
      // Pour l'instant, utilisons la même fonction pour les deux disciplines
      const event = await getChemistryEventByIdWithTimeSlots(eventId)
      
      if (!event) {
        return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 })
      }
      
      return NextResponse.json(event)
    }

    // Récupérer tous les événements de la discipline
    // Pour l'instant, utilisons la même fonction pour les deux disciplines
    const events = await getChemistryEventsWithTimeSlots(
      startDate || undefined, 
      endDate || undefined
    )

    // Convertir les événements DB en format CalendarEvent pour l'API (comme dans /api/calendrier/chimie)
    const convertedEvents = events.map(dbEvent => {
      // Les données sont déjà parsées dans getChemistryEventsWithTimeSlots
      const timeSlots = dbEvent.timeSlots || []
      const actuelTimeSlots = dbEvent.actuelTimeSlots || []
      
      // Normaliser les données de classe (support legacy + nouveau format)
      const classData = normalizeClassField(dbEvent.class_data)

      return {
        id: dbEvent.id,
        title: dbEvent.title,
        description: dbEvent.description,
        type: dbEvent.type.toUpperCase() === 'TP' ? 'TP' : 
              dbEvent.type.toUpperCase() === 'MAINTENANCE' ? 'MAINTENANCE' :
              dbEvent.type.toUpperCase() === 'INVENTORY' ? 'INVENTORY' : 'OTHER',
        state: dbEvent.state || 'VALIDATED',
        timeSlots: timeSlots,
        actuelTimeSlots: actuelTimeSlots,
        class: getClassNameFromClassData(classData), // Pour compatibilité legacy
        class_data: Array.isArray(classData) ? classData : (classData ? [classData] : []), // Toujours un tableau
        room: dbEvent.room,
        materials: parseJsonSafe(dbEvent.equipment_used, []).map((item: any) => {
          if (typeof item === 'string') {
            return { id: item, name: item };
          }
          return {
            id: item.id || item,
            name: item.name || item.itemName || (typeof item === 'string' ? item : 'Matériel'),
            itemName: item.itemName || item.name,
            quantity: item.quantity || 1,
            volume: item.volume,
            isCustom: item.isCustom || false
          };
        }),
        chemicals: parseJsonSafe(dbEvent.chemicals_used, []).map((item: any) => {
          if (typeof item === 'string') {
            return { id: item, name: item };
          }
          return {
            id: item.id || item,
            name: item.name || (typeof item === 'string' ? item : 'Réactif'),
            requestedQuantity: item.requestedQuantity || 1,
            quantity: item.quantity,
            unit: item.unit,
            isCustom: item.isCustom || false,
            formula: item.formula
          };
        }),
        remarks: dbEvent.notes,
        createdBy: dbEvent.createdBy,
        createdAt: dbEvent.created_at,
        updatedAt: dbEvent.updated_at,
        stateChangeReason: dbEvent.stateChangeReason,
        lastStateChange: dbEvent.lastStateChange,
        validationState: dbEvent.validationState || 'noPending'
      }
    })

    return NextResponse.json(convertedEvents)

  } catch (error) {
    console.error('Erreur GET /api/events:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des événements' },
      { status: 500 }
    )
  }
}

// POST - Créer un événement
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    console.log('API /events. Session:', session)

    const body = await request.json()
    const { discipline, timeSlots, ...eventData } = body

    if (!discipline || !['chimie', 'physique'].includes(discipline)) {
      return NextResponse.json(
        { error: 'Discipline requise (chimie ou physique)' },
        { status: 400 }
      )
    }

    // Calculer start_date et end_date à partir des timeSlots si fournis
    let calculatedStartDate = eventData.start_date
    let calculatedEndDate = eventData.end_date

    if (timeSlots && Array.isArray(timeSlots) && timeSlots.length > 0) {
      // Trouver la date/heure de début la plus tôt
      const earliestSlot = timeSlots.reduce((earliest, slot) => {
        if (!slot.date || !slot.startTime) return earliest
        const slotDateTime = new Date(`${slot.date}T${slot.startTime}:00`)
        const earliestDateTime = earliest ? new Date(`${earliest.date}T${earliest.startTime}:00`) : null
        
        return !earliestDateTime || slotDateTime < earliestDateTime ? slot : earliest
      }, null)

      // Trouver la date/heure de fin la plus tard
      const latestSlot = timeSlots.reduce((latest, slot) => {
        if (!slot.date || !slot.endTime) return latest
        const slotDateTime = new Date(`${slot.date}T${slot.endTime}:00`)
        const latestDateTime = latest ? new Date(`${latest.date}T${latest.endTime}:00`) : null
        
        return !latestDateTime || slotDateTime > latestDateTime ? slot : latest
      }, null)

      if (earliestSlot && latestSlot) {
        calculatedStartDate = `${earliestSlot.date}T${earliestSlot.startTime}:00`
        calculatedEndDate = `${latestSlot.date}T${latestSlot.endTime}:00`
      }
    }

    // Valider que nous avons des dates
    if (!calculatedStartDate || !calculatedEndDate) {
      return NextResponse.json(
        { error: 'Dates de début et fin requises (soit directement, soit via timeSlots)' },
        { status: 400 }
      )
    }

    // Ajouter l'utilisateur créateur et les dates calculées
    const eventWithCreator = {
      ...eventData,
      start_date: calculatedStartDate,
      end_date: calculatedEndDate,
      timeSlots, // Conserver les timeSlots pour le traitement
      createdBy: session.user.id
    }

    // Créer l'événement selon la discipline
    // Pour l'instant, utilisons la même fonction pour les deux disciplines
    console.log('API /events. Création de l\'événement:', eventWithCreator)
    const newEvent = await createChemistryEventWithTimeSlots(eventWithCreator)

    return NextResponse.json(newEvent, { status: 201 })

  } catch (error) {
    console.error('Erreur POST /api/events:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un événement
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { id, discipline, ...eventData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      )
    }

    if (!discipline || !['chimie', 'physique'].includes(discipline)) {
      return NextResponse.json(
        { error: 'Discipline requise (chimie ou physique)' },
        { status: 400 }
      )
    }

    // Mettre à jour l'événement selon la discipline
    // Pour l'instant, utilisons la même fonction pour les deux disciplines
    const updatedEvent = await updateChemistryEventWithTimeSlots(id, eventData)

    return NextResponse.json(updatedEvent)

  } catch (error) {
    console.error('Erreur PUT /api/events:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un événement
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const discipline = searchParams.get('discipline') as Discipline

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      )
    }

    if (!discipline || !['chimie', 'physique'].includes(discipline)) {
      return NextResponse.json(
        { error: 'Discipline requise (chimie ou physique)' },
        { status: 400 }
      )
    }

    // Importer la fonction de suppression
    const { deleteChemistryEvent } = await import('@/lib/calendar-utils')
    // Note: Il faudrait aussi avoir deletePhysiqueEvent

    if (discipline === 'chimie') {
      await deleteChemistryEvent(id)
    } else {
      // await deletePhysiqueEvent(id)
      throw new Error('Suppression physique non implémentée')
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur DELETE /api/events:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
}
