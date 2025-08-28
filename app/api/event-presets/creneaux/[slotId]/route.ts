import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';
import { z } from 'zod';

const updateSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeslotDate: z.string().nullable().optional(),
  salleIds: z.array(z.number().int()).optional(),
  classIds: z.array(z.number().int()).optional(),
  state: z.enum(['created', 'modified', 'deleted', 'approved', 'rejected', 'restored']).optional(),
});

function normalizeToISO(input?: string): string | null {
  if (!input) return null;
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(input)) {
    if (/\.\d{3}Z$/.test(input) || /\.\d{3}[+-]\d{2}:?\d{2}$/.test(input)) return input;
    return input.replace(/(Z|[+-]\d{2}:?\d{2})$/, '.000$1');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return `${input}T00:00:00.000Z`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) return `${input}:00.000Z`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(input)) return `${input}.000Z`;
  const d = new Date(input);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

// Keep ISO strings as-is for DateTime fields to preserve local wall times

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

async function ensureSlotOwner(slotId: number, userId: number) {
  const s = await (prisma as any).evenementPresetCreneau.findUnique({
    where: { id: slotId },
    select: { presetId: true },
  });
  if (!s) return false;
  const p = await prisma.evenementPreset.findUnique({
    where: { id: s.presetId },
    select: { ownerId: true },
  });
  return !!p && p.ownerId === userId;
}

export async function PUT(req: NextRequest, context: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await context.params;
  const id = Number(slotId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await ensureSlotOwner(id, userId)))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await req.json();
    const data = updateSchema.parse(body);
    const updated = await (prisma as any).evenementPresetCreneau.update({
      where: { id },
      data: {
        ...(data.startDate ? { startDate: normalizeToISO(data.startDate)! } : {}),
        ...(data.endDate ? { endDate: normalizeToISO(data.endDate)! } : {}),
        ...(data.timeslotDate !== undefined
          ? { timeslotDate: data.timeslotDate ? normalizeToISO(data.timeslotDate)! : null }
          : {}),
        ...(data.salleIds ? { salleIds: data.salleIds } : {}),
        ...(data.classIds ? { classIds: data.classIds } : {}),
        ...(data.state ? { state: data.state } : {}),
      },
    });
    const mapped = updated
      ? {
          ...updated,
          createdAt: toLocalLiteral((updated as any).createdAt),
          updatedAt: toLocalLiteral((updated as any).updatedAt),
        }
      : null;
    return NextResponse.json({ timeslot: mapped });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await context.params;
  const id = Number(slotId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await ensureSlotOwner(id, userId)))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await (prisma as any).evenementPresetCreneau.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
