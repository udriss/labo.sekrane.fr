import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';
const toLocalLiteral = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const toLocal = (dt: Date) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
  if (typeof d === 'string') {
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(d)) return d.replace(/\.\d{3}$/, '');
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? d : toLocal(parsed);
  }
  return toLocal(d);
};

const jsonAddSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
});

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
const MAX_BYTES = 10 * 1024 * 1024;

function getFrenchMonthFolder(date = new Date()) {
  const month = date.toLocaleString('fr-FR', { month: 'long' });
  return `${month}_${date.getFullYear()}`;
}
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
async function archivePhysicalFile(relativeUrl: string) {
  try {
    if (!relativeUrl.startsWith('/')) return;
    const publicRoot = path.join(process.cwd(), 'public');
    const abs = path.join(publicRoot, relativeUrl.replace(/^\//, ''));
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat || !stat.isFile()) return;
    const now = new Date();
    const monthYear = now
      .toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })
      .replace('/', '-');
    const targetDir = path.join(publicRoot, 'deleted', 'presets', monthYear);
    await fs.mkdir(targetDir, { recursive: true });
    const baseName = path.basename(abs);
    let target = path.join(targetDir, baseName);
    let n = 1;
    while (true) {
      try {
        await fs.access(target);
        const parsed = path.parse(baseName);
        target = path.join(targetDir, `${parsed.name}_${n}${parsed.ext}`);
        n++;
      } catch {
        break;
      }
    }
    await fs.rename(abs, target).catch(() => {});
  } catch {}
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const presetId = Number(id);
  if (!Number.isFinite(presetId))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ct = req.headers.get('content-type') || '';
  try {
    if (ct.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as unknown as File | null;
      if (!file) return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
      const originalName = file.name || 'fichier';
      const ext = ('.' + (originalName.split('.').pop() || '')).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        return NextResponse.json({ error: `Type non autorisé: ${ext}` }, { status: 400 });
      }
      const ab = await file.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length > MAX_BYTES) {
        return NextResponse.json({ error: 'Fichier trop volumineux (>10MB)' }, { status: 400 });
      }
      const uploadsRoot = path.join(process.cwd(), 'public');
      const userFolder = `user_${session.user.id}`;
      const monthFolder = getFrenchMonthFolder();
      const targetDir = path.join(uploadsRoot, userFolder, monthFolder);
      await fs.mkdir(targetDir, { recursive: true });
      const safeName = sanitizeFilename(originalName);
      const finalPath = await ensureUniqueFile(path.join(targetDir, safeName));
      await fs.writeFile(finalPath, buf);
      const relPath = '/' + [userFolder, monthFolder, path.basename(finalPath)].join('/');
      const created = await prisma.evenementPresetDocument.create({
        data: {
          presetId,
          fileName: path.basename(finalPath),
          fileUrl: relPath,
          fileSize: buf.length,
          fileType: file.type || 'application/octet-stream',
        },
      });
      const mapped: any = created
        ? {
            ...created,
            createdAt: toLocalLiteral((created as any).createdAt),
            updatedAt: toLocalLiteral((created as any).updatedAt),
          }
        : created;
      return NextResponse.json({ document: mapped, uploaded: true });
    }
    const raw = await req.json();
    const parsed = jsonAddSchema.parse(raw);
    try {
      const created = await prisma.evenementPresetDocument.create({
        data: {
          presetId,
          fileName: parsed.fileName,
          fileUrl: parsed.fileUrl,
          fileSize: parsed.fileSize,
          fileType: parsed.fileType,
        },
      });
      const mapped: any = created
        ? {
            ...created,
            createdAt: toLocalLiteral((created as any).createdAt),
            updatedAt: toLocalLiteral((created as any).updatedAt),
          }
        : created;
      return NextResponse.json({ document: mapped, uploaded: false });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const existing = await prisma.evenementPresetDocument.findFirst({
          where: { presetId, fileUrl: (raw?.fileUrl as string) || '' },
        });
        return NextResponse.json({ document: existing, duplicate: true });
      }
      throw e;
    }
  } catch (e) {
    console.error('[preset-documents][POST]', e);
    return NextResponse.json({ error: "Échec d'ajout" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const presetId = Number(id);
  if (!Number.isFinite(presetId))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('fileUrl');
    if (!fileUrl) return NextResponse.json({ error: 'fileUrl requis' }, { status: 400 });
    const doc = await prisma.evenementPresetDocument.findFirst({ where: { presetId, fileUrl } });
    if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    await prisma.evenementPresetDocument.delete({ where: { id: doc.id } });
    archivePhysicalFile(doc.fileUrl).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[preset-documents][DELETE]', e);
    return NextResponse.json({ error: 'Échec suppression' }, { status: 500 });
  }
}
