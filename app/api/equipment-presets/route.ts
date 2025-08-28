import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Bridge endpoint conservé pour compatibilité rétro avec l'ancien nom "equipment".
// Il s'appuie désormais sur le modèle Prisma materielPreset.
const schema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, 'Nom requis'),
  category: z.string().optional().nullable(),
  discipline: z.string().min(1, 'Discipline requise'),
  description: z.string().optional().nullable(),
  defaultQty: z.number().int().positive().optional().nullable(),
});

function handle(e: any) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002')
      return NextResponse.json(
        { error: 'Preset déjà existant (nom + discipline)' },
        { status: 409 },
      );
  }
  if (e instanceof z.ZodError)
    return NextResponse.json({ error: e.issues[0]?.message || 'Validation' }, { status: 400 });
  return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get('q')?.trim();
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '24', 10)));
  const sortBy = sp.get('sortBy') || 'name';
  const sortDir = sp.get('sortDir') === 'desc' ? 'desc' : 'asc';
  const where = q
    ? {
        OR: [{ name: { contains: q } }, { category: { contains: q } }],
      }
    : {};
  const [total, presets] = await Promise.all([
    prisma.materielPreset.count({ where }),
    prisma.materielPreset.findMany({
      where,
      orderBy: { [sortBy]: sortDir as any },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return NextResponse.json({ presets, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const data = schema.omit({ id: true }).parse(raw);
    const preset = await prisma.materielPreset.create({ data });
    return NextResponse.json({ preset }, { status: 201 });
  } catch (e) {
    return handle(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = schema.parse(raw);
    const { id, ...data } = parsed;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    const preset = await prisma.materielPreset.update({ where: { id }, data });
    return NextResponse.json({ preset });
  } catch (e) {
    return handle(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const raw = await req.json();
    const id = raw.id as number | undefined;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    const partial = schema.partial().parse(raw); // validate shape
    const { id: _, ...data } = partial;
    const preset = await prisma.materielPreset.update({ where: { id }, data });
    return NextResponse.json({ preset });
  } catch (e) {
    return handle(e);
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
  try {
    await prisma.materielPreset.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handle(e);
  }
}
