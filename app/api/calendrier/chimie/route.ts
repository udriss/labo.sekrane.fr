// app/api/calendrier/chimie/route.ts// API mise à jour pour le système TimeSlots completexport const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { 
  getChemistryEventsWithTimeSlots, 
  createChemistryEventWithTimeSlots, 
  updateChemistryEventWithTimeSlots,
  getChemistryEventByIdWithTimeSlots
} from '@/lib/calendar-utils-timeslots'
import { deleteChemistryEvent } from '@/lib/calendar-utils'
import { TimeSlot, CalendarEvent } from '@/types/calendar'
import { generateTimeSlotId } from '@/lib/calendar-utils-client'

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

// GET - Récupérer les événements de chimie
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Utiliser la nouvelle fonction avec support TimeSlots
    const events = await getChemistryEventsWithTimeSlots(startDate || undefined, endDate || undefined)

    // Convertir les événements DB en format CalendarEvent pour l'API
    const convertedEvents = events.map(dbEvent => {
      // Les données sont déjà parsées dans getChemistryEventsWithTimeSlots
      const timeSlots = dbEvent.timeSlots || []
      const actuelTimeSlots = dbEvent.actuelTimeSlots || []

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
        class: dbEvent.class_name,
        room: dbEvent.room,
        materials: parseJsonSafe(dbEvent.equipment_used, []).map((id: any) => ({ id, name: id })),
        chemicals: parseJsonSafe(dbEvent.chemicals_used, []).map((id: any) => ({ id, name: id })),
        remarks: dbEvent.notes,
        createdBy: dbEvent.created_by,
        createdAt: dbEvent.created_at,
        updatedAt: dbEvent.updated_at,
        stateChangeReason: dbEvent.stateChangeReason,
        lastStateChange: dbEvent.lastStateChange,
        validationState: dbEvent.validationState || 'noPending'
      }
    })

    return NextResponse.json(convertedEvents)

  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des événements' },
      { status: 500 }
    )
  }
}

