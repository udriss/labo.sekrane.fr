import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { loadAppSettings } from '@/lib/services/app-settings';
import { notificationService } from '@/lib/services/notification-service';

export const runtime = 'nodejs';

// Endpoint unifié pour ajouter OU téléverser + ajouter un document lié à un événement.
// Deux modes:
// 1) POST multipart/form-data avec champ 'file' -> upload + ajout DB.
// 2) POST JSON { fileName,fileUrl,fileSize?,fileType? } (cas où fichier déjà upload via /api/upload).
// DELETE ?fileUrl=... -> suppression (archive physique) d'un document.

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
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

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

async function archivePhysicalFile(relativeUrl: string, userName: string) {
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
    const safeUser = userName || 'inconnu';
    const targetDir = path.join(publicRoot, 'deleted', safeUser, monthYear);
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
  } catch (e) {
    console.error('[documents][archive]', e);
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const eventId = parseInt(idStr, 10);
  if (Number.isNaN(eventId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ct = req.headers.get('content-type') || '';
  try {
    // Multipart upload mode
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
      // Create DB row
      const created = await prisma.evenementDocument.create({
        data: {
          eventId,
          fileName: path.basename(finalPath),
          fileUrl: relPath,
          fileSize: buf.length,
          fileType: file.type || 'application/octet-stream',
        },
      });
      // Owner notification (document added)
      try {
        const settings = await loadAppSettings();
        if (
          settings.notificationOwnerEvents?.enabled &&
          settings.notificationOwnerEvents.includeDocuments
        ) {
          const ev = await prisma.evenement.findUnique({
            where: { id: eventId },
            select: { ownerId: true, title: true },
          });
          const actorId = Number(session.user.id);
          const blocked = settings.notificationOwnerEvents?.blockedUserIds || [];
          if (ev?.ownerId && !blocked.includes(ev.ownerId)) {
            await notificationService.createAndDispatch({
              module: 'EVENTS_OWNER',
              actionType: 'OWNER_DOC_ADDED',
              severity: 'low',
              message: `Un document a été ajouté à votre événement <strong>${ev.title}</strong>`,
              data: { eventId, fileName: path.basename(finalPath), byUserId: actorId },
              targetUserIds: [ev.ownerId],
            });
          }
        }
      } catch {}
      return NextResponse.json({ document: created, uploaded: true });
    }
    // JSON reference mode
    const raw = await req.json();
    const parsed = jsonAddSchema.parse(raw);
    try {
      const created = await prisma.evenementDocument.create({
        data: {
          eventId,
          fileName: parsed.fileName,
          fileUrl: parsed.fileUrl,
          fileSize: parsed.fileSize,
          fileType: parsed.fileType,
        },
      });
      // Owner notification (document added)
      try {
        const settings = await loadAppSettings();
        if (
          settings.notificationOwnerEvents?.enabled &&
          settings.notificationOwnerEvents.includeDocuments
        ) {
          const ev = await prisma.evenement.findUnique({
            where: { id: eventId },
            select: { ownerId: true, title: true },
          });
          const actorId = Number(session.user.id);
          const blocked = settings.notificationOwnerEvents?.blockedUserIds || [];
          if (ev?.ownerId && !blocked.includes(ev.ownerId)) {
            await notificationService.createAndDispatch({
              module: 'EVENTS_OWNER',
              actionType: 'OWNER_DOC_ADDED',
              severity: 'low',
              message: `Un document a été ajouté à votre événement <strong>${ev.title}</strong>`,
              data: { eventId, fileName: parsed.fileName, byUserId: actorId },
              targetUserIds: [ev.ownerId],
            });
          }
        }
      } catch {}
      return NextResponse.json({ document: created, uploaded: false });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const existing = await prisma.evenementDocument.findFirst({
          where: { eventId, fileUrl: parsed.fileUrl },
        });
        return NextResponse.json({ document: existing, duplicate: true });
      }
      throw e;
    }
  } catch (e) {
    console.error('[documents][POST]', e);
    return NextResponse.json({ error: "Échec d'ajout" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const eventId = parseInt(idStr, 10);
  if (Number.isNaN(eventId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('fileUrl');
    if (!fileUrl) return NextResponse.json({ error: 'fileUrl requis' }, { status: 400 });
    const doc = await prisma.evenementDocument.findFirst({ where: { eventId, fileUrl } });
    if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    await prisma.evenementDocument.delete({ where: { id: doc.id } });
    // Archiver physiquement (non bloquant si erreur)
    archivePhysicalFile(doc.fileUrl, session.user.name || `user_${session.user.id}`).catch(
      () => {},
    );
    // Owner notification (document removed)
    try {
      const settings = await loadAppSettings();
      if (
        settings.notificationOwnerEvents?.enabled &&
        settings.notificationOwnerEvents.includeDocuments
      ) {
        const ev = await prisma.evenement.findUnique({
          where: { id: eventId },
          select: { ownerId: true, title: true },
        });
        const actorId = Number(session.user.id);
        const blocked = settings.notificationOwnerEvents?.blockedUserIds || [];
        if (ev?.ownerId && !blocked.includes(ev.ownerId)) {
          await notificationService.createAndDispatch({
            module: 'EVENTS_OWNER',
            actionType: 'OWNER_DOC_REMOVED',
            severity: 'low',
            message: `Un document a été supprimé de votre événement <strong>${ev.title}</strong>`,
            data: { eventId, fileUrl: doc.fileUrl, byUserId: actorId },
            targetUserIds: [ev.ownerId],
          });
        }
      }
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[documents][DELETE]', e);
    return NextResponse.json({ error: 'Échec suppression' }, { status: 500 });
  }
}
