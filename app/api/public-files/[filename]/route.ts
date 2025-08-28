import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(req: NextRequest, context: { params: Promise<{ filename: string }> }) {
  try {
    // Await params avant d'utiliser ses propriétés (Next.js 15+)
    const { filename } = await context.params;

    // Vérification de sécurité pour éviter les path traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Nom de fichier invalide', { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', filename);

    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
    } catch {
      return new NextResponse('Fichier non trouvé', { status: 404 });
    }

    // Lire le fichier
    const fileBuffer = await fs.readFile(filePath);

    // Déterminer le type de contenu
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (filename.endsWith('.png')) {
      contentType = 'image/png';
    } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000', // 1 an
      },
    });
  } catch (error) {
    console.error('[Public File Error]', error);
    return new NextResponse('Erreur serveur', { status: 500 });
  }
}
