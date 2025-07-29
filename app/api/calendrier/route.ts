// app/api/calendrier/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { withAudit } from '@/lib/api/with-audit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { readCalendarFile, writeCalendarFile, migrateEventToNewFormat } from '@/lib/calendar-utils'
import { generateTimeSlotId } from '@/lib/calendar-utils-client'
import { enrichEventsWithChemicalData, getFileTypeFromName, saveFileToDisk } from '@/lib/utils/chemical-data-utils'
import { TimeSlot, CalendarEvent } from '@/types/calendar'


// GET - Modifié pour supporter le nouveau format
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const calendarData = await readCalendarFile()
    let events = calendarData.events || []

    // Migrer tous les événements vers le nouveau format
    events = await Promise.all(events.map(migrateEventToNewFormat));

    // Filtrage par période si demandé
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      events = events.filter((event: any) => {
        // Vérifier si au moins un timeSlot actif est dans la période (exclure les invalid et deleted)
        return event.timeSlots.some((slot: TimeSlot) => {
          if (slot.status === 'deleted' || slot.status === 'invalid') return false;
          const slotStart = new Date(slot.startDate)
          const slotEnd = new Date(slot.endDate)
          return slotStart <= end && slotEnd >= start
        });
      })
    }

    // Enrichir les événements avec les données de stock
    const enrichedEvents = await enrichEventsWithChemicalData(events)

    return NextResponse.json(enrichedEvents)
  } catch (error) {
    console.error('Erreur API calendar:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du calendrier' },
      { status: 500 }
    )
  }
}

