import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// POST /api/tmp/copy
// Body: { fileUrl: string }
// Copies the file from fileUrl to public/tmp and returns { tmpUrl, fileName, fileType, fileSize }
export async function POST(req: NextRequest) {
  try {
    const { fileUrl } = await req.json();
    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json({ error: 'fileUrl manquant' }, { status: 400 });
    }

    // Fetch the file
    const res = await fetch(fileUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Impossible de télécharger le fichier source' }, { status: 400 });
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const contentLength = Number(res.headers.get('content-length') || buffer.length);

    // Derive filename and extension
    const urlPath = (() => {
      try {
        const u = new URL(fileUrl);
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
      fileSize: contentLength,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
