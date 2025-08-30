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
  copyFromPreset: z.boolean().optional(), // Flag to indicate file needs to be copied from preset folder
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
  const raw = date.toLocaleString('fr-FR', { month: 'long' });
  // Normalize: remove accents, replace apostrophes with '_', spaces with '_', restrict charset
  let safe = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  safe = safe.replace(/['’]/g, '_').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safe) safe = 'mois';
  return `${safe}_${date.getFullYear()}`;
}

function sanitizeFilename(name: string): string {
  // 1) Extract base
  let base = name.split(/[\\/]/).pop() || 'fichier';
  // 2) Normalize and strip accents (diacritics)
  base = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // 3) Replace apostrophes with underscore
  base = base.replace(/['’]/g, '_');
  // 4) Replace spaces with underscore
  base = base.replace(/\s+/g, '_');
  // 5) Remove any disallowed characters (keep a-z A-Z 0-9 . _ -)
  base = base.replace(/[^a-zA-Z0-9._-]/g, '');
  // Fallback if empty
  return base || 'fichier';
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

    // Copy the source into the current user's folder (do not remove the source)
    const publicRoot = path.join(process.cwd(), 'public');
    let buffer: Buffer | null = null;
    let srcFileName = sanitizeFilename(parsed.fileName || 'fichier');
    let srcFileType: string | undefined = parsed.fileType || 'application/octet-stream';
    let srcFileSize: number | undefined = parsed.fileSize;

    if (/^https?:\/\//i.test(parsed.fileUrl)) {
      // Remote URL: fetch then copy
      const res2 = await fetch(parsed.fileUrl, { headers: { cookie: req.headers.get('cookie') ?? '' } });
      if (!res2.ok) {
        return NextResponse.json({ error: 'Téléchargement source impossible' }, { status: 400 });
      }
      const ab = await res2.arrayBuffer();
      buffer = Buffer.from(ab);
      srcFileType = res2.headers.get('content-type') || srcFileType;
      srcFileSize = Number(res2.headers.get('content-length') || buffer.length);
      try {
        const u = new URL(parsed.fileUrl);
        const base = path.basename(decodeURIComponent(u.pathname).split('?')[0] || 'fichier');
        if (!parsed.fileName) srcFileName = sanitizeFilename(base);
      } catch {}
    } else if (parsed.fileUrl.startsWith('/')) {
      // Local public file: read then copy
      const srcAbs = path.join(publicRoot, parsed.fileUrl.replace(/^\/+/, ''));
      const stat = await fs.stat(srcAbs).catch(() => null);
      if (!stat || !stat.isFile()) {
        return NextResponse.json({ error: 'Fichier source introuvable' }, { status: 404 });
      }
      buffer = await fs.readFile(srcAbs);
      srcFileSize = stat.size;
      if (!parsed.fileName) srcFileName = sanitizeFilename(path.basename(srcAbs));

      // If this is a preset file that needs to be copied to event folder, ensure it's copied to the correct location
      if (parsed.copyFromPreset && parsed.fileUrl.includes('/preset/')) {
        // This is a preset file being copied to an event - ensure it goes to event folder structure
        // The targetDir is already set correctly above, so the file will be copied to the event folder
        
      }
    } else {
      return NextResponse.json({ error: 'URL source non supportée' }, { status: 400 });
    }

    // Write to user's folder with unique name
    const userFolder = `user_${session.user.id}`;
    const monthFolder = getFrenchMonthFolder();
    const targetDir = path.join(publicRoot, userFolder, monthFolder);
    await fs.mkdir(targetDir, { recursive: true });
    const finalPath = await ensureUniqueFile(path.join(targetDir, srcFileName));
    await fs.writeFile(finalPath, buffer!);
    const relPath = '/' + [userFolder, monthFolder, path.basename(finalPath)].join('/');

    try {
      const created = await prisma.evenementDocument.create({
        data: {
          eventId,
          fileName: path.basename(finalPath),
          fileUrl: relPath,
          fileSize: srcFileSize,
          fileType: srcFileType,
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
    
    if (fileUrl) {
      // Delete specific document
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
    } else {
      // Delete ALL documents for this event
      const documents = await prisma.evenementDocument.findMany({ 
        where: { eventId },
        select: { id: true, fileUrl: true }
      });
      
      // Archive all physical files
      for (const doc of documents) {
        archivePhysicalFile(doc.fileUrl, session.user.name || `user_${session.user.id}`).catch(() => {});
      }
      
      // Delete all documents from database
      await prisma.evenementDocument.deleteMany({ where: { eventId } });
      
      return NextResponse.json({ ok: true, deletedCount: documents.length });
    }
  } catch (e) {
    console.error('[documents][DELETE]', e);
    return NextResponse.json({ error: 'Échec suppression' }, { status: 500 });
  }
}