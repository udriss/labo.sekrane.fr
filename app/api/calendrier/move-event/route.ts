// app/api/calendrier/move-event/route.ts
// API pour proposer des nouveaux créneaux (move/reschedule)
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  getChemistryEventByIdWithTimeSlots,
  updateChemistryEventWithTimeSlots,
  getPhysicsEventByIdWithTimeSlots,
  updatePhysicsEventWithTimeSlots
} from '@/lib/calendar-utils-timeslots'
import { TimeSlot } from '@/types/calendar'
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

// POST - Proposer de nouveaux créneaux pour un événement
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      eventId,
      discipline, // 'chimie' | 'physique'
      newTimeSlots, // Array des nouveaux créneaux proposés
      reason // Raison du déplacement
    } = body

    if (!eventId || !discipline || !newTimeSlots || newTimeSlots.length === 0) {
      return NextResponse.json(
        { error: 'Paramètres manquants: eventId, discipline, newTimeSlots requis' },
        { status: 400 }
      )
    }

    // Récupérer l'événement existant selon la discipline
    let existingEvent: any
    if (discipline === 'chimie') {
      existingEvent = await getChemistryEventByIdWithTimeSlots(eventId)
    } else if (discipline === 'physique') {
      existingEvent = await getPhysicsEventByIdWithTimeSlots(eventId)
    } else {
      return NextResponse.json(
        { error: 'Discipline non supportée' },
        { status: 400 }
      )
    }

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    const userId = session.user.id
    const currentDate = new Date().toISOString()
    const isOwner = existingEvent.created_by === userId || existingEvent.created_by === session.user.email

    // Valider les nouveaux créneaux
    const validatedNewSlots: TimeSlot[] = []
    for (let i = 0; i < newTimeSlots.length; i++) {
      const slot = newTimeSlots[i]
      
      if (!slot.date || !slot.startTime || !slot.endTime) {
        return NextResponse.json(
          { error: `Créneau ${i + 1}: date, startTime et endTime requis` },
          { status: 400 }
        )
      }

      // Construire les dates ISO complètes
      const startDate = `${slot.date}T${slot.startTime}:00.000Z`
      const endDate = `${slot.date}T${slot.endTime}:00.000Z`

      // Validation des dates
      const startDateTime = new Date(startDate)
      const endDateTime = new Date(endDate)
      
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return NextResponse.json(
          { error: `Créneau ${i + 1}: dates invalides` },
          { status: 400 }
        )
      }

      if (startDateTime >= endDateTime) {
        return NextResponse.json(
          { error: `Créneau ${i + 1}: l'heure de fin doit être après l'heure de début` },
          { status: 400 }
        )
      }

      validatedNewSlots.push({
        id: generateTimeSlotId(),
        startDate,
        endDate,
        status: 'active' as const,
        createdBy: userId,
        modifiedBy: [{
          userId,
          date: currentDate,
          action: 'created' as const
        }]
      })
    }

    // Préparer les timeSlots mis à jour
    const updatedTimeSlots: TimeSlot[] = []

    // 1. Marquer tous les créneaux actifs existants comme "deleted"
    if (existingEvent.timeSlots) {
      existingEvent.timeSlots.forEach((slot: TimeSlot) => {
        if (slot.status === 'active') {
          updatedTimeSlots.push({
            ...slot,
            status: 'deleted' as const,
            modifiedBy: [
              ...(slot.modifiedBy || []),
              {
                userId,
                date: currentDate,
                action: 'deleted' as const
              }
            ]
          })
        } else {
          // Garder les slots déjà supprimés
          updatedTimeSlots.push(slot)
        }
      })
    }

    // 2. Ajouter les nouveaux créneaux proposés
    updatedTimeSlots.push(...validatedNewSlots)

    // Préparer les données de mise à jour
    const updateData: any = {
      timeSlots: updatedTimeSlots,
      // Mettre à jour les dates principales basées sur le premier nouveau créneau
      start_date: validatedNewSlots[0].startDate,
      end_date: validatedNewSlots[validatedNewSlots.length - 1].endDate
    }

    // Si c'est le propriétaire, synchroniser actuelTimeSlots avec les nouveaux créneaux
    if (isOwner) {
      // updateData.actuelTimeSlots = validatedNewSlots
      console.log('Propriétaire détecté - synchronisation actuelTimeSlots')
    } else {
      // Sinon, garder les actuelTimeSlots inchangés
      updateData.actuelTimeSlots = existingEvent.actuelTimeSlots
      console.log('Non-propriétaire - actuelTimeSlots conservés')
    }

    // Ajouter l'historique du changement
    updateData.lastStateChange = {
      from: existingEvent.state,
      to: existingEvent.state, // Pas de changement d'état, juste déplacement
      date: currentDate,
      userId,
      reason: reason || `Proposition de déplacement par ${session.user.name || session.user.email}`
    }

    // Effectuer la mise à jour selon la discipline
    let updatedEvent: any
    if (discipline === 'chimie') {
      updatedEvent = await updateChemistryEventWithTimeSlots(eventId, updateData)
    } else {
      updatedEvent = await updatePhysicsEventWithTimeSlots(eventId, updateData)
    }

    console.log('Événement déplacé:', {
      eventId,
      discipline,
      isOwner,
      newSlotsCount: validatedNewSlots.length,
      actuelTimeSlotsSynced: isOwner
    })

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
      lastStateChange: updatedEvent.lastStateChange
    }

    return NextResponse.json({
      success: true,
      event: responseEvent,
      isOwner,
      message: isOwner 
        ? 'Créneaux déplacés et validés automatiquement'
        : 'Proposition de déplacement enregistrée - en attente de validation du propriétaire'
    })

  } catch (error) {
    console.error('Erreur lors du déplacement de l\'événement:', error)
    return NextResponse.json(
      { error: 'Erreur lors du déplacement de l\'événement' },
      { status: 500 }
    )
  }
}

