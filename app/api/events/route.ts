// api/events/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { z } from 'zod';
import { auth } from '@/auth';
import { notificationService } from '@/lib/services/notification-service';
import path from 'path';
import fs from 'fs/promises';
// Convert Date/ISO strings into local-literal "YYYY-MM-DDTHH:MM:SS" (server local time)
function formatLocalLiteral(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const toLocal = (dt: Date) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
  if (typeof d === 'string') {
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(d)) return d.replace(/\.\d{3}$/, '');
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return toLocal(parsed);
    return d;
  }
  return toLocal(d);
}

// Accept both legacy keys (materielName / reactifName) and unified 'name'
const materielItemSchema = z
  .object({
    materielId: z.number().int().optional(),
    materielName: z.string().optional(), // legacy
    name: z.string().optional(), // unified
    quantity: z.number().int().min(1).default(1),
    isCustom: z.boolean().optional().default(false),
  })
  .refine((d) => !!(d.materielName || d.name), {
    message: 'materielName or name required',
    path: ['name'],
  });

const reactifItemSchema = z
  .object({
    reactifId: z.number().int().optional(),
    reactifName: z.string().optional(), // legacy
    name: z.string().optional(), // unified
    requestedQuantity: z.number().min(0).default(0),
    unit: z.string().optional().default('g'),
    isCustom: z.boolean().optional().default(false),
  })
  .refine((d) => !!(d.reactifName || d.name), {
    message: 'reactifName or name required',
    path: ['name'],
  });

const documentItemSchema = z.object({
  fileName: z.string(),
  fileUrl: z.string(),
  fileSize: z.number().int().optional(),
  fileType: z.string().optional(),
  isPreset: z.boolean().optional(),
  isCopied: z.boolean().optional(),
});

const createEventSchema = z.object({
  title: z.string().optional(),
  discipline: z.enum(['chimie', 'physique']),
  type: z.enum(['TP', 'LABORANTIN_CHIMIE', 'LABORANTIN_PHYSIQUE']).optional(),
  notes: z.string().optional(),
  classIds: z.array(z.number().int()).optional().default([]),
  salleIds: z.array(z.number().int()).optional().default([]),
  materiels: z.array(materielItemSchema).optional().default([]),
  reactifs: z.array(reactifItemSchema).optional().default([]),
  documents: z.array(documentItemSchema).optional().default([]),
  replaceReservedId: z.number().int().optional(), // ID of placeholder to replace
});

