// app/api/calendrier/physique/route.ts
// API mise à jour pour le système TimeSlots complet
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { 
  getPhysicsEventsWithTimeSlots, 
  createPhysicsEventWithTimeSlots, 
  updatePhysicsEventWithTimeSlots,
  getPhysicsEventByIdWithTimeSlots,
  processTimeSlots
} from '@/lib/calendar-utils-timeslots'
import { deletePhysicsEvent } from '@/lib/calendar-utils'
import { TimeSlot, CalendarEvent } from '@/types/calendar'
import { generateTimeSlotId } from '@/lib/calendar-utils-client'
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

// GET - Récupérer les événements de chimie
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Utiliser la nouvelle fonction avec support TimeSlots
    const events = await getPhysicsEventsWithTimeSlots(startDate || undefined, endDate || undefined)

    // Convertir les événements DB en format CalendarEvent pour l'API
    const convertedEvents = events.map(dbEvent => {
      // Les données sont déjà parsées dans getPhysicsEventsWithTimeSlots
      const timeSlots = dbEvent.timeSlots || []
      const actuelTimeSlots = dbEvent.actuelTimeSlots || []
      
      // Normaliser les données de classe (support legacy + nouveau format)
      const classData = normalizeClassField(dbEvent.class_data)
      console.log('Récupération des événements de physique:', classData)

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
        class_data: classData, // Nouveau champ
        room: dbEvent.room,
        materials: parseJsonSafe(dbEvent.equipment_used, []).map((item: any) => {
          if (typeof item === 'string') {
            return { id: item, name: item };
          }
          return {
            id: item.id || item,
            name: item.name || item.itemName || (typeof item === 'string' ? item : 'Matériel'),
            itemName: item.itemName || item.name,
            quantity: item.quantity || null,
            requestedQuantity: item.requestedQuantity || null,
            volume: item.volume,
            isCustom: item.isCustom || false
          };
        }),
        consommables: parseJsonSafe(dbEvent.consommables_used, []).map((item: any) => {
          if (typeof item === 'string') {
            return { id: item, name: item };
          }
          return {
            id: item.id || item,
            name: item.name || (typeof item === 'string' ? item : 'Consommable'),
            requestedQuantity: item.requestedQuantity || null,
            quantity: item.quantity || null,
            unit: item.unit,
            isCustom: item.isCustom || false
          };
        }),
        remarks: dbEvent.notes,
        createdBy: dbEvent.created_by,
        createdAt: dbEvent.created_at,
        updatedAt: dbEvent.updated_at,
        stateChangeReason: dbEvent.stateChangeReason,
        lastStateChange: dbEvent.lastStateChange
      }
    })

    console.log('Récupération des événements de physique:', convertedEvents.length, 'événements trouvés')
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
      classData: inputClassData,
      classes,
      materials,
      equipment,
      consommables,
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
    console.log('Ajout événement physique avec les créneaux:', body)
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
        throw new Error(`Heures manquantes pour le créneau physique ${i + 1}: startTime="${startTime}", endTime="${endTime}"`)
      }
      
      // Construire les dates ISO complètes - s'assurer que c'est bien formaté
      const startDate = `${slotDate}T${startTime}:00`
      const endDate = `${slotDate}T${endTime}:00`
      
      // Log pour debug
      console.log('Ajout TimeSlot physique:', { slotDate, startTime, endTime, startDate, endDate })
      
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

    // Premier créneau pour l'événement principal
    const firstSlot = generatedTimeSlots[0]

    // Validation des dates avant insertion
    if (!firstSlot || !firstSlot.startDate || !firstSlot.endDate) {
      console.error('Erreur: TimeSlot physique invalide', { firstSlot, validSlots, body })
      return NextResponse.json(
        { error: 'Erreur lors de la génération des créneaux horaires' },
        { status: 400 }
      )
    }
    
    // Normaliser les données de classe (priorité au nouveau format)
    let normalizedClassData: ClassData | null = null;
    
    if (inputClassData && typeof inputClassData === 'object') {
      // Nouveau format fourni directement
      normalizedClassData = inputClassData as ClassData;
    } 
    
    // Créer l'événement avec les nouveaux champs
    // Réduire les données avant de les sauvegarder
    const reducedMaterials = (materials || equipment || []).map((material: any) => ({
      id: material.id,
      name: material.name || material.itemName,
      itemName: material.itemName || material.name,
      type: material.type,
      categoryName: material.categoryName,
      room: material.room,
      status: material.status,
      quantity: material.quantity || null,
      requestedQuantity: material.requestedQuantity || null
    }))

    const reducedConsommables = (consommables || []).map((consommable: any) => ({
      id: consommable.id,
      name: consommable.name,
      quantity: consommable.quantity || null,
      unit: consommable.unit,
      requestedQuantity: consommable.requestedQuantity || null,
      isCustom: consommable.isCustom || false
    }))

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
      class_data: normalizedClassData, // Nouveau champ
      participants: [],
      equipment_used: reducedMaterials,
      consommables_used: reducedConsommables,
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

    const createdEvent = await createPhysicsEventWithTimeSlots(eventData)

    // Retourner le format attendu par le frontend
    const responseClassData = normalizeClassField(createdEvent.class_data)

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
      class: getClassNameFromClassData(responseClassData), // Pour compatibilité legacy
      classData: responseClassData, // Nouveau champ
      room: createdEvent.room,
      materials: parseJsonSafe(createdEvent.equipment_used, []).map((item: any) => {
        if (typeof item === 'string') {
          return { id: item, name: item };
        }
        return {
          id: item.id || item,
          name: item.name || item.itemName || (typeof item === 'string' ? item : 'Matériel'),
          itemName: item.itemName || item.name,
          quantity: item.quantity || null,
          requestedQuantity: item.requestedQuantity || null,
          volume: item.volume,
          isCustom: item.isCustom || false
        };
      }),
      consommables: parseJsonSafe(createdEvent.consommables_used, []).map((item: any) => {
        if (typeof item === 'string') {
          return { id: item, name: item };
        }
        return {
          id: item.id || item,
          name: item.name || (typeof item === 'string' ? item : 'Consommable'),
          requestedQuantity: item.requestedQuantity || null,
          quantity: item.quantity || null,
          unit: item.unit,
          isCustom: item.isCustom || false
        };
      }),
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
      class_data: inputClassData, 
      materials, 
      consommables, 
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
    const existingEvent = await getPhysicsEventByIdWithTimeSlots(id)
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
    if (remarks !== undefined) updateData.notes = remarks
    if (state !== undefined) updateData.state = state
    if (inputClassData !== undefined) updateData.class_data = parseClassDataSafe(inputClassData)
    if (stateChangeReason !== undefined) updateData.stateChangeReason = stateChangeReason

    // Gestion des matériaux et produits chimiques avec réduction des données
    if (materials !== undefined) {
      // Réduire les données des matériaux pour ne garder que les champs essentiels
      const reducedMaterials = materials.map((material: any) => ({
        id: material.id,
        name: material.name || material.itemName,
        itemName: material.itemName || material.name,
        type: material.type,
        categoryName: material.categoryName,
        room: material.room,
        status: material.status,
        quantity: material.quantity || null,
        requestedQuantity: material.requestedQuantity || null
      }))
      updateData.equipment_used = reducedMaterials
    }
    const consommablesData = consommables
    if (consommablesData !== undefined) {
      // Réduire les données des consommables pour ne garder que les champs essentiels
      const reducedConsommables = consommablesData.map((consommable: any) => ({
        id: consommable.id,
        name: consommable.name,
        quantity: consommable.quantity || null,
        unit: consommable.unit,
        requestedQuantity: consommable.requestedQuantity || null,
        isCustom: consommable.isCustom || false
      }))
      updateData.consommables_used = reducedConsommables
    }

    // Gestion des TimeSlots
    if (timeSlots !== undefined) {
      // Si l'utilisateur est le créateur (owner), remplacer complètement actuelTimeSlots
      if (existingEvent.created_by === session.user.id || existingEvent.created_by === session.user.email) {
        // Pour le créateur, traiter directement les timeSlots comme dans POST
        const processedTimeSlots = timeSlots.map((slot: any) => ({
          ...slot,
          status: slot.status || 'active',
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: session.user.id,
              date: new Date().toISOString(),
              action: 'updated' as const
            }
          ]
        }))
        
        updateData.timeSlots = processedTimeSlots
        updateData.actuelTimeSlots = processedTimeSlots.filter((slot: any) => slot.status === 'active')
      } else {
        // Pour les autres utilisateurs, utiliser processTimeSlots pour l'historique
        const processedTimeSlots = processTimeSlots(timeSlots, existingEvent.timeSlots || [], session.user.id)
        updateData.timeSlots = processedTimeSlots
        // Ne pas toucher actuelTimeSlots si ce n'est pas le créateur
      }

      // Mettre à jour les dates principales basées sur les créneaux actifs
      const activeSlots = (updateData.actuelTimeSlots || existingEvent.actuelTimeSlots || [])
        .filter((slot: any) => slot.status === 'active')
      
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
    if (timeSlots !== undefined || materials !== undefined || 
        title !== undefined || description !== undefined || room !== undefined) {
      updateData.validationState = 'operatorPending'
      // Si l'événement n'est pas déjà PENDING, le mettre en PENDING
      if (updateData.state === undefined && existingEvent.state !== 'PENDING') {
        updateData.state = 'PENDING'
      }
    }

    // Effectuer la mise à jour
    const updatedEvent = await updatePhysicsEventWithTimeSlots(id, updateData)

    // Retourner le format attendu par le frontend
    const responseClassData = normalizeClassField(updatedEvent.class_data)
    console.log('responseClassData physique mis à jour:', responseClassData)

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
      class: getClassNameFromClassData(responseClassData), // Pour compatibilité legacy
      classData: responseClassData, // Nouveau champ
      room: updatedEvent.room,
      materials: parseJsonSafe(updatedEvent.equipment_used, []).map((item: any) => {
        if (typeof item === 'string') {
          return { id: item, name: item };
        }
        return {
          id: item.id || item,
          name: item.name || item.itemName || (typeof item === 'string' ? item : 'Matériel'),
          itemName: item.itemName || item.name,
          quantity: item.quantity || null,
          requestedQuantity: item.requestedQuantity || null,
          volume: item.volume,
          isCustom: item.isCustom || false
        };
      }),
      consommables: parseJsonSafe(updatedEvent.consommables_used, []).map((item: any) => {
        if (typeof item === 'string') {
          return { id: item, name: item };
        }
        return {
          id: item.id || item,
          name: item.name || (typeof item === 'string' ? item : 'Consommable'),
          requestedQuantity: item.requestedQuantity || null,
          quantity: item.quantity || null,
          unit: item.unit,
          isCustom: item.isCustom || false
        };
      }),
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
    const existingEvent = await getPhysicsEventByIdWithTimeSlots(id)
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
    await deletePhysicsEvent(id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'événement' },
      { status: 500 }
    )
  }
}
