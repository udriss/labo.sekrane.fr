// api/chemical-presets/route.ts (cleaned)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { commonChemicals } from '@/lib/data/commonChemicals';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
// CRUD ReactifPreset with pagination & sorting + validation + partial update

const reactifPresetSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1, 'Nom requis'),
  formula: z.string().optional().nullable(),
  casNumber: z
    .string()
    .trim()
    .regex(/^\d{2,7}-\d{2}-\d$/, 'Format CAS invalide')
    .optional()
    .nullable(),
  category: z.string().optional().nullable(),
  hazardClass: z.string().optional().nullable(),
  molarMass: z.number().positive().optional().nullable(),
  density: z.number().positive().optional().nullable(),
  boilingPointC: z.number().optional().nullable(),
  meltingPointC: z.number().optional().nullable(),
});

// Helper to map prisma unique constraint to HTTP 409
function handlePrismaError(e: any) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Preset déjà existant (nom + CAS)' }, { status: 409 });
    }
  }
  return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('q')?.toLowerCase();
  const name = req.nextUrl.searchParams.get('name')?.toLowerCase();
  const formula = req.nextUrl.searchParams.get('formula')?.toLowerCase();
  const cas = (
    req.nextUrl.searchParams.get('cas') || req.nextUrl.searchParams.get('casNumber')
  )?.toLowerCase();
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(100, parseInt(req.nextUrl.searchParams.get('pageSize') || '24', 10));
  const sortBy = req.nextUrl.searchParams.get('sortBy') || 'name';
  const sortDir = req.nextUrl.searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';
  // Support combined filters: when specific fields are provided, AND them; otherwise support generic q OR filter
  let where: any = {};
  const andConds: any[] = [];
  if (name) andConds.push({ name: { contains: name } });
  if (formula) andConds.push({ formula: { contains: formula } });
  if (cas) andConds.push({ casNumber: { contains: cas } });
  if (andConds.length) {
    where = { AND: andConds };
  } else if (search) {
    where = {
      OR: [
        { name: { contains: search } },
        { formula: { contains: search } },
        { casNumber: { contains: search } },
      ],
    };
  }
  const [total, presetsRaw] = await Promise.all([
    prisma.reactifPreset.count({ where }),
    prisma.reactifPreset.findMany({
      where,
      orderBy: { [sortBy]: sortDir as any },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  // Fallback enrichment: if density absent/null in returned objects but known in commonChemicals, inject it (non-destructive, not persisted)
  const densityLookupByName = new Map(
    commonChemicals
      .filter((c) => typeof c.density === 'number')
      .map((c) => [c.name.toLowerCase(), c.density as number]),
  );
  const densityLookupByCas = new Map(
    commonChemicals
      .filter((c) => c.casNumber && typeof c.density === 'number')
      .map((c) => [c.casNumber!.toLowerCase(), c.density as number]),
  );
  const presets = presetsRaw.map((p) => {
    if (p && (p as any).density == null) {
      const byCas = p.casNumber ? densityLookupByCas.get(p.casNumber.toLowerCase()) : undefined;
      const byName = densityLookupByName.get(p.name.toLowerCase());
      const value = byCas ?? byName;
      if (typeof value === 'number') {
        return { ...p, density: value } as typeof p;
      }
    }
    return p;
  });
  return NextResponse.json({ presets, page, pageSize, total });
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    // Normaliser champs vides -> null
    if (raw.casNumber === '') raw.casNumber = null;
    const data = reactifPresetSchema.omit({ id: true }).parse(raw);
    // Attempt to create, let Prisma enforce CAS uniqueness (unique index)
    const preset = await prisma.reactifPreset.create({ data });
    return NextResponse.json({ preset }, { status: 201 });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message || 'Validation échouée' },
        { status: 400 },
      );
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      // Determine if CAS is the cause
      return NextResponse.json(
        { error: 'CAS déjà existant: la valeur doit être unique' },
        { status: 409 },
      );
    }
    return handlePrismaError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const raw = await req.json();
    if (raw.casNumber === '') raw.casNumber = null;
    const parsed = reactifPresetSchema.parse(raw);
    const { id, ...data } = parsed;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    const preset = await prisma.reactifPreset.update({ where: { id }, data });
    return NextResponse.json({ preset });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message || 'Validation échouée' },
        { status: 400 },
      );
    }
    return handlePrismaError(e);
  }
}

// PATCH = mise à jour partielle / inline (champ unique ou subset)
export async function PATCH(req: NextRequest) {
  try {
    const raw = await req.json();
    const id = raw.id as number | undefined;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    // On autorise un sous-ensemble -> valider individuellement si présent
    const updatableKeys = [
      'name',
      'formula',
      'casNumber',
      'category',
      'hazardClass',
      'molarMass',
      'density',
      'boilingPointC',
      'meltingPointC',
    ] as const as string[]; // cast string[] pending regenerated Prisma client including density
    const data: any = {};
    for (const k of updatableKeys) {
      if (k in raw) data[k] = raw[k] === '' ? null : raw[k];
    }
    // Validation ciblée: reconstruire objet et passer par schema (rendre champs manquants optionnels)
    const partialSchema = reactifPresetSchema.partial().extend({ id: z.number() });
    partialSchema.parse({ id, ...data });
    if (data.casNumber === '') data.casNumber = null;
    const preset = await prisma.reactifPreset.update({ where: { id }, data });
    return NextResponse.json({ preset });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message || 'Validation échouée' },
        { status: 400 },
      );
    }
    return handlePrismaError(e);
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
  try {
    await prisma.reactifPreset.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