// Helpers for copying preset files into event folder
function getFrenchMonthFolder(date = new Date()) {
  const raw = date.toLocaleString('fr-FR', { month: 'long' });
  // Normalize: remove accents, replace apostrophes with '_', spaces with '_', restrict charset
  let safe = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  safe = safe.replace(/['’]/g, '_').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safe) safe = 'mois';
  return `${safe}_${date.getFullYear()}`;
}
function sanitizeFilename(name: string): string {
  let base = name.split(/[\\/]/).pop() || 'fichier';
  base = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  base = base.replace(/['’]/g, '_');
  base = base.replace(/\s+/g, '_');
  base = base.replace(/[^a-zA-Z0-9._-]/g, '');
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const discipline = searchParams.get('discipline');

    const events = await prisma.evenement.findMany({
      where: discipline ? { discipline } : undefined,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        timeslots: true,
        materiels: {
          include: {
            materiel: {
              select: {
                id: true,
                name: true,
                category: true,
                model: true,
                serialNumber: true,
              },
            },
          },
        },
        reactifs: {
          include: {
            reactif: {
              include: {
                reactifPreset: {
                  select: {
                    id: true,
                    name: true,
                    casNumber: true,
                    formula: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
        customMaterielRequests: true,
        customReactifRequests: true,
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Normalize createdAt/updatedAt to local-literal (no timezone) across objects
    const mapped = (events as any[]).map((ev) => ({
      ...ev,
      createdAt: formatLocalLiteral(ev.createdAt),
      updatedAt: formatLocalLiteral(ev.updatedAt),
      timeslots: (ev.timeslots || []).map((t: any) => ({
        ...t,
        createdAt: formatLocalLiteral(t.createdAt),
        updatedAt: formatLocalLiteral(t.updatedAt),
      })),
      materiels: (ev.materiels || []).map((m: any) => ({
        ...m,
        createdAt: formatLocalLiteral(m.createdAt),
        updatedAt: formatLocalLiteral(m.updatedAt),
      })),
      reactifs: (ev.reactifs || []).map((r: any) => ({
        ...r,
        createdAt: formatLocalLiteral(r.createdAt),
        updatedAt: formatLocalLiteral(r.updatedAt),
      })),
      customMaterielRequests: (ev.customMaterielRequests || []).map((cm: any) => ({
        ...cm,
        createdAt: formatLocalLiteral(cm.createdAt),
        updatedAt: formatLocalLiteral(cm.updatedAt),
      })),
      customReactifRequests: (ev.customReactifRequests || []).map((cr: any) => ({
        ...cr,
        createdAt: formatLocalLiteral(cr.createdAt),
        updatedAt: formatLocalLiteral(cr.updatedAt),
      })),
      documents: (ev.documents || []).map((d: any) => ({
        ...d,
        createdAt: formatLocalLiteral(d.createdAt),
        updatedAt: formatLocalLiteral(d.updatedAt),
      })),
    }));
    return NextResponse.json({ events: mapped });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    console.log('[events][POST] Received payload:', JSON.stringify(body, null, 2));

    const validatedData = createEventSchema.parse(body);
    console.log('[events][POST] Validation passed, validated data:', JSON.stringify(validatedData, null, 2));

    // Ensure uniqueness defensively on server-side as well
    const uniqueSalleIds = Array.isArray(validatedData.salleIds)
      ? Array.from(new Set(validatedData.salleIds))
      : [];
    const uniqueClassIds = Array.isArray(validatedData.classIds)
      ? Array.from(new Set(validatedData.classIds))
      : [];

    // no debug logs in production

    // Create event with provided title or temporary placeholder
    const providedTitle = (validatedData.title || '').trim();
    const tempTitle = providedTitle || `TEMP_${Date.now()}`; // Temporary placeholder

    const inferredType =
      validatedData.type ||
      (tempTitle.toLowerCase().includes('labor')
        ? validatedData.discipline === 'physique'
          ? 'LABORANTIN_PHYSIQUE'
          : 'LABORANTIN_CHIMIE'
        : 'TP');

    const event = await prisma.evenement.create({
      data: {
        title: tempTitle,
        discipline: validatedData.discipline,
        type: inferredType,
        notes: validatedData.notes,
        ownerId: userId,
        classIds: uniqueClassIds.length ? (uniqueClassIds as any) : undefined,
        salleIds: uniqueSalleIds.length ? (uniqueSalleIds as any) : undefined,
      },
    });

    if (validatedData.materiels && validatedData.materiels.length) {
      const mapped = validatedData.materiels.map((m) => ({
        materielId: m.materielId,
        materielName: (m as any).materielName || (m as any).name || 'Item',
        quantity: m.quantity ?? 1,
        isCustom: m.isCustom || false,
      }));
      await prisma.$transaction(
        mapped.map((m) =>
          prisma.evenementMateriel.create({
            data: { eventId: event.id, ...m },
          }),
        ),
      );
    }
    if (validatedData.reactifs && validatedData.reactifs.length) {
      const mapped = validatedData.reactifs.map((r) => ({
        reactifId: r.reactifId,
        reactifName: (r as any).reactifName || (r as any).name || 'Réactif',
        requestedQuantity: r.requestedQuantity ?? 0,
        unit: r.unit || 'g',
        isCustom: r.isCustom || false,
      }));
      await prisma.$transaction(
        mapped.map((r) =>
          prisma.evenementReactif.create({
            data: { eventId: event.id, ...r },
          }),
        ),
      );
    }
    if (validatedData.documents && validatedData.documents.length) {
      console.log(`[events][create] Preparing to add ${validatedData.documents.length} documents for event ID ${event.id}`);
      const publicRoot = path.join(process.cwd(), 'public');
      const userFolder = `user_${userId}`;
      const monthFolder = getFrenchMonthFolder();
      const prepared: Array<{ fileName: string; fileUrl: string; fileSize?: number; fileType?: string }> = [];
      for (const d of validatedData.documents) {
        let outName = sanitizeFilename(d.fileName || 'document');
        let outUrl = d.fileUrl;
        let outSize = d.fileSize;
        const outType = d.fileType;
        const wantCopy = d.isPreset === true || d.isCopied === true || 
          (typeof d.fileUrl === 'string' && (d.fileUrl.includes('/preset/') || d.fileUrl.includes('/user_')));
        if (wantCopy) {
          const relRaw = d.fileUrl.replace(/^\/+/, '');
          let relDec = relRaw;
          try { relDec = decodeURIComponent(relRaw); } catch {}
          
          // Extraire le nom du fichier depuis n'importe quelle URL source
          const fileName = path.basename(relDec);
          
          let sourcePath: string;
          if (d.isPreset === true || relDec.includes('/preset/')) {
            // Pour les presets : utiliser le chemin après /preset/
            sourcePath = relDec.replace('/preset/', '/');
          } else if (d.isCopied === true || relDec.includes('/user_')) {
            // Pour les événements copiés : utiliser le chemin complet (on copie depuis un autre user)
            sourcePath = relDec;
          } else {
            sourcePath = relDec;
          }
          
          // Construire le chemin absolu source
          const sourceAbs = path.join(publicRoot, sourcePath);
          
          // Locate source
          const candidates = [relDec, relRaw];
          let stat: any = null;
          let srcAbs: string | null = null;
          for (const rel of candidates) {
            const abs = path.join(publicRoot, rel);
            const st = await fs.stat(abs).catch(() => null);
            if (st && st.isFile()) { stat = st; srcAbs = abs; break; }
          }
          if (!srcAbs || !stat) {
            console.warn('[events][create] source not found, skipping doc', d.fileUrl);
            continue;
          }
          
          // Construire le chemin de destination avec le mois actuel
          const destDir = path.join(publicRoot, userFolder, monthFolder);
          await fs.mkdir(destDir, { recursive: true });
          
          const buffer = await fs.readFile(srcAbs);
          // Utiliser le nom de fichier extrait pour la destination
          const finalDest = await ensureUniqueFile(path.join(destDir, fileName));
          await fs.writeFile(finalDest, buffer);
          outSize = stat.size;
          outName = path.basename(finalDest);
          outUrl = '/' + [userFolder, monthFolder, outName].join('/');
        }
        prepared.push({ fileName: outName, fileUrl: outUrl, fileSize: outSize, fileType: outType });
      }
      await prisma.$transaction(
        prepared.map((d) =>
          prisma.evenementDocument.create({
            data: { eventId: event.id, ...d },
          }),
        ),
      );
    }

    // Re-fetch with includes
    let finalEvent = await prisma.evenement.findUnique({
      where: { id: event.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        timeslots: true,
        materiels: true,
        reactifs: true,
        documents: true,
        customMaterielRequests: true,
        customReactifRequests: true,
      },
    });

    if (!providedTitle) {
      await prisma.evenement.update({
        where: { id: event.id },
        data: { title: `Événement ID ${event.id}` },
      });
      finalEvent = await prisma.evenement.findUnique({
        where: { id: event.id },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          timeslots: true,
          materiels: true,
          reactifs: true,
          documents: true,
          customMaterielRequests: true,
          customReactifRequests: true,
        },
      });
    }

    // Derive actor name and a representative date (from timeslots if present)
    const actorName = session?.user?.name || session?.user?.email || 'Un utilisateur';
    const dateCandidate = (finalEvent?.timeslots || [])
      .map((t: any) => t.timeslotDate || t.startDate)
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(a as any).getTime() - new Date(b as any).getTime())[0] as
      | string
      | Date
      | undefined;
    const dateStr = dateCandidate
      ? new Date(dateCandidate).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : undefined;

    // Send notification for event creation and await to improve first-run reliability
    try {
      await notificationService.createAndDispatch({
        module: 'EVENTS_GLOBAL',
        actionType: 'CREATE',
        message: `${actorName} a ajouté un nouvel événement en ${finalEvent?.discipline}${
          dateStr ? ` pour le ${dateStr}` : ''
        }`,
        data: {
          eventId: finalEvent?.id,
          title: finalEvent?.title,
          discipline: finalEvent?.discipline,
          classesCount: Array.isArray(finalEvent?.classIds)
            ? finalEvent.classIds.length
            : finalEvent?.classIds && typeof finalEvent.classIds === 'object'
              ? Object.keys(finalEvent.classIds).length || 0
              : 0,
          sallesCount: Array.isArray(finalEvent?.salleIds)
            ? finalEvent.salleIds.length
            : finalEvent?.salleIds && typeof finalEvent.salleIds === 'object'
              ? Object.keys(finalEvent.salleIds).length || 0
              : 0,
          materielsCount: finalEvent?.materiels?.length || 0,
          reactifsCount: finalEvent?.reactifs?.length || 0,
          documentsCount: finalEvent?.documents?.length || 0,
          triggeredBy: session?.user?.name || session?.user?.email || 'système',
        },
        excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
      });
    } catch (e) {
      // Retry once after a short delay to handle lazy init
      try {
        await new Promise((r) => setTimeout(r, 200));
        await notificationService.createAndDispatch({
          module: 'EVENTS_GLOBAL',
          actionType: 'CREATE',
          message: `${actorName} a ajouté un nouvel événement en ${finalEvent?.discipline}${
            dateStr ? ` pour le ${dateStr}` : ''
          }`,
          data: {
            eventId: finalEvent?.id,
            title: finalEvent?.title,
            discipline: finalEvent?.discipline,
            classesCount: Array.isArray(finalEvent?.classIds)
              ? finalEvent.classIds.length
              : finalEvent?.classIds && typeof finalEvent.classIds === 'object'
                ? Object.keys(finalEvent.classIds).length || 0
                : 0,
            sallesCount: Array.isArray(finalEvent?.salleIds)
              ? finalEvent.salleIds.length
              : finalEvent?.salleIds && typeof finalEvent.salleIds === 'object'
                ? Object.keys(finalEvent.salleIds).length || 0
                : 0,
            materielsCount: finalEvent?.materiels?.length || 0,
            reactifsCount: finalEvent?.reactifs?.length || 0,
            documentsCount: finalEvent?.documents?.length || 0,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        });
      } catch (e2) {
        console.error('[events][notify][create]', e2);
      }
    }

    // Normalize createdAt/updatedAt for response
    const mapped = finalEvent
      ? {
          ...finalEvent,
          createdAt: formatLocalLiteral((finalEvent as any).createdAt),
          updatedAt: formatLocalLiteral((finalEvent as any).updatedAt),
          timeslots: (finalEvent as any).timeslots?.map((t: any) => ({
            ...t,
            createdAt: formatLocalLiteral(t.createdAt),
            updatedAt: formatLocalLiteral(t.updatedAt),
          })),
          materiels: (finalEvent as any).materiels?.map((m: any) => ({
            ...m,
            createdAt: formatLocalLiteral(m.createdAt),
            updatedAt: formatLocalLiteral(m.updatedAt),
          })),
          reactifs: (finalEvent as any).reactifs?.map((r: any) => ({
            ...r,
            createdAt: formatLocalLiteral(r.createdAt),
            updatedAt: formatLocalLiteral(r.updatedAt),
          })),
          documents: (finalEvent as any).documents?.map((d: any) => ({
            ...d,
            createdAt: formatLocalLiteral(d.createdAt),
            updatedAt: formatLocalLiteral(d.updatedAt),
          })),
          customMaterielRequests: (finalEvent as any).customMaterielRequests?.map((cm: any) => ({
            ...cm,
            createdAt: formatLocalLiteral(cm.createdAt),
            updatedAt: formatLocalLiteral(cm.updatedAt),
          })),
          customReactifRequests: (finalEvent as any).customReactifRequests?.map((cr: any) => ({
            ...cr,
            createdAt: formatLocalLiteral(cr.createdAt),
            updatedAt: formatLocalLiteral(cr.updatedAt),
          })),
        }
      : null;
    return NextResponse.json({ event: mapped }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[events][POST] Zod validation error:', error.issues);
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('[events][POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
