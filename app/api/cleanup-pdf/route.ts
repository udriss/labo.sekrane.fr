import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Nettoie les fichiers PDF temporaires de plus de 24h
export async function POST(req: NextRequest) {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const files = await fs.readdir(publicDir);

    let deletedCount = 0;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

    for (const file of files) {
      // Vérifier que c'est un fichier PDF temporaire généré
      if (file.startsWith('event-pdf-') && file.endsWith('.pdf')) {
        const filePath = path.join(publicDir, file);

        try {
          const stats = await fs.stat(filePath);
          const fileAge = now - stats.mtime.getTime();

          // Supprimer les fichiers de plus de 24h
          if (fileAge > oneDayMs) {
            await fs.unlink(filePath);
            deletedCount++;
            
          }
        } catch (error) {
          console.warn(`[PDF Cleanup] Erreur avec le fichier ${file}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} fichier(s) PDF temporaire(s) supprimé(s)`,
    });
  } catch (error) {
    console.error('[PDF Cleanup Error]', error);
    return NextResponse.json(
      { error: 'Erreur lors du nettoyage des fichiers temporaires' },
      { status: 500 },
    );
  }
}

// GET pour obtenir les statistiques des fichiers temporaires
export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const files = await fs.readdir(publicDir);

    let tempFileCount = 0;
    let totalSize = 0;
    const now = Date.now();

    for (const file of files) {
      if (file.startsWith('event-pdf-') && file.endsWith('.pdf')) {
        tempFileCount++;

        try {
          const filePath = path.join(publicDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        } catch {
          // Ignore les erreurs de stats
        }
      }
    }

    return NextResponse.json({
      tempFileCount,
      totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
    });
  } catch (error) {
    console.error('[PDF Stats Error]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 },
    );
  }
}