// POST - Nouveau format avec timeSlots et tracking
export const POST = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions)
    const userRole = session?.user?.role
    const userId = session?.user?.id
    const initialState = (userRole === 'TEACHER' || userRole === 'ADMIN') ? 'PENDING' : (userRole === 'LABORANTIN') ? 'PENDING' : 'VALIDATED'

    const body = await request.json()
    const { 
      title, 
      description, 
      date,
      timeSlots,
      type,
      classes,
      materials,
      chemicals,
      files,
      remarks,
      location,
      room,
      notes,
      equipment
    } = body

    if (classes && !Array.isArray(classes)) {
      return NextResponse.json(
        { error: 'Il faut au moins une classe' },
        { status: 400 }
      )
    }

    // Préparer et sauvegarder les fichiers
    const savedFiles = await prepareAndSaveFiles(files, userId);

    // Créer les timeSlots avec IDs uniques et tracking
    const formattedTimeSlots: TimeSlot[] = [];
    const currentDate = new Date().toISOString();

    if (date && timeSlots && Array.isArray(timeSlots)) {
      // Nouveau format pour les TP avec créneaux multiples
      for (const slot of timeSlots) {
        if (!slot.startTime || !slot.endTime) {
          return NextResponse.json(
            { error: 'Tous les créneaux doivent avoir une heure de début et de fin' },
            { status: 400 }
          )
        }

        const startDateTime = new Date(`${date}T${slot.startTime}`);
        const endDateTime = new Date(`${date}T${slot.endTime}`);

        formattedTimeSlots.push({

          id: generateTimeSlotId(),
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          status: 'active' as const,
          createdBy: userId || 'INDISPONIBLE',
          modifiedBy: [{
            userId: userId || 'INDISPONIBLE',

            date: currentDate,
            action: 'created' as const
          }]
        });
      }
    } else if (body.startDate && body.endDate) {
      // Support de l'ancien format pour la rétrocompatibilité
      formattedTimeSlots.push({
        id: generateTimeSlotId(),
        startDate: new Date(body.startDate).toISOString(),
        endDate: new Date(body.endDate).toISOString(),
        status: 'active' as const,
        createdBy: userId || 'INDISPONIBLE',
        modifiedBy: [{
          userId: userId || 'INDISPONIBLE',
          date: currentDate,
          action: 'created' as const
        }]
      });
    } else if (body.timeSlots && Array.isArray(body.timeSlots)) {
      // Support du format direct avec timeSlots complets (depuis CreateEventDialog)
      for (const slot of body.timeSlots) {
        if (!slot.startDate || !slot.endDate) {
          return NextResponse.json(
            { error: 'Tous les créneaux doivent avoir des dates de début et de fin' },
            { status: 400 }
          )
        }

        formattedTimeSlots.push({
          id: slot.id || generateTimeSlotId(),
          startDate: slot.startDate,
          endDate: slot.endDate,
          status: slot.status || ('active' as const),
          createdBy: slot.createdBy || userId || 'INDISPONIBLE',
          modifiedBy: slot.modifiedBy || [{
            userId: userId || 'INDISPONIBLE',
            date: currentDate,
            action: 'created' as const
          }]
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Format de données invalide. Utilisez soit (date + timeSlots) soit (startDate + endDate) soit timeSlots complets' },
        { status: 400 }
      )
    }

    // Valider que tous les créneaux sont dans le futur pour les enseignants
    if (userRole === 'TEACHER') {
      const now = new Date();
      for (const slot of formattedTimeSlots) {
        if (new Date(slot.startDate) < now) {
          return NextResponse.json(
            { error: 'Les enseignants ne peuvent pas créer d\'événements dans le passé' },
            { status: 400 }
          )
        }
      }
    }

    // Créer l'événement unique avec tous les créneaux
    const newEvent = {
      id: `EVENT_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      title: title || 'Sans titre',
      name: type === 'TP' ? session?.user?.name : (title || 'TP'),
      description: description || null,
      timeSlots: formattedTimeSlots,
      actuelTimeSlots: formattedTimeSlots, // NOUVEAU: créneaux actuellement retenus (identiques au début)
      type: type || 'Type inconnu',
      state: initialState,
      stateChanger: initialState === 'PENDING' ? [] : [{
        userId: userId || 'INDISPONIBLE',
        date: currentDate,
        fromState: 'NEW' as const,
        toState: initialState,
        reason: 'Création automatique'
      }],
      class: classes ? (Array.isArray(classes) ? classes[0] : classes) : null,
      room: room || null,
      location: location || null,
      materials: materials || [],
      chemicals: chemicals || [],
      equipment: equipment || [],
      files: savedFiles,
      remarks: remarks || null,
      notes: notes || null,
      createdBy: userId || null,
      modifiedBy: [],
      createdAt: currentDate,
      updatedAt: currentDate
    };

    // Lire le fichier existant et ajouter le nouvel événement
    const calendarData = await readCalendarFile();
    calendarData.events.push(newEvent);
    
    // Sauvegarder le fichier
    await writeCalendarFile(calendarData);

    // Enrichir le nouvel événement avec les données de stock
    const enrichedEvent = (await enrichEventsWithChemicalData([newEvent]))[0];

    console.log(`Événement créé avec ${formattedTimeSlots.length} créneau(x) par ${session?.user?.email || 'utilisateur inconnu'}`);

    return NextResponse.json(enrichedEvent, { status: 201 });
  },
  {
    module: 'CALENDAR',
    entity: 'event',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      eventTitle: response?.title,
      timeSlotsCount: response?.timeSlots?.length || 0,
      filesCount: response?.files?.length || 0,
      createdByUser: response?.createdBy || 'INDISPONIBLE'
    })
  }
);

// PUT - Gestion des modifications de timeSlots
export const PUT = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions)
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

    const event = await migrateEventToNewFormat(calendarData.events[eventIndex])

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
    
    const { 
      timeSlots,  // Extraire timeSlots directement
      files,
      fileName,
      fileUrl,
      fileSize,
      ...eventUpdates 
    } = body
    
    console.log('TimeSlots reçus:', timeSlots);
    
    // Gérer le tableau modifiedBy
    const currentModifiedBy: Array<[string, ...string[]]> = event.modifiedBy || []
    const modificationDate = new Date().toISOString()
    
    const userIndex = currentModifiedBy.findIndex((entry: [string, ...string[]]) => entry[0] === userId)
    
    let updatedModifiedBy: Array<[string, ...string[]]>
    if (userIndex >= 0 && userId) {
      updatedModifiedBy = [...currentModifiedBy]
      const existingEntry = currentModifiedBy[userIndex]
      const [existingUserId, ...existingDates] = existingEntry
      updatedModifiedBy[userIndex] = [existingUserId, ...existingDates, modificationDate] as [string, ...string[]]
    } else if (userId) {
      updatedModifiedBy = [...currentModifiedBy, [userId, modificationDate]]
    } else {
      updatedModifiedBy = currentModifiedBy
    }

    // Valider et formater les timeSlots si fournis
    let finalTimeSlots = event.timeSlots || []
    let finalActuelTimeSlots = event.actuelTimeSlots || []
    let shouldUpdateStateToPending = false
    
    if (timeSlots !== undefined) {
      // Vérifier si c'est le propriétaire qui modifie les timeSlots
      const isOwnerModification = event.createdBy === userId
      
      // S'assurer que chaque timeSlot a un ID et le bon format
      finalTimeSlots = timeSlots.map((slot: any) => {
        // Si le slot a déjà un ID et les bonnes propriétés, le garder tel quel
        if (slot.id && slot.startDate && slot.endDate && slot.status) {
          return slot;
        }
        
        // Sinon, créer un nouveau slot correctement formaté
        return {
          id: slot.id || generateTimeSlotId(),
          startDate: slot.startDate,
          endDate: slot.endDate,
          status: slot.status || 'active',
          createdBy: slot.createdBy || userId || 'INDISPONIBLE',
          modifiedBy: slot.modifiedBy || [{
            userId: userId || 'INDISPONIBLE',
            date: modificationDate,
            action: 'created' as const
          }]
        };
      });
      
      // Si c'est le propriétaire qui modifie, changer l'état vers PENDING et synchroniser actuelTimeSlots
      if (isOwnerModification) {
        shouldUpdateStateToPending = true

        // Marquer tous les anciens timeSlots comme "invalid"
        const oldActiveSlots = (event.timeSlots || []).filter((slot: any) => slot.status === 'active');
        const invalidatedSlots = (event.timeSlots || []).map((slot: any) => ({
          ...slot,
          status: slot.status === 'active' ? 'invalid' : slot.status,
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: userId || 'INDISPONIBLE',
              date: modificationDate,
              action: 'invalidated' as const
            }
          ]
        }));

        // Ajouter les nouveaux créneaux avec referentActuelTimeID pour correspondance directe
        const newSlotsWithRef = finalTimeSlots.map((slot: any, i: number) => {
          // Si le slot a déjà un referentActuelTimeID, ne pas l'écraser
          if (slot.referentActuelTimeID !== undefined) return slot;
          const referentId = oldActiveSlots[i] ? oldActiveSlots[i].id : undefined;
          return {
            ...slot,
            referentActuelTimeID: referentId
          };
        });

        finalTimeSlots = [
          ...invalidatedSlots,
          ...newSlotsWithRef
        ];

        // Synchroniser actuelTimeSlots avec les nouveaux timeSlots actifs
        finalActuelTimeSlots = newSlotsWithRef.filter((slot: any) => slot.status === 'active').map((slot: any) => ({
          ...slot,
          modifiedBy: [
            ...(slot.modifiedBy || []),
            {
              userId: userId || 'INDISPONIBLE',
              date: modificationDate,
              action: 'modified' as const
            }
          ]
        }));
      }
      
      console.log('TimeSlots formatés:', finalTimeSlots);
    }

    // Préparer et sauvegarder les nouveaux fichiers
    let filesUpdate = {}

    if (files !== undefined) {
      if (Array.isArray(files)) {
        const savedFiles = []
        
        for (const file of files) {
          try {
            if (file.fileUrl && !file.fileUrl.startsWith('data:') && !file.fileContent) {
              savedFiles.push({
                fileName: file.fileName,
                fileUrl: file.fileUrl,
                filePath: file.filePath || file.fileUrl,
                fileSize: file.fileSize || 0,
                fileType: file.fileType || getFileTypeFromName(file.fileName),
                uploadedAt: file.uploadedAt || new Date().toISOString()
              })
            } 
            else if (file.fileContent || (file.fileUrl && file.fileUrl.startsWith('data:'))) {
              const savedFileUrl = await saveFileToDisk({
                userId: userId ?? 'TEMP_USER',
                fileName: file.fileName,
                fileContent: file.fileContent || file.fileUrl,
              })
              
              savedFiles.push({
                fileName: file.fileName,
                fileUrl: savedFileUrl,
                filePath: savedFileUrl,
                fileSize: file.fileSize || 0,
                fileType: file.fileType || getFileTypeFromName(file.fileName),
                uploadedAt: new Date().toISOString()
              })
            }
          } catch (error) {
            console.error('Erreur lors de la sauvegarde du fichier:', file.fileName, error)
          }
        }
        
        filesUpdate = { files: savedFiles }
      } else {
        filesUpdate = { files: [] }
      }
    }

    // Mettre à jour l'événement principal
    const updatedEvent = {
      ...event,
      ...eventUpdates,
      ...filesUpdate,
      timeSlots: finalTimeSlots,  // Remplacer directement tous les timeSlots
      actuelTimeSlots: finalActuelTimeSlots,  // NOUVEAU: Synchroniser actuelTimeSlots quand le propriétaire modifie
      modifiedBy: updatedModifiedBy,
      updatedAt: modificationDate,
      // Si le propriétaire modifie les timeSlots, remettre l'état à PENDING
      ...(shouldUpdateStateToPending && { state: 'PENDING' })
    }
    
    
    calendarData.events[eventIndex] = updatedEvent
    
    await writeCalendarFile(calendarData)
    
    // Enrichir l'événement avant de le retourner
    const enrichedUpdatedEvent = (await enrichEventsWithChemicalData([updatedEvent]))[0]

    const response = {
      updatedEvent: enrichedUpdatedEvent,
      message: 'Événement modifié avec succès'
    }
    
    return NextResponse.json(response)
  },
  {
    module: 'CALENDAR',
    entity: 'event',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.updatedEvent?.id,
    extractEntityId: (req) => new URL(req.url).searchParams.get('id') || undefined,
    customDetails: (req, response) => ({
      modifiedByCount: response?.updatedEvent?.modifiedBy?.length || 0,
      timeSlotsCount: response?.updatedEvent?.timeSlots?.filter((s: TimeSlot) => s.status === 'active').length || 0,
      filesCount: response?.updatedEvent?.files?.length || 0
    })
  }
)

// Fonctions utilitaires
function updateModifiedBy(
  modifiedBy: Array<[string, ...string[]]>, 
  userId: string | undefined, 
  date: string
): Array<[string, ...string[]]> {
  if (!userId) return modifiedBy;
  
  const userIndex = modifiedBy.findIndex(entry => entry[0] === userId);
  
  if (userIndex >= 0) {
    const updatedModifiedBy = [...modifiedBy];
    const [existingUserId, ...existingDates] = modifiedBy[userIndex];
    updatedModifiedBy[userIndex] = [existingUserId, ...existingDates, date] as [string, ...string[]];
    return updatedModifiedBy;
  } else {
    return [...modifiedBy, [userId, date]];
  }
}

async function prepareAndSaveFiles(files: any[], userId: string | undefined): Promise<any[]> {
  if (!files || !Array.isArray(files)) return [];
  
  const savedFiles = [];
  
  for (const file of files) {
    try {
      // Si c'est un fichier existant
      if (file.fileUrl && !file.fileUrl.startsWith('data:') && !file.fileContent) {
        savedFiles.push(file);
      } 
      // Si c'est un nouveau fichier avec du contenu base64
      else if (file.fileContent || (file.fileUrl && file.fileUrl.startsWith('data:'))) {
        const savedFileUrl = await saveFileToDisk({
          userId: userId ?? 'TEMP_USER',
          fileName: file.fileName,
          fileContent: file.fileContent || file.fileUrl,
        });
        
        savedFiles.push({
          fileName: file.fileName,
          fileUrl: savedFileUrl,
          filePath: savedFileUrl,
          fileSize: file.fileSize || 0,
          fileType: file.fileType || getFileTypeFromName(file.fileName),
          uploadedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du fichier:', file.fileName, error);
    }
  }
  
  return savedFiles;
}

// DELETE reste inchangé car il supprime l'événement entier
export const DELETE = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userRole = session?.user?.role;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      );
    }

    const calendarData = await readCalendarFile();
    const eventIndex = calendarData.events.findIndex((event: any) => event.id === eventId);
    
    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      );
    }

    const event = calendarData.events[eventIndex];

    // Vérifier les permissions
    const canDelete = userRole === 'ADMIN' || 
                     userRole === 'ADMINLABO' || 
                     event.createdBy === userId;

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de supprimer cet événement' },
        { status: 403 }
      );
    }

    // Supprimer l'événement
    const deletedEvent = calendarData.events.splice(eventIndex, 1)[0];
    await writeCalendarFile(calendarData);
    
    // Enrichir l'événement supprimé avant de le retourner
    const enrichedDeletedEvent = (await enrichEventsWithChemicalData([deletedEvent]))[0];

    return NextResponse.json({ 
      message: 'Événement supprimé', 
      event: enrichedDeletedEvent 
    });
  },
  {
    module: 'CALENDAR',
    entity: 'event',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.event?.id,
    extractEntityId: (req) => new URL(req.url).searchParams.get('id') || undefined,
    customDetails: (req, response) => ({
      eventTitle: response?.event?.title,
      hadTimeSlots: response?.event?.timeSlots?.length || 0,
      hadFiles: !!(response?.event?.files && response?.event?.files.length > 0)
    })
  }
);


// PATCH reste inchangé
export const PATCH = withAudit(
  async (request: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);
      const userRole = session?.user?.role;
      const userId = session?.user?.id;

      // Vérifier les permissions
      if (userRole !== 'LABORANTIN' && userRole !== 'ADMINLABO') {
        return NextResponse.json(
          { error: 'Vous n\'avez pas la permission de valider les événements' },
          { status: 403 }
        );
      }

      const { searchParams } = new URL(request.url);
      const eventId = searchParams.get('id');
      const body = await request.json();
      const { state, reason } = body;

      if (!eventId || !state) {
        return NextResponse.json(
          { error: 'ID de l\'événement et nouvel état requis' },
          { status: 400 }
        );
      }

      const calendarData = await readCalendarFile();
      const eventIndex = calendarData.events.findIndex((e: any) => e.id === eventId);

      if (eventIndex === -1) {
        return NextResponse.json(
          { error: 'Événement non trouvé' },
          { status: 404 }
        );
      }

      const event = calendarData.events[eventIndex].timeSlots 
  ? calendarData.events[eventIndex] 
  : await migrateEventToNewFormat(calendarData.events[eventIndex]);
      const previousState = event.state || 'PENDING';

      // Créer l'entrée de changement d'état
      const stateChange = {
        userId,
        date: new Date().toISOString(),
        fromState: previousState,
        toState: state,
        reason
      };

      // Mettre à jour l'événement
      calendarData.events[eventIndex] = {
        ...event,
        state,
        stateChanger: [...(event.stateChanger || []), stateChange],
        updatedAt: new Date().toISOString()
      };

      await writeCalendarFile(calendarData);

      // Enrichir l'événement avant de le retourner
      const enrichedEvent = (await enrichEventsWithChemicalData([calendarData.events[eventIndex]]))[0];

      return NextResponse.json(enrichedEvent);
    } catch (error) {
      console.error('Erreur lors du changement d\'état:', error);
      return NextResponse.json(
        { error: 'Erreur lors du changement d\'état' },
        { status: 500 }
      );
    }
  },
  {
    module: 'CALENDAR',
    entity: 'event',
    action: 'UPDATE_STATE',
    extractEntityId: (req) => new URL(req.url).searchParams.get('id') || undefined,
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      eventTitle: response?.title,
      previousState: response?.stateChanger?.slice(-1)[0]?.fromState,
      newState: response?.state,
      hasReason: !!response?.stateChanger?.slice(-1)[0]?.reason
    })
  }
);