import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';
import { z } from 'zod';

// Match events/timeslots behavior: map to local-literal YYYY-MM-DDTHH:MM:SS (server local time)
function toLocalLiteral(d: Date | string | null | undefined): string | null {
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
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  discipline: z.enum(['chimie', 'physique']).optional(),
  notes: z.string().nullable().optional(),
  materiels: z.array(materielItemSchema).optional(),
  reactifs: z.array(reactifItemSchema).optional(),
  documents: z.array(documentItemSchema).optional(),
  sharedIds: z.array(z.number().int()).optional(),
});

async function ensureOwner(presetId: number, userId: number) {
  const p = await prisma.evenementPreset.findUnique({
    where: { id: presetId },
    select: { ownerId: true },
  });
  if (!p || p.ownerId !== userId) return false;
  return true;
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const preset = await prisma.evenementPreset.findFirst({
      where: { id, ownerId: userId },
      include: { materiels: true, reactifs: true, documents: true },
    });
    if (!preset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const mapped = {
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
    };
    return NextResponse.json({ preset: mapped });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: idStr } = await context.params;
    const id = Number(idStr);
    if (!(await ensureOwner(id, userId)))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.evenementPreset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: idStr } = await context.params;
    const id = Number(idStr);
    if (!(await ensureOwner(id, userId)))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await req.json();
    const data = updateSchema.parse(body);
    // Update main preset
    if (data.title || data.discipline || 'notes' in data || 'sharedIds' in data) {
      await prisma.evenementPreset.update({
        where: { id },
        data: {
          title: data.title || undefined,
          discipline: data.discipline || undefined,
          notes: data.notes === undefined ? undefined : data.notes || null,
          ...(data.sharedIds ? { sharedIds: data.sharedIds as any } : {}),
        },
      });
    }
    // Replace related collections if provided
    await prisma.$transaction(async (tx) => {
      if (data.materiels) {
        await tx.evenementPresetMateriel.deleteMany({ where: { presetId: id } });
        if (data.materiels.length) {
          await tx.evenementPresetMateriel.createMany({
            data: data.materiels.map((m) => ({
              presetId: id,
              materielId: m.materielId,
              materielName: m.materielName,
              quantity: m.quantity,
              isCustom: m.isCustom || false,
            })),
          });
        }
      }
      if (data.reactifs) {
        await tx.evenementPresetReactif.deleteMany({ where: { presetId: id } });
        if (data.reactifs.length) {
          await tx.evenementPresetReactif.createMany({
            data: data.reactifs.map((r) => ({
              presetId: id,
              reactifId: r.reactifId,
              reactifName: r.reactifName,
              requestedQuantity: r.requestedQuantity,
              unit: r.unit || 'g',
              isCustom: r.isCustom || false,
            })),
          });
        }
      }
      if (data.documents) {
        await tx.evenementPresetDocument.deleteMany({ where: { presetId: id } });
        if (data.documents.length) {
          await tx.evenementPresetDocument.createMany({
            data: data.documents.map((d) => ({
              presetId: id,
              fileName: d.fileName,
              fileUrl: d.fileUrl,
              fileSize: d.fileSize,
              fileType: d.fileType,
            })),
          });
        }
      }
    });
    const preset = await prisma.evenementPreset.findUnique({
      where: { id },
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
    return NextResponse.json({ preset: mapped });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
