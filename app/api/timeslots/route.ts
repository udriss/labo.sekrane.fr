// API REST pour la gestion des créneaux
// Fichier : app/api/timeslots/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import {
  processTimeSlotCreationNew,
  validateTimeslotProposal,
  validateMultipleTimeslots,
  getTimeslotsByType,
  deleteTimeslotLogically
} from '@/lib/timeslots-integration'
import { getTimeslotsByEventId } from '@/lib/timeslots-database'
import {
  TimeslotProposal,
  TimeslotValidation,
  TimeslotType,
  Discipline,
  TimeslotErrorResponse
} from '@/types/timeslots'

// GET - Récupérer les créneaux
// Paramètres : ?event_id=&discipline=&type=(all|active|pending|summary)&user_id=
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error('❌ [API /api/timeslots] Non autorisé - pas de session')
      return NextResponse.json(
        { error: 'Non autorisé', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const discipline = searchParams.get('discipline') as Discipline
    const type = (searchParams.get('type') as TimeslotType) || 'active'
    const userId = searchParams.get('user_id')
    
    console.log('🔍 [API /api/timeslots] GET - Paramètres reçus:', {
      eventId,
      discipline,
      type,
      userId,
      sessionUserId: session.user.id,
      searchParams: Object.fromEntries(searchParams.entries())
    })
    
    // Validation des paramètres
    if (!eventId) {
      console.error('❌ [API /api/timeslots] ID d\'événement manquant')
      return NextResponse.json(
        { error: 'ID d\'événement requis', code: 'MISSING_EVENT_ID' },
        { status: 400 }
      )
    }
    
    if (!discipline || !['chimie', 'physique'].includes(discipline)) {
      console.error('❌ [API /api/timeslots] Discipline invalide:', discipline)
      return NextResponse.json(
        { error: 'Discipline invalide', code: 'INVALID_DISCIPLINE' },
        { status: 400 }
      )
    }
    
    if (!['all', 'active', 'pending', 'summary'].includes(type)) {
      console.error('❌ [API /api/timeslots] Type invalide:', type)
      return NextResponse.json(
        { error: 'Type de requête invalide', code: 'INVALID_TYPE' },
        { status: 400 }
      )
    }
    
    console.log('✅ [API /api/timeslots] Validation des paramètres réussie, appel de getTimeslotsByType...')
    
    // Récupérer les créneaux
    const result = await getTimeslotsByType(
      eventId,
      discipline,
      type,
      userId || session.user.id
    )
    
    console.log('📊 [API /api/timeslots] Résultat de getTimeslotsByType:', {
      resultType: typeof result,
      resultKeys: result ? Object.keys(result) : 'null',
      timeslotsCount: result?.timeslots?.length || 0,
      timeslots: result?.timeslots
    })
    
    // S'assurer que le résultat est sérialisable JSON
    const sanitizedResult = {
      timeslots: result?.timeslots || [],
      eventId: eventId,
      discipline: discipline,
      type: type,
      count: result?.timeslots?.length || 0,
      summary: result?.summary || null
    }
    
    console.log('📊 [API /api/timeslots] Résultat sanitized:', sanitizedResult)
    
    return NextResponse.json(sanitizedResult)
    
  } catch (error) {
    console.error('❌ [API /api/timeslots] Erreur GET:', error)
    
    const errorResponse: TimeslotErrorResponse = {
      error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// POST - Créer/proposer de nouveaux créneaux
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { event_id, discipline, event_owner, proposals } = body
    
    // Validation des paramètres
    if (!event_id) {
      return NextResponse.json(
        { error: 'ID d\'événement requis', code: 'MISSING_EVENT_ID' },
        { status: 400 }
      )
    }
    
    if (!discipline || !['chimie', 'physique'].includes(discipline)) {
      return NextResponse.json(
        { error: 'Discipline invalide', code: 'INVALID_DISCIPLINE' },
        { status: 400 }
      )
    }
    
    if (!proposals || !Array.isArray(proposals)) {
      return NextResponse.json(
        { error: 'Propositions de créneaux requises', code: 'MISSING_PROPOSALS' },
        { status: 400 }
      )
    }
    
    // Valider chaque proposition
    const validProposals: TimeslotProposal[] = proposals.map(proposal => ({
      ...proposal,
      event_id,
      discipline,
      user_id: session.user.id
    }))
    
    // Vérifier s'il y a des créneaux existants dans le passé pour autoriser les dates passées
    const existingTimeslots = await getTimeslotsByEventId(event_id, discipline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const hasPastTimeslots = existingTimeslots.some((slot: any) => {
      const slotDate = new Date(slot.timeslot_date)
      return slotDate < today
    })
    
    const allowPastDates = true;
    
    // Traiter les propositions avec autorisation des dates passées si nécessaire
    const result = await processTimeSlotCreationNew(
      event_id,
      discipline,
      session.user.id,
      event_owner || session.user.id,
      validProposals,
      allowPastDates
    )
    
    // Vérifier si le traitement a échoué avec des erreurs de validation
    if (result.success === false && result.errors) {
      return NextResponse.json({
        error: 'Erreurs de validation détectées',
        code: 'VALIDATION_ERROR',
        details: result.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    return NextResponse.json(result, { status: 201 })
    
  } catch (error) {
    console.error('Erreur POST /api/timeslots:', error)
    
    const errorResponse: TimeslotErrorResponse = {
      error: error instanceof Error ? error.message : 'Erreur lors de la création',
      code: 'CREATION_ERROR',
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// PUT - Valider/rejeter des créneaux
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { action, validations } = body
    
    // Validation des paramètres
    if (!action || !['validate', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide', code: 'INVALID_ACTION' },
        { status: 400 }
      )
    }
    
    if (action === 'validate') {
      if (!validations || !Array.isArray(validations)) {
        return NextResponse.json(
          { error: 'Validations requises', code: 'MISSING_VALIDATIONS' },
          { status: 400 }
        )
      }
      
      // Valider les créneaux en lot
      const validatedTimeslots = await validateMultipleTimeslots(
        validations.map((v: any) => ({
          ...v,
          validator_id: session.user.id
        })),
        session.user.id
      )
      
      return NextResponse.json({
        timeslots: validatedTimeslots,
        summary: {
          total: validatedTimeslots.length,
          validated: validatedTimeslots.filter(t => t.state === 'approved').length,
          rejected: validatedTimeslots.filter(t => t.state === 'rejected').length
        }
      })
      
    } else if (action === 'delete') {
      const { timeslot_id, reason } = body
      
      if (!timeslot_id) {
        return NextResponse.json(
          { error: 'ID de créneau requis', code: 'MISSING_TIMESLOT_ID' },
          { status: 400 }
        )
      }
      
      // Supprimer logiquement le créneau
      const deletedTimeslot = await deleteTimeslotLogically(
        timeslot_id,
        session.user.id,
        reason
      )
      
      return NextResponse.json({ timeslot: deletedTimeslot })
    }
    
  } catch (error) {
    console.error('Erreur PUT /api/timeslots:', error)
    
    const errorResponse: TimeslotErrorResponse = {
      error: error instanceof Error ? error.message : 'Erreur lors de la validation',
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// DELETE - Supprimer logiquement un créneau
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const timeslotId = searchParams.get('id')
    const reason = searchParams.get('reason')
    
    if (!timeslotId) {
      return NextResponse.json(
        { error: 'ID de créneau requis', code: 'MISSING_TIMESLOT_ID' },
        { status: 400 }
      )
    }
    
    // Supprimer logiquement le créneau
    const deletedTimeslot = await deleteTimeslotLogically(
      timeslotId,
      session.user.id,
      reason || 'Suppression via API'
    )
    
    return NextResponse.json({ timeslot: deletedTimeslot })
    
  } catch (error) {
    console.error('Erreur DELETE /api/timeslots:', error)
    
    const errorResponse: TimeslotErrorResponse = {
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression',
      code: 'DELETION_ERROR',
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// PATCH - Modifier un créneau existant
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { timeslot_id, updates } = body
    
    if (!timeslot_id) {
      return NextResponse.json(
        { error: 'ID de créneau requis', code: 'MISSING_TIMESLOT_ID' },
        { status: 400 }
      )
    }
    
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Mises à jour requises', code: 'MISSING_UPDATES' },
        { status: 400 }
      )
    }
    
    // Importer la fonction de mise à jour
    const { updateExistingTimeslot } = await import('@/lib/timeslots-database')
    
    // Mettre à jour le créneau
    const updatedTimeslot = await updateExistingTimeslot(
      timeslot_id,
      session.user.id,
      updates
    )
    
    return NextResponse.json({ timeslot: updatedTimeslot })
    
  } catch (error) {
    console.error('Erreur PATCH /api/timeslots:', error)
    
    const errorResponse: TimeslotErrorResponse = {
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour',
      code: 'UPDATE_ERROR',
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
