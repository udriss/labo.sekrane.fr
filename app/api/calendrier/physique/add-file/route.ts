// app/api/calendrier/physique/add-file/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { getPhysicsEventById, updatePhysicsEvent } from '@/lib/calendar-utils'

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

    const event = await getPhysicsEventById(eventId)
    
    if (!event) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 })
    }

    // Récupérer les fichiers existants depuis les notes (format JSON)
    let files = []
    if (event.notes) {
      try {
        const notesData = JSON.parse(event.notes)
        files = notesData.files || []
      } catch {
        // Si les notes ne sont pas en JSON, créer une nouvelle structure
        files = []
      }
    }

    // Ajouter le nouveau fichier
    const newFile = {
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      filePath: file.filePath || file.fileUrl,
      fileSize: file.fileSize || 0,
      fileType: file.fileType || '',
      uploadedAt: file.uploadedAt || new Date().toISOString()
    }
    
    files.push(newFile)

    // Mettre à jour les notes avec les fichiers
    const updatedNotes = JSON.stringify({ files })
    
    // Mettre à jour l'événement
    await updatePhysicsEvent(eventId, {
      notes: updatedNotes,
      updated_at: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Fichier ajouté avec succès',
      file: newFile
    })
  } catch (error) {
    console.error('Erreur lors de l\'ajout du fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du fichier' },
      { status: 500 }
    )
  }
}
