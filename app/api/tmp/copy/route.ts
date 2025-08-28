import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Basic mime mapping for common types
const EXT_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
};

// POST /api/tmp/copy
// Body: { fileUrl: string }
// Copies the file from fileUrl to public/tmp and returns { tmpUrl, fileName, fileType, fileSize }
export async function POST(req: NextRequest) {
  try {
    const { fileUrl } = await req.json();
    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json({ error: 'fileUrl manquant' }, { status: 400 });
    }

    // Resolve and read the source into a buffer
    let buffer: Buffer;
    let contentType = 'application/octet-stream';
    let contentLength = 0;

    const isHttp = /^https?:\/\//i.test(fileUrl);
    const isApiRelative = fileUrl.startsWith('/api/');
    const isPublicRelative = fileUrl.startsWith('/');

    if (isHttp || isApiRelative) {
      // Fetch from network (absolute or API-relative)
      const abs = isHttp ? fileUrl : new URL(fileUrl, req.nextUrl.origin).toString();
      const res = await fetch(abs, { headers: { cookie: req.headers.get('cookie') ?? '' } });
      if (!res.ok) {
        return NextResponse.json(
          { error: 'Impossible de télécharger le fichier source' },
          { status: 400 },
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = res.headers.get('content-type') || contentType;
      contentLength = Number(res.headers.get('content-length') || buffer.length);
    } else if (isPublicRelative) {
      // Read from public directory (e.g. /user_123/..., /tmp/...)
      const publicDir = path.join(process.cwd(), 'public');
      const srcPath = path.join(publicDir, fileUrl.replace(/^\/+/, ''));
      const stat = await fs.stat(srcPath).catch(() => null);
      if (!stat || !stat.isFile()) {
        return NextResponse.json({ error: 'Fichier source introuvable' }, { status: 404 });
      }
      buffer = await fs.readFile(srcPath);
      contentLength = stat.size;
      const ext = path.extname(srcPath).toLowerCase();
      if (EXT_MIME[ext]) contentType = EXT_MIME[ext];
    } else {
      return NextResponse.json({ error: 'URL non supportée' }, { status: 400 });
    }

    // Derive filename and extension from the URL
    const urlPath = (() => {
      try {
        const u = new URL(isHttp ? fileUrl : new URL(fileUrl, req.nextUrl.origin).toString());
        return u.pathname;
      } catch {
        return fileUrl;
      }
    })();
    const baseName = path.basename(decodeURIComponent(urlPath).split('?')[0] || 'file');
    const extFromName = path.extname(baseName);
    const ext = extFromName || (contentType.startsWith('image/') ? `.${contentType.split('/')[1]}` : '');
    const safeExt = ext || '.bin';

    const outName = `${Date.now()}_${Math.random().toString(36).slice(2)}${safeExt}`;

    const publicDir = path.join(process.cwd(), 'public');
    const tmpDir = path.join(publicDir, 'tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const outPath = path.join(tmpDir, outName);
    await fs.writeFile(outPath, buffer);

    const tmpUrl = `/tmp/${outName}`;
    return NextResponse.json({
      tmpUrl,
      fileName: baseName,
      fileType: contentType,
      fileSize: contentLength || buffer.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
