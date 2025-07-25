// app/api/calendrier/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { withAudit } from '@/lib/api/with-audit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'


const CALENDAR_FILE = path.join(process.cwd(), 'data', 'calendar.json')

async function saveFileToDisk(fileData: {
  userId: string
  fileName: string
  fileContent?: string // Base64 ou URL data
  fileBuffer?: Buffer
}): Promise<string> {
  try {
    // Créer le dossier uploads s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'calendar')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const fileExtension = path.extname(fileData.fileName)
    const safeFileName = `${timestamp}_${randomString}${fileExtension}`
    const filePath = path.join(uploadDir, safeFileName)

    // Sauvegarder le fichier
    if (fileData.fileBuffer) {
      await writeFile(filePath, fileData.fileBuffer)
    } else if (fileData.fileContent) {
      // Si c'est une data URL, extraire le contenu base64
      const base64Data = fileData.fileContent.replace(/^data:.*,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      await writeFile(filePath, buffer)
    }

    // Retourner le chemin relatif pour l'URL
    return `/uploads/calendar/${fileData.userId}/${safeFileName}`
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du fichier:', error)
    throw error
  }
}

// Fonction helper pour obtenir le type de fichier
function getFileTypeFromName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
    return 'image/' + extension
  } else if (extension === 'pdf') {
    return 'pdf'
  } else if (['doc', 'docx', 'odt'].includes(extension)) {
    return 'msword'
  }
  return 'other'
}

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


export const POST = withAudit(
  async (request: NextRequest) => {
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
      fileUrl,
      fileSize,
      files,
      remarks,  // Ajouter remarks
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

    // Fonction pour préparer et sauvegarder les fichiers
    const prepareAndSaveFiles = async () => {
      const filesList = []
      
      // Nouveau format avec array files
      if (files && Array.isArray(files) && files.length > 0) {
        for (const file of files) {
          try {
            let savedFileUrl = file.fileUrl

            // Si le fichier contient du contenu (base64), le sauvegarder
            if (file.fileContent) {
              savedFileUrl = await saveFileToDisk({
                userId: userId ?? 'TEMP_USER',
                fileName: file.fileName,
                fileContent: file.fileContent
              })
            }
            // Si c'est une data URL, la sauvegarder aussi
            else if (file.fileUrl && file.fileUrl.startsWith('data:')) {
              savedFileUrl = await saveFileToDisk({
                userId: userId ?? 'TEMP_USER',
                fileName: file.fileName,
                fileContent: file.fileUrl
              })
            }

            filesList.push({
              fileName: file.fileName,
              fileUrl: savedFileUrl,
              filePath: savedFileUrl, // Ajouter le chemin du fichier
              fileSize: file.fileSize || 0,
              fileType: file.fileType || getFileTypeFromName(file.fileName),
              uploadedAt: file.uploadedAt || new Date().toISOString()
            })
          } catch (error) {
            console.error('Erreur lors de la sauvegarde du fichier:', file.fileName, error)
            // Continuer avec les autres fichiers même si un échoue
          }
        }
      }
      
      // Ancien format avec fileName unique (rétrocompatibilité)
      if (fileName && !files) {
        let savedFileUrl = fileUrl
        
        if (fileUrl && fileUrl.startsWith('data:')) {
          try {
            savedFileUrl = await saveFileToDisk({
              userId: userId ?? 'TEMP_USER',
              fileName: fileName,
              fileContent: fileUrl
            })
          } catch (error) {
            console.error('Erreur lors de la sauvegarde du fichier:', fileName, error)
          }
        }
        
        filesList.push({
          fileName: fileName,
          fileUrl: savedFileUrl || '',
          filePath: savedFileUrl || '',
          fileSize: fileSize || 0,
          fileType: getFileTypeFromName(fileName),
          uploadedAt: new Date().toISOString()
        })
      }
      
      return filesList
    }

    // Support du nouveau format (date + timeSlots) et de l'ancien format
    let eventsToCreate = []
    const savedFiles = await prepareAndSaveFiles()

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
          title: title || 'TP',
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
          fileUrl: fileUrl || null,
          files: savedFiles,
          remarks: remarks || null,  // Ajouter les remarques
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
        title: title || 'TP',
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
        fileUrl: fileUrl || null,
        files: savedFiles,
        remarks: remarks || null,
        notes: notes || null,
        createdBy: userId || null,
        modifiedBy: [],
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
      eventCount: Array.isArray(response) ? response.length : 1,
      filesCount: response?.files?.length || (response?.[0]?.files?.length) || 0
    })
  }
)