// PUT - Valider/rejeter des créneaux proposés (réservé au propriétaire)
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      eventId,
      discipline,
      action, // 'approve' | 'reject'
      reason
    } = body

    if (!eventId || !discipline || !action) {
      return NextResponse.json(
        { error: 'Paramètres manquants: eventId, discipline, action requis' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide: doit être "approve" ou "reject"' },
        { status: 400 }
      )
    }

    // Récupérer l'événement existant
    let existingEvent: any
    if (discipline === 'chimie') {
      existingEvent = await getChemistryEventByIdWithTimeSlots(eventId)
    } else if (discipline === 'physique') {
      existingEvent = await getPhysicsEventByIdWithTimeSlots(eventId)
    } else {
      return NextResponse.json(
        { error: 'Discipline non supportée' },
        { status: 400 }
      )
    }

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    const userId = session.user.id
    const isOwner = existingEvent.created_by === userId || existingEvent.created_by === session.user.email

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Seul le propriétaire peut valider/rejeter les propositions' },
        { status: 403 }
      )
    }

    const currentDate = new Date().toISOString()
    const updateData: any = {}

    if (action === 'approve') {
      // Approuver : synchroniser actuelTimeSlots avec les créneaux actifs de timeSlots
      const activeTimeSlots = (existingEvent.timeSlots || []).filter((slot: TimeSlot) => slot.status === 'active')
      updateData.actuelTimeSlots = activeTimeSlots.map((slot: TimeSlot) => ({
        ...slot,
        modifiedBy: [
          ...(slot.modifiedBy || []),
          {
            userId,
            date: currentDate,
            action: 'approved' as const
          }
        ]
      }))
      
      updateData.lastStateChange = {
        from: existingEvent.state,
        to: existingEvent.state,
        date: currentDate,
        userId,
        reason: reason || 'Créneaux proposés approuvés'
      }
    } else {
      // Rejeter : remettre les timeSlots actifs en accord avec actuelTimeSlots
      const rejectedTimeSlots: TimeSlot[] = []
      
      // Marquer tous les créneaux actifs comme rejetés
      if (existingEvent.timeSlots) {
        existingEvent.timeSlots.forEach((slot: TimeSlot) => {
          if (slot.status === 'active') {
            rejectedTimeSlots.push({
              ...slot,
              status: 'rejected' as const,
              modifiedBy: [
                ...(slot.modifiedBy || []),
                {
                  userId,
                  date: currentDate,
                  action: 'rejected' as const
                }
              ]
            })
          } else {
            rejectedTimeSlots.push(slot)
          }
        })
      }

      // Restaurer les actuelTimeSlots comme créneaux actifs
      if (existingEvent.actuelTimeSlots) {
        existingEvent.actuelTimeSlots.forEach((slot: TimeSlot) => {
          rejectedTimeSlots.push({
            ...slot,
            status: 'active' as const,
            modifiedBy: [
              ...(slot.modifiedBy || []),
              {
                userId,
                date: currentDate,
                action: 'restored' as const
              }
            ]
          })
        })
      }

      updateData.timeSlots = rejectedTimeSlots
      
      updateData.lastStateChange = {
        from: existingEvent.state,
        to: existingEvent.state,
        date: currentDate,
        userId,
        reason: reason || 'Créneaux proposés rejetés'
      }
    }

    // Effectuer la mise à jour
    let updatedEvent: any
    if (discipline === 'chimie') {
      updatedEvent = await updateChemistryEventWithTimeSlots(eventId, updateData)
    } else {
      updatedEvent = await updatePhysicsEventWithTimeSlots(eventId, updateData)
    }

    console.log('Proposition de créneaux traitée:', {
      eventId,
      discipline,
      action,
      isOwner
    })

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
      lastStateChange: updatedEvent.lastStateChange
    }

    return NextResponse.json({
      success: true,
      event: responseEvent,
      action,
      message: action === 'approve' 
        ? 'Créneaux approuvés et appliqués'
        : 'Créneaux rejetés, anciens créneaux restaurés'
    })

  } catch (error) {
    console.error('Erreur lors du traitement de la proposition:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la proposition' },
      { status: 500 }
    )
  }
}
