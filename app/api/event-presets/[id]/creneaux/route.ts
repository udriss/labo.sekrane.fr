import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';
import { z } from 'zod';

const slotSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  timeslotDate: z.string().optional(),
  salleIds: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.number().int())),
  classIds: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.number().int())),
});

const bodySchema = z.object({
  discipline: z.enum(['chimie', 'physique']),
  slots: z.array(slotSchema).min(1),
});

// Normalize to ISO-8601 string without changing wall time semantics (accepts local-like inputs)
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

// Intentionally store ISO strings as-is (Prisma accepts string for DateTime) to avoid timezone shifts

// Helper: local-literal time format for createdAt/updatedAt
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

async function ensurePresetOwner(presetId: number, userId: number) {
  const p = await prisma.evenementPreset.findUnique({
    where: { id: presetId },
    select: { ownerId: true },
  });
  return !!p && p.ownerId === userId;
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const presetId = Number(idStr);
  if (!Number.isFinite(presetId))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await ensurePresetOwner(presetId, userId)))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const slots = await (prisma as any).evenementPresetCreneau.findMany({
      where: { presetId },
      orderBy: [{ timeslotDate: 'asc' }, { startDate: 'asc' }],
    });
    const enriched = slots.map((t: any) => ({
      ...t,
      salleIds: t.salleIds || [],
      classIds: t.classIds || [],
      createdAt: toLocalLiteral(t.createdAt),
      updatedAt: toLocalLiteral(t.updatedAt),
    }));
    console.log('🟢 Slots récupérés:', enriched);
    return NextResponse.json({ timeslots: enriched });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const presetId = Number(idStr);
  if (!Number.isFinite(presetId))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await ensurePresetOwner(presetId, userId)))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await req.json();
    const data = bodySchema.parse(body);
    // Optional: verify discipline matches preset
    try {
      const p = await prisma.evenementPreset.findUnique({
        where: { id: presetId },
        select: { discipline: true },
      });
      if (p && p.discipline !== data.discipline)
        return NextResponse.json({ error: 'Discipline mismatch' }, { status: 400 });
    } catch {}
    const created = await prisma.$transaction(
      data.slots.map((s) =>
        (prisma as any).evenementPresetCreneau.create({
          data: {
            presetId,
            discipline: data.discipline,
            startDate: normalizeToISO(s.startDate)!,
            endDate: normalizeToISO(s.endDate)!,
            timeslotDate: normalizeToISO(s.timeslotDate || undefined) ?? undefined,
            salleIds: Array.isArray(s.salleIds) ? s.salleIds : [],
            classIds: Array.isArray(s.classIds) ? s.classIds : [],
            state: 'created',
          },
        }),
      ),
    );
    const mapped = created.map((t: any) => ({
      ...t,
      createdAt: toLocalLiteral(t.createdAt),
      updatedAt: toLocalLiteral(t.updatedAt),
    }));
    return NextResponse.json({ timeslots: mapped }, { status: 201 });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const presetId = Number(idStr);
  if (!Number.isFinite(presetId))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await ensurePresetOwner(presetId, userId)))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await (prisma as any).evenementPresetCreneau.deleteMany({ where: { presetId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
