import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';

const ALLOWED_EXTS = [
  '.pdf',
  '.doc',
  '.docx',
  '.odt',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.txt',
  '.svg',
];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() || 'fichier';
  return base.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._\-éèêëàâäôöîïûüçÉÈÊËÀÂÄÔÖÎÏÛÜÇ]/g, '');
}

async function ensureUniqueFile(filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  let finalPath = filePath;
  let i = 1;
  while (true) {
    try {
      await fs.access(finalPath);
      finalPath = path.join(dir, `${base}-${i}${ext}`);
      i++;
    } catch {
      break;
    }
  }
  return finalPath;
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id: draftId } = await context.params;
  if (!draftId || draftId.length > 100)
    return NextResponse.json({ error: 'draftId invalide' }, { status: 400 });
  const ct = req.headers.get('content-type') || '';
  if (!ct.startsWith('multipart/form-data'))
    return NextResponse.json({ error: 'multipart/form-data requis' }, { status: 400 });
  try {
    const form = await req.formData();
    const file = form.get('file') as unknown as File | null;
    if (!file) return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
    const originalName = file.name || 'fichier';
    const ext = ('.' + (originalName.split('.').pop() || '')).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext))
      return NextResponse.json({ error: `Type non autorisé: ${ext}` }, { status: 400 });
    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length > MAX_BYTES)
      return NextResponse.json({ error: 'Fichier trop volumineux (>10MB)' }, { status: 400 });

    const uploadsRoot = path.join(process.cwd(), 'public');
    const userFolder = `user_${session.user.id}`;
    const targetDir = path.join(uploadsRoot, userFolder, 'drafts', draftId);
    await fs.mkdir(targetDir, { recursive: true });
    const safeName = sanitizeFilename(originalName);
    const finalPath = await ensureUniqueFile(path.join(targetDir, safeName));
    await fs.writeFile(finalPath, buf);
    const relPath = '/' + [userFolder, 'drafts', draftId, path.basename(finalPath)].join('/');
    return NextResponse.json({
      fileName: path.basename(finalPath),
      fileUrl: relPath,
      fileSize: buf.length,
      fileType: file.type || 'application/octet-stream',
      uploaded: true,
    });
  } catch (e) {
    console.error('[draft-upload][POST]', e);
    return NextResponse.json({ error: "Échec d'upload" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id: draftId } = await context.params;
  if (!draftId || draftId.length > 100)
    return NextResponse.json({ error: 'draftId invalide' }, { status: 400 });
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('fileUrl');
    if (!fileUrl) return NextResponse.json({ error: 'fileUrl requis' }, { status: 400 });
    // Only allow deleting within the user's draft folder
    const expectedPrefix = `/user_${session.user.id}/drafts/${draftId}/`;
    if (!fileUrl.startsWith(expectedPrefix))
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    const publicRoot = path.join(process.cwd(), 'public');
    const abs = path.join(publicRoot, fileUrl.replace(/^\//, ''));
    try {
      await fs.unlink(abs);
    } catch {
      // ignore if already gone
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[draft-upload][DELETE]', e);
    return NextResponse.json({ error: 'Échec suppression' }, { status: 500 });
  }
}
