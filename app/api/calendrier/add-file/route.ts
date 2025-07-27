// app/api/calendrier/add-file/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { readCalendarFile, writeCalendarFile } from '@/lib/calendar-utils'



export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('id')
  
  if (!eventId) {
    return NextResponse.json({ error: 'ID de l\'événement requis' }, { status: 400 })
  }

  try {
    const { file } = await request.json()
    
    if (!file || !file.fileName || !file.fileUrl) {
      return NextResponse.json({ error: 'Données du fichier invalides' }, { status: 400 })
    }

    const calendarData = await readCalendarFile()
    const eventIndex = calendarData.events.findIndex((event: any) => event.id === eventId)
    
    if (eventIndex === -1) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 })
    }

    const event = calendarData.events[eventIndex]
    
    // Initialiser le tableau files s'il n'existe pas
    if (!event.files) {
      event.files = []
    }

    // Ajouter le nouveau fichier
    event.files.push({
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      filePath: file.filePath || file.fileUrl,
      fileSize: file.fileSize || 0,
      fileType: file.fileType || '',
      uploadedAt: file.uploadedAt || new Date().toISOString()
    })

    // Mettre à jour l'événement
    calendarData.events[eventIndex] = event
    await writeCalendarFile(calendarData)

    return NextResponse.json({ 
      success: true, 
      message: 'Fichier ajouté avec succès',
      file: event.files[event.files.length - 1]
    })
  } catch (error) {
    console.error('Erreur lors de l\'ajout du fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du fichier' },
      { status: 500 }
    )
  }
}