// POST - Créer un événement de chimie avec support TimeSlots complet
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      title,
      description,
      timeSlots,
      type,
      room,
      class: className,
      classes,
      materials,
      equipment,
      chemicals,
      remarks
    } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Titre requis' },
        { status: 400 }
      )
    }

    if (!timeSlots || timeSlots.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un créneau horaire est requis' },
        { status: 400 }
      )
    }

    // Vérifier que chaque timeSlot a bien startTime et endTime
    const validSlots = timeSlots.filter((slot: any) => slot.startTime && slot.endTime)
    console.log('Création d\'événement avec les créneaux:', body)
    if (validSlots.length === 0) {
      return NextResponse.json(
        { error: 'Chaque créneau doit avoir une date de début et de fin valide' },
        { status: 400 }
      )
    }

    // Générer les TimeSlots complexes avec support multi-date
    const generatedTimeSlots: TimeSlot[] = validSlots.map((slot: any, i: number) => {
      // Utiliser slot.date si présent, sinon date par défaut (aujourd'hui)
      const slotDate = slot.date || body.date || new Date().toISOString().split('T')[0]
      
      // Valider et nettoyer les heures
      const startTime = slot.startTime?.trim()
      const endTime = slot.endTime?.trim()
      
      if (!startTime || !endTime) {
        throw new Error(`Heures manquantes pour le créneau ${i + 1}: startTime="${startTime}", endTime="${endTime}"`)
      }
      
      // Construire les dates ISO complètes - s'assurer que c'est bien formaté
      const startDate = `${slotDate}T${startTime}:00.000Z`
      const endDate = `${slotDate}T${endTime}:00.000Z`
      
      // Log pour debug
      console.log('Création TimeSlot:', { slotDate, startTime, endTime, startDate, endDate })
      
      return {
        id: generateTimeSlotId(),
        startDate,
        endDate,
        status: 'active' as const,
        createdBy: session.user.id,
        modifiedBy: [{
          userId: session.user.id,
          date: new Date().toISOString(),
          action: 'created' as const
        }],
        // Ajouter les nouveaux champs optionnels du TimeSlot
        actuelTimeSlotsReferent: slot.actuelTimeSlotsReferent,
        referentActuelTimeID: slot.referentActuelTimeID
      }
    })

    // À la création, actuelTimeSlots = timeSlots
    const actuelTimeSlots = [...generatedTimeSlots]
    const firstSlot = generatedTimeSlots[0]

    // Validation des dates avant insertion
    if (!firstSlot || !firstSlot.startDate || !firstSlot.endDate) {
      console.error('Erreur: TimeSlot invalide', { firstSlot, validSlots, body })
      return NextResponse.json(
        { error: 'Erreur lors de la génération des créneaux horaires' },
        { status: 400 }
      )
    }

    // Créer l'événement avec les nouveaux champs
    const eventData = {
      title,
      start_date: firstSlot.startDate,
      end_date: firstSlot.endDate,
      description: description || '',
      type: type?.toLowerCase() || 'other',
      status: 'scheduled' as const,
      state: 'PENDING' as const,
      room: room || '',
      teacher: session.user.name || '',
      class_name: className || classes?.[0] || '',
      participants: [],
      equipment_used: (materials || equipment || []).map((m: any) => 
        typeof m === 'string' ? m : m.id || m.name || ''
      ),
      chemicals_used: (chemicals || []).map((c: any) => 
        typeof c === 'string' ? c : c.id || c.name || ''
      ),
      notes: remarks || description || '',
      color: '#2196f3',
      created_by: session.user.id,
      timeSlots: generatedTimeSlots,
      actuelTimeSlots: actuelTimeSlots,
      lastStateChange: {
        from: 'PENDING',
        to: 'VALIDATED',
        date: new Date().toISOString(),
        userId: session.user.id,
        reason: 'Création automatique'
      }
    }

    const createdEvent = await createChemistryEventWithTimeSlots(eventData)
    console.log('Événement créé:', createdEvent)

    // Retourner le format attendu par le frontend
    const responseEvent = {
      id: createdEvent.id,
      title: createdEvent.title,
      description: createdEvent.description,
      type: createdEvent.type.toUpperCase() === 'TP' ? 'TP' : 
            createdEvent.type.toUpperCase() === 'MAINTENANCE' ? 'MAINTENANCE' :
            createdEvent.type.toUpperCase() === 'INVENTORY' ? 'INVENTORY' : 'OTHER',
      state: createdEvent.state,
      timeSlots: createdEvent.timeSlots,
      actuelTimeSlots: createdEvent.actuelTimeSlots,
      class: createdEvent.class_name,
      room: createdEvent.room,
      materials: parseJsonSafe(createdEvent.equipment_used, []).map((id: any) => ({ id, name: id })),
      chemicals: parseJsonSafe(createdEvent.chemicals_used, []).map((id: any) => ({ id, name: id })),
      remarks: createdEvent.notes,
      createdBy: createdEvent.created_by,
      createdAt: createdEvent.created_at,
      updatedAt: createdEvent.updated_at,
      lastStateChange: createdEvent.lastStateChange
    }

    return NextResponse.json(responseEvent, { status: 201 })

  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'événement' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un événement de chimie avec support TimeSlots complet
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { 
      id, 
      title, 
      description, 
      timeSlots, 
      type, 
      room, 
      class: className, 
      materials, 
      chemicals, 
      remarks,
      state,
      stateChangeReason 
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      )
    }

    // Récupérer l'événement existant
    const existingEvent = await getChemistryEventByIdWithTimeSlots(id)
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Préparer les données de mise à jour
    const updateData: any = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (type !== undefined) updateData.type = type.toLowerCase()
    if (room !== undefined) updateData.room = room
    if (className !== undefined) updateData.class_name = className
    if (remarks !== undefined) updateData.notes = remarks
    if (state !== undefined) {
      updateData.state = state === 'VALIDATED' ? 'PENDING' : state
    }
    console.log('Mise à jour de l\'événement avec les données:', body)  
    if (stateChangeReason !== undefined) updateData.stateChangeReason = stateChangeReason

    // Gestion des matériaux et produits chimiques
    if (materials !== undefined) {
      updateData.equipment_used = materials.map((m: any) => 
        typeof m === 'string' ? m : m.id || m.name || ''
      )
    }
    if (chemicals !== undefined) {
      updateData.chemicals_used = chemicals.map((c: any) => 
        typeof c === 'string' ? c : c.id || c.name || ''
      )
    }

    // Gestion des TimeSlots
    if (timeSlots !== undefined) {
      const processedTimeSlots = timeSlots.map((slot: any) => ({
        ...slot,
        id: slot.id || generateTimeSlotId(),
        modifiedBy: [
          ...(slot.modifiedBy || []),
          {
            userId: session.user.id,
            date: new Date().toISOString(),
            action: 'modified' as const
          }
        ]
      }))
      
      updateData.timeSlots = processedTimeSlots
      
      // Si l'utilisateur est le créateur, synchroniser avec actuelTimeSlots
      if (existingEvent.created_by === session.user.id || existingEvent.created_by === session.user.email) {
        updateData.actuelTimeSlots = processedTimeSlots.filter((slot: any) => slot.status === 'active')
      }

      // Mettre à jour les dates principales basées sur le premier créneau actif
      const activeSlots = processedTimeSlots.filter((slot: any) => slot.status === 'active')
      if (activeSlots.length > 0) {
        updateData.start_date = activeSlots[0].startDate
        updateData.end_date = activeSlots[activeSlots.length - 1].endDate
      }
    }

    // Ajouter l'historique du changement d'état si nécessaire
    if (state !== undefined && state !== existingEvent.state) {
      updateData.lastStateChange = {
        from: existingEvent.state,
        to: state,
        date: new Date().toISOString(),
        userId: session.user.id,
        reason: stateChangeReason || 'Mise à jour manuelle'
      }
    }

    // Gestion du validationState lors des modifications
    // Si quelqu'un modifie l'événement, mettre validationState à 'operatorPending'
    if (timeSlots !== undefined || materials !== undefined || chemicals !== undefined || 
        title !== undefined || description !== undefined || room !== undefined) {
      updateData.validationState = 'operatorPending'
      // Si l'événement n'est pas déjà PENDING, le mettre en PENDING
      if (updateData.state === undefined && existingEvent.state !== 'PENDING') {
        updateData.state = 'PENDING'
      }
    }

    // Effectuer la mise à jour
    const updatedEvent = await updateChemistryEventWithTimeSlots(id, updateData)

    // Retourner le format attendu par le frontend
    const responseEvent = {
      id: updatedEvent.id,
      title: updatedEvent.title,
      description: updatedEvent.description,
      type: updatedEvent.type.toUpperCase() === 'TP' ? 'TP' : 
            updatedEvent.type.toUpperCase() === 'MAINTENANCE' ? 'MAINTENANCE' :
            updatedEvent.type.toUpperCase() === 'INVENTORY' ? 'INVENTORY' : 'OTHER',
      state: updatedEvent.state,
      timeSlots: updatedEvent.timeSlots,
      actuelTimeSlots: updatedEvent.actuelTimeSlots,
      class: updatedEvent.class_name,
      room: updatedEvent.room,
      materials: parseJsonSafe(updatedEvent.equipment_used, []).map((id: any) => ({ id, name: id })),
      chemicals: parseJsonSafe(updatedEvent.chemicals_used, []).map((id: any) => ({ id, name: id })),
      remarks: updatedEvent.notes,
      createdBy: updatedEvent.created_by,
      createdAt: updatedEvent.created_at,
      updatedAt: updatedEvent.updated_at,
      stateChangeReason: updatedEvent.stateChangeReason,
      lastStateChange: updatedEvent.lastStateChange
    }

    return NextResponse.json(responseEvent)

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'événement' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un événement
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      )
    }

    // Vérifier que l'événement existe et que l'utilisateur peut le supprimer
    const existingEvent = await getChemistryEventByIdWithTimeSlots(id)
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier les permissions (seul le créateur ou un admin peut supprimer)
    if (existingEvent.created_by !== session.user.id && 
        existingEvent.created_by !== session.user.email) {
      // TODO: Ajouter vérification du rôle admin si nécessaire
      return NextResponse.json(
        { error: 'Non autorisé à supprimer cet événement' },
        { status: 403 }
      )
    }

    // Utiliser la fonction de suppression existante (compatible)
    await deleteChemistryEvent(id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'événement' },
      { status: 500 }
    )
  }
}