// PUT - Version améliorée avec gestion des fichiers
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
    
    const { 
      additionalTimeSlots, 
      files,
      fileName,
      fileUrl,
      fileSize,
      ...eventUpdates 
    } = body
    
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

    // Préparer et sauvegarder les nouveaux fichiers
    let filesUpdate = {}
    
    if (files !== undefined) {
      if (Array.isArray(files)) {
        const savedFiles = []
        
        for (const file of files) {
          try {
            // Si c'est un nouveau fichier avec du contenu
                       // Si c'est un nouveau fichier avec du contenu
            if (file.fileContent || (file.fileUrl && file.fileUrl.startsWith('data:'))) {
              const savedFileUrl = await saveFileToDisk({
                userId: userId ?? 'TEMP_USER',
                fileName: file.fileName,
                fileContent: file.fileContent || file.fileUrl
              })
              
              savedFiles.push({
                fileName: file.fileName,
                fileUrl: savedFileUrl,
                filePath: savedFileUrl,
                fileSize: file.fileSize || 0,
                fileType: file.fileType || getFileTypeFromName(file.fileName),
                uploadedAt: file.uploadedAt || new Date().toISOString()
              })
            } else {
              // Fichier existant, on le garde
              savedFiles.push(file)
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
    
    // Gérer l'ancien format fileName (rétrocompatibilité)
    if (fileName !== undefined) {
      eventUpdates.fileName = fileName
      if (fileUrl !== undefined) {
        eventUpdates.fileUrl = fileUrl
      }
      
      if (files === undefined && fileName) {
        let savedFileUrl = fileUrl
        
        if (fileUrl && fileUrl.startsWith('data:')) {
          try {
            savedFileUrl = await saveFileToDisk({
              userId: userId ?? 'TEMP_USER',
              fileName: fileName,
              fileContent: fileUrl
            })
          } catch (error) {
            console.error('Erreur lors de la sauvegarde du fichier:', fileName, error)
          }
        }
        
        filesUpdate = {
          files: [{
            fileName: fileName,
            fileUrl: savedFileUrl || '',
            filePath: savedFileUrl || '',
            fileSize: fileSize || 0,
            fileType: getFileTypeFromName(fileName),
            uploadedAt: new Date().toISOString()
          }]
        }
      }
    }

    // Mettre à jour l'événement principal
    const updatedEvent = {
      ...event,
      ...eventUpdates,
      ...filesUpdate,
      modifiedBy: updatedModifiedBy,
      updatedAt: modificationDate
    }
    
    calendarData.events[eventIndex] = updatedEvent
    
    // Créer les événements supplémentaires si nécessaire
    const createdEvents = []
    
    if (additionalTimeSlots && Array.isArray(additionalTimeSlots) && additionalTimeSlots.length > 0) {
      for (const slot of additionalTimeSlots) {
        if (!slot.date || !slot.startTime || !slot.endTime) {
          continue
        }
        
        const startDateTime = new Date(`${slot.date}T${slot.startTime}`)
        const endDateTime = new Date(`${slot.date}T${slot.endTime}`)
        
        const newEvent = {
          id: `EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: updatedEvent.title,
          description: updatedEvent.description,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          type: updatedEvent.type,
          class: updatedEvent.class,
          room: updatedEvent.room,
          location: updatedEvent.location,
          materials: updatedEvent.materials || [],
          chemicals: updatedEvent.chemicals || [],
          equipment: updatedEvent.equipment || [],
          fileName: updatedEvent.fileName,
          fileUrl: updatedEvent.fileUrl,
          files: updatedEvent.files || [],
          remarks: updatedEvent.remarks || null,
          notes: updatedEvent.notes,
          createdBy: userId || null,
          modifiedBy: [],
          createdAt: modificationDate,
          updatedAt: modificationDate,
          parentEventId: eventId
        }
        
        calendarData.events.push(newEvent)
        createdEvents.push(newEvent)
      }
    }
    
    await writeCalendarFile(calendarData)
    
    const response = {
      updatedEvent,
      createdEvents,
      message: createdEvents.length > 0 
        ? `Événement modifié et ${createdEvents.length} créneaux supplémentaires ajoutés`
        : 'Événement modifié avec succès'
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
      additionalSlotsCreated: response?.createdEvents?.length || 0,
      filesCount: response?.updatedEvent?.files?.length || 0,
      hasFiles: !!(response?.updatedEvent?.files && response?.updatedEvent?.files.length > 0)
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
    
    return NextResponse.json({ 
      message: 'Événement supprimé', 
      event: deletedEvent 
    })
  },
  {
    module: 'CALENDAR',
    entity: 'event',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.event?.id,
    extractEntityId: (req) => new URL(req.url).searchParams.get('id') || undefined,
    customDetails: (req, response) => ({
      eventTitle: response?.event?.title,
      hadFiles: !!(response?.event?.files && response?.event?.files.length > 0),
      filesCount: response?.event?.files?.length || 0
    })
  }
)