// app/api/calendrier/files/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// GET - Récupérer un fichier
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Vérifier l'authentification
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'Chemin du fichier requis' },
        { status: 400 }
      )
    }

    // Sécurité : s'assurer que le chemin est dans le dossier uploads
    if (!filePath.startsWith('/uploads/calendar/')) {
      return NextResponse.json(
        { error: 'Chemin de fichier non autorisé' },
        { status: 403 }
      )
    }

    // Construire le chemin complet
    const fullPath = path.join(process.cwd(), 'public', filePath)
    
    // Vérifier que le fichier existe
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'Fichier non trouvé' },
        { status: 404 }
      )
    }

    // Lire le fichier
    const fileBuffer = await readFile(fullPath)
    
    // Déterminer le type MIME
    const extension = path.extname(filePath).toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (extension) {
      case '.pdf':
        contentType = 'application/pdf'
        break
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.doc':
        contentType = 'application/msword'
        break
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        break
    }

    // Retourner le fichier avec les headers appropriés
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du fichier' },
      { status: 500 }
    )
  }
}

// POST - Télécharger un fichier (force download)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { filePath, fileName } = body
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'Chemin du fichier requis' },
        { status: 400 }
      )
    }

    // Sécurité
    if (!filePath.startsWith('/uploads/calendar/')) {
      return NextResponse.json(
        { error: 'Chemin de fichier non autorisé' },
        { status: 403 }
      )
    }

    const fullPath = path.join(process.cwd(), 'public', filePath)
    
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'Fichier non trouvé' },
        { status: 404 }
      )
    }

    const fileBuffer = await readFile(fullPath)
    const downloadName = fileName || path.basename(filePath)
    
    // Forcer le téléchargement
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement du fichier' },
      { status: 500 }
    )
  }
}