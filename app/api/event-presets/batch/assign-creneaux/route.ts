import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';
import { z } from 'zod';

const schema = z.object({
  discipline: z.enum(['chimie', 'physique']),
  assignments: z
    .array(
      z.object({
        presetId: z.number().int(),
        slots: z.array(
          z.object({
            startDate: z.string(),
            endDate: z.string(),
            timeslotDate: z.string().optional(),
            salleIds: z.array(z.number().int()).optional().default([]),
            classIds: z.array(z.number().int()).optional().default([]),
          }),
        ),
      }),
    )
    .min(1),
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

async function ensureOwner(presetId: number, userId: number) {
  const p = await prisma.evenementPreset.findUnique({
    where: { id: presetId },
    select: { ownerId: true },
  });
  return !!p && p.ownerId === userId;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const data = schema.parse(body);
    // Validate ownership for all presetIds
    for (const a of data.assignments) {
      if (!(await ensureOwner(a.presetId, userId))) {
        return NextResponse.json({ error: `Not found: preset ${a.presetId}` }, { status: 404 });
      }
    }
    // Create all in a single transaction
    const ops = data.assignments.flatMap((a) =>
      a.slots.map((s) =>
        (prisma as any).evenementPresetCreneau.create({
          data: {
            presetId: a.presetId,
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
    const created = await prisma.$transaction(ops);
    return NextResponse.json({ count: created.length }, { status: 201 });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: 'Failed to assign' }, { status: 500 });
  }
}
