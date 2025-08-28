import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import fs from 'fs/promises';
import path from 'path';
import { auth } from '@/auth';

// Move physical file into /public/deleted/<userName>/<MM-YYYY>/<originalName>
async function safeArchiveFile(relativeUrl: string, userName: string) {
  try {
    if (!relativeUrl.startsWith('/')) return; // only local public files
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
    let i = 1;
    while (true) {
      try {
        await fs.access(target);
        const parsed = path.parse(baseName);
        target = path.join(targetDir, `${parsed.name}_${i}${parsed.ext}`);
        i++;
      } catch {
        break;
      }
    }
    await fs.rename(abs, target);
  } catch (e) {
    // Swallow errors to not block logical deletion
    console.error('[documents][archive] error', e);
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const docs = Array.isArray(body.documents) ? body.documents : [];
    // Replace documents set for event (full array) and archive deleted if provided
    const deleted = body.deleted; // {fileUrl,fileName}

    // Fetch current docs to identify which one removed
    const current = await prisma.evenement.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!current) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    if (deleted && deleted.fileUrl) {
      const was = current.documents.find((d) => d.fileUrl === deleted.fileUrl);
      if (was) await safeArchiveFile(was.fileUrl, session.user.name || 'utilisateur');
    }

    await prisma.evenement.update({
      where: { id },
      data: {
        documents: {
          deleteMany: {},
          create: docs.map((d: any) => ({
            fileName: d.fileName || 'Document',
            fileUrl: d.fileUrl,
            fileSize: typeof d.fileSize === 'number' ? d.fileSize : undefined,
            fileType: d.fileType || undefined,
          })),
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update documents' }, { status: 500 });
  }
}
