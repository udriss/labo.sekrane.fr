import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';
import { z } from 'zod';

// Format timestamps like events/timeslots: local-literal YYYY-MM-DDTHH:MM:SS
function toLocalLiteral(d: Date | string | null | undefined): string | null {
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

const materielItemSchema = z.object({
  materielId: z.number().int().optional(),
  materielName: z.string(),
  quantity: z.number().int().min(1).default(1),
  isCustom: z.boolean().optional().default(false),
});

const reactifItemSchema = z.object({
  reactifId: z.number().int().optional(),
  reactifName: z.string(),
  requestedQuantity: z.number().min(0).default(0),
  unit: z.string().optional().default('g'),
  isCustom: z.boolean().optional().default(false),
});

const documentItemSchema = z.object({
  fileName: z.string(),
  fileUrl: z.string(),
  fileSize: z.number().int().optional(),
  fileType: z.string().optional(),
});

const createPresetSchema = z.object({
  title: z.string().min(1),
  discipline: z.enum(['chimie', 'physique']),
  notes: z.string().optional(),
  materiels: z.array(materielItemSchema).optional().default([]),
  reactifs: z.array(reactifItemSchema).optional().default([]),
  documents: z.array(documentItemSchema).optional().default([]),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const presets = await prisma.evenementPreset.findMany({
      where: { ownerId: userId },
      include: { materiels: true, reactifs: true, documents: true },
      orderBy: { createdAt: 'desc' },
    });
    // Also fetch presets shared with this user (immutable for non-owners)
    const sharedCandidates = await prisma.evenementPreset.findMany({
      where: {
        ownerId: { not: userId },
      },
      include: { materiels: true, reactifs: true, documents: true },
      orderBy: { createdAt: 'desc' },
    });
    const shared = sharedCandidates.filter((p: any) =>
      Array.isArray(p.sharedIds) ? (p.sharedIds as any[]).includes(userId) : false,
    );
    // Map createdAt/updatedAt to local-literal strings (no timezone) to prevent +2h display shift
    const mapOne = (p: any) => ({
      ...p,
      createdAt: toLocalLiteral(p.createdAt),
      updatedAt: toLocalLiteral(p.updatedAt),
      materiels: (p.materiels || []).map((m: any) => ({
        ...m,
        createdAt: toLocalLiteral(m.createdAt),
        updatedAt: toLocalLiteral(m.updatedAt),
      })),
      reactifs: (p.reactifs || []).map((r: any) => ({
        ...r,
        createdAt: toLocalLiteral(r.createdAt),
        updatedAt: toLocalLiteral(r.updatedAt),
      })),
      documents: (p.documents || []).map((d: any) => ({
        ...d,
        createdAt: toLocalLiteral(d.createdAt),
        updatedAt: toLocalLiteral(d.updatedAt),
      })),
    });
    const mapped = presets.map(mapOne);
    const sharedMapped = shared.map(mapOne);
    return NextResponse.json({ presets: mapped, shared: sharedMapped });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const data = createPresetSchema.parse(body);
    const created = await prisma.evenementPreset.create({
      data: {
        title: data.title,
        discipline: data.discipline,
        notes: data.notes,
        ownerId: userId,
      },
    });
    if (data.materiels.length) {
      await prisma.$transaction(
        data.materiels.map((m) =>
          prisma.evenementPresetMateriel.create({
            data: {
              presetId: created.id,
              materielId: m.materielId,
              materielName: m.materielName,
              quantity: m.quantity,
              isCustom: m.isCustom || false,
            },
          }),
        ),
      );
    }
    if (data.reactifs.length) {
      await prisma.$transaction(
        data.reactifs.map((r) =>
          prisma.evenementPresetReactif.create({
            data: {
              presetId: created.id,
              reactifId: r.reactifId,
              reactifName: r.reactifName,
              requestedQuantity: r.requestedQuantity,
              unit: r.unit || 'g',
              isCustom: r.isCustom || false,
            },
          }),
        ),
      );
    }
    if (data.documents.length) {
      await prisma.$transaction(
        data.documents.map((d) =>
          prisma.evenementPresetDocument.create({
            data: {
              presetId: created.id,
              fileName: d.fileName,
              fileUrl: d.fileUrl,
              fileSize: d.fileSize,
              fileType: d.fileType,
            },
          }),
        ),
      );
    }
    const preset = await prisma.evenementPreset.findUnique({
      where: { id: created.id },
      include: { materiels: true, reactifs: true, documents: true },
    });
    const mapped = preset
      ? {
          ...preset,
          createdAt: toLocalLiteral((preset as any).createdAt),
          updatedAt: toLocalLiteral((preset as any).updatedAt),
          materiels: (preset as any).materiels?.map((m: any) => ({
            ...m,
            createdAt: toLocalLiteral(m.createdAt),
            updatedAt: toLocalLiteral(m.updatedAt),
          })),
          reactifs: (preset as any).reactifs?.map((r: any) => ({
            ...r,
            createdAt: toLocalLiteral(r.createdAt),
            updatedAt: toLocalLiteral(r.updatedAt),
          })),
          documents: (preset as any).documents?.map((d: any) => ({
            ...d,
            createdAt: toLocalLiteral(d.createdAt),
            updatedAt: toLocalLiteral(d.updatedAt),
          })),
        }
      : null;
    return NextResponse.json({ preset: mapped }, { status: 201 });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
  }
}
