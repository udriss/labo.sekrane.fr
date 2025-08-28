import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';

// Simple proxy to serve documents via Next API (useful in production to avoid direct public links)
// Security: Only allows files under /public/user_*/ folders. No traversal.
export async function GET(req: NextRequest) {
  try {
    // Require authentication
    const session = await auth();
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('fileUrl');
    if (!fileUrl) return new Response(JSON.stringify({ error: 'fileUrl requis' }), { status: 400 });

    // Only allow relative paths starting with /user_ to avoid arbitrary fetch
    if (!fileUrl.startsWith('/user_')) {
      return new Response(JSON.stringify({ error: 'Chemin invalide' }), { status: 400 });
    }

    // Decode URL-encoded path (support unicode like accents)
    let relPath = '';
    try {
      relPath = decodeURIComponent(fileUrl);
    } catch {
      relPath = fileUrl;
    }
    // Build absolute path under public/
    const publicRoot = path.join(process.cwd(), 'public');
    const abs = path.join(publicRoot, relPath.replace(/^\/+/, ''));

    // Security: ensure path remains inside public/
    const normPublic = path.resolve(publicRoot);
    const normAbs = path.resolve(abs);
    if (!normAbs.startsWith(normPublic)) {
      return new Response(JSON.stringify({ error: 'Chemin invalide' }), { status: 400 });
    }

    const stat = await fs.stat(normAbs).catch(() => null);
    if (!stat || !stat.isFile()) {
      return new Response(JSON.stringify({ error: 'Fichier introuvable' }), { status: 404 });
    }

  const data = new Uint8Array(await fs.readFile(normAbs));
    // Guess simple content type from extension
    const ext = path.extname(normAbs).toLowerCase();
    const type =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : ext === '.gif'
            ? 'image/gif'
            : ext === '.svg'
              ? 'image/svg+xml'
              : ext === '.pdf'
                ? 'application/pdf'
                : 'application/octet-stream';
    const headers = new Headers({ 'content-type': type, 'cache-control': 'private, max-age=60' });
  return new Response(data, { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Erreur proxy' }), { status: 500 });
  }
}